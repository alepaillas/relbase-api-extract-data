import type { Customer, CustomerResponse } from "./types/customer.ts";
import type { City, CityResponse } from "./types/city.ts";
import type { Commune, CommuneResponse } from "./types/commune.ts";
import type { Seller, SellersResponse } from "./types/seller.ts";
import type {
  PaymentType,
  PaymentTypesResponse,
} from "./types/payment_type.ts";
import type { User, UsersResponse } from "./types/user.ts";
import type {
  Dte,
  DteChild,
  DteDetail,
  DteDetailResponse,
  DteListResponse,
} from "./types/dte.ts";
import { base_url, headers } from "./utils/dotenv.ts";
import { generateDateRanges } from "./utils/generateDateRanges.ts";
import { fetchSellerNameFromPrint } from "./services/print.ts";
import { saveToExcel } from "./services/excel.ts";
import { fetchCommune } from "./services/commune.ts";
import { fetchCustomer } from "./services/customer.ts";
import { fetchDteDetails } from "./services/dteDetails.ts";
import { fetchAllPaymentTypes } from "./services/paymentTypes.ts";
import { fetchAllSellers } from "./services/sellers.ts";
import { fetchAllUsers } from "./services/users.ts";
import { fetchCity } from "./services/city.ts";
import { cache } from "./utils/cache.ts";

// Rate limiting constants
const MAX_REQUESTS_PER_SECOND = 7;
const REQUEST_INTERVAL = 1000 / MAX_REQUESTS_PER_SECOND;
let lastRequestTime = 0;

// Ensure minimum delay between requests
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_INTERVAL) {
    await new Promise(resolve =>
      setTimeout(resolve, REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
}

// Fetch a single page of DTEs with rate limiting
async function fetchPage(
  page: number,
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<Response> {
  await enforceRateLimit();

  try {
    const url = new URL(`${base_url}/dtes`);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("type_document", typeDocument);
    url.searchParams.append("range_date", `${startDate} / ${endDate}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: headers,
    });

    return response;
  } catch (error) {
    console.error(
      `Error fetching data for page ${page} (${startDate} to ${endDate}):`,
      error
    );
    throw error;
  }
}

async function fetchAllPages(
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<Dte[]> {
  let allData: Dte[] = [];
  let currentPage = 1;
  let totalPages = 1;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;

  try {
    // First fetch to get total pages
    let firstResponse: Response;
    try {
      firstResponse = await fetchPageWithRetry(
        currentPage,
        typeDocument,
        startDate,
        endDate
      );

      if (!firstResponse.ok) {
        throw new Error(`HTTP error! status: ${firstResponse.status}`);
      }

      const firstData: DteListResponse = await firstResponse.json();
      allData = allData.concat(firstData.data.dtes);
      totalPages = firstData.meta.total_pages;
      consecutiveErrors = 0;
    } catch (error) {
      console.error(
        `Error fetching first page (${startDate} to ${endDate}):`,
        error
      );
      return [];
    }

    // If there are more pages, fetch them
    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page++) {
        try {
          const response = await fetchPageWithRetry(
            page,
            typeDocument,
            startDate,
            endDate
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const pageData: DteListResponse = await response.json();
          allData = allData.concat(pageData.data.dtes);
          consecutiveErrors = 0;
        } catch (error) {
          console.error(
            `Error fetching page ${page} (${startDate} to ${endDate}):`,
            error
          );
          consecutiveErrors++;

          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.error(
              `Too many consecutive errors (${maxConsecutiveErrors}). Stopping.`
            );
            break;
          }
        }
      }
    }

    return allData;
  } catch (error) {
    console.error(
      `Error fetching all pages (${startDate} to ${endDate}):`,
      error
    );
    return [];
  }
}

// Helper function with retry logic and rate limiting
async function fetchPageWithRetry(
  page: number,
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<Response> {
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchPage(page, typeDocument, startDate, endDate);

      if (response.status === 403) {
        // For rate limit errors, wait and retry
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `Rate limited on attempt ${attempt}. Waiting ${delay}ms before retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed for page ${page}:`, error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`All ${maxRetries} attempts failed for page ${page}`);
  throw lastError instanceof Error ? lastError : new Error("Unknown error");
}

// Define a type for the extended DTE with all possible relations
type ExtendedDte = Dte & {
  details?: DteDetail;
  customer?: Customer;
  city?: City;
  commune?: Commune;
  seller?: Seller;
  payment_type?: PaymentType;
  user?: User;
};

async function fetchAllDtesWithDetails(
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<ExtendedDte[]> {
  try {
    // Pre-fetch all reference data with rate limiting
    await Promise.all([
      fetchAllSellers(),
      fetchAllPaymentTypes(),
      fetchAllUsers(),
    ]);

    const dtes = await fetchAllPages(typeDocument, startDate, endDate);

    // Fetch details for each DTE with rate limiting
    const dtesWithDetails: Array<ExtendedDte | undefined> = await Promise.all(
      dtes.map(async (dte) => {
        try {
          await enforceRateLimit();

          // Fetch DTE details
          const details = await fetchDteDetails(dte.id);

          // Helper function to safely fetch related data
          const fetchRelatedData = async <T>(
            id: number | null,
            fetchFn: (id: number) => Promise<T | undefined>
          ): Promise<T | undefined> => {
            if (id === null || id === undefined) {
              return undefined;
            }
            await enforceRateLimit();
            return fetchFn(id);
          };

          // Fetch related data in parallel with proper null checks
          const [customer, city, commune] = await Promise.all([
            fetchRelatedData(dte.customer_id, fetchCustomer),
            fetchRelatedData(dte.city_id, fetchCity),
            fetchRelatedData(dte.commune_id, fetchCommune),
          ]);

          return {
            ...dte,
            details,
            customer,
            city,
            commune,
            seller: dte.seller_id ? cache.sellers.get(dte.seller_id) : undefined,
            payment_type: dte.type_payment_id ? cache.paymentTypes.get(dte.type_payment_id) : undefined,
            user: dte.user_id ? cache.users.get(dte.user_id) : undefined,
          };
        } catch (error) {
          console.error(
            `Error fetching details for DTE ${dte.id} (${startDate} to ${endDate}):`,
            error
          );
          return {
            ...dte,
            details: undefined,
            customer: undefined,
            city: undefined,
            commune: undefined,
            seller: undefined,
            payment_type: undefined,
            user: undefined,
          };
        }
      })
    );

    return dtesWithDetails.filter((dte): dte is ExtendedDte => dte !== undefined);
  } catch (error) {
    console.error(
      `Error fetching all DTEs with details (${startDate} to ${endDate}):`,
      error
    );
    return [];
  }
}

async function processAllDateRanges() {
  const dateRanges = generateDateRanges();
  const typeDocument = "33";

  for (const range of dateRanges) {
    try {
      console.log(
        `Processing date range: ${range.startDate} to ${range.endDate}`
      );

      const data = await fetchAllDtesWithDetails(
        typeDocument,
        range.startDate,
        range.endDate
      );

      if (data.length > 0) {
        const fileName = `./data/dtes_type${typeDocument}_${range.year}_${String(range.month).padStart(2, "0")}.xlsx`;
        saveToExcel(data, fileName);
        console.log(`Saved ${data.length} records to ${fileName}`);
      } else {
        console.log(
          `No data found for range ${range.startDate} to ${range.endDate}`
        );
      }

      // Add delay between date ranges
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(
        `Error processing date range ${range.startDate} to ${range.endDate}:`,
        error
      );
    }
  }
}

processAllDateRanges().catch((error) => {
  console.error("Error in processAllDateRanges:", error);
});
