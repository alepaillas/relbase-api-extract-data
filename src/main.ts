
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
import { generateDateRanges } from "./utils/generateDateRanges.ts"
import { fetchSellerNameFromPrint } from "./services/print.ts";
import { saveToExcel } from "./services/excel.ts";
import { fetchCommune } from "./services/commune.ts"
import { fetchCustomer } from "./services/customer.ts"
import { fetchDteDetails } from "./services/dteDetails.ts"
import { fetchAllPaymentTypes } from "./services/paymentTypes.ts"
import { fetchAllSellers } from "./services/sellers.ts"
import { fetchAllUsers } from "./services/users.ts"
import { fetchCity } from "./services/city.ts"
import { cache } from "./utils/cache.ts";

// Fetch a single page of DTEs
async function fetchPage(
  page: number,
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<DteListResponse> {
  try {
    const url = new URL(`${base_url}/dtes`);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("type_document", typeDocument);
    url.searchParams.append("range_date", `${startDate} / ${endDate}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
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
  endDate: string,
  delayBetweenPages: number = 1000 // Default delay of 1 second between pages
): Promise<Dte[]> {
  let allData: Dte[] = [];
  let currentPage = 1;
  let totalPages = 1;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3; // Stop after 3 consecutive errors

  try {
    // First fetch to get total pages
    let firstResponse;
    try {
      firstResponse = await fetchPageWithRetry(
        currentPage,
        typeDocument,
        startDate,
        endDate,
        0 // No delay for first request
      );
      allData = allData.concat(firstResponse.data.dtes);
      totalPages = firstResponse.meta.total_pages;
      consecutiveErrors = 0; // Reset error counter on success
    } catch (error) {
      console.error(
        `Error fetching first page (${startDate} to ${endDate}):`,
        error
      );
      return []; // Return empty array if first page fails
    }

    // If there are more pages, fetch them with delays
    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page++) {
        try {
          // Add delay before each request
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenPages)
          );

          const response = await fetchPageWithRetry(
            page,
            typeDocument,
            startDate,
            endDate,
            delayBetweenPages
          );

          allData = allData.concat(response.data.dtes);
          consecutiveErrors = 0; // Reset error counter on success
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

          // Increase delay after errors
          delayBetweenPages = Math.min(delayBetweenPages * 2, 10000); // Max 10 seconds delay
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

// Helper function with retry logic
async function fetchPageWithRetry(
  page: number,
  typeDocument: string,
  startDate: string,
  endDate: string,
  delayBeforeRequest: number = 0
): Promise<DteListResponse> {
  // Add delay before making the request
  if (delayBeforeRequest > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayBeforeRequest));
  }

  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `${base_url}/dtes?page=${page}&type_document=${typeDocument}&range_date=${startDate} / ${endDate}`,
        {
          method: "GET",
          headers: headers,
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          // For 403 errors, wait longer before retrying
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(
            `403 Forbidden on attempt ${attempt}. Waiting ${delay}ms before retry...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed for page ${page}:`, error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`All ${maxRetries} attempts failed for page ${page}`);
  throw lastError instanceof Error ? lastError : new Error("Unknown error");
}

// Update the fetchAllDtesWithDetails function to use the improved fetchAllPages
async function fetchAllDtesWithDetails(
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<
  Array<
    Dte & {
      details?: DteDetail;
      customer?: Customer;
      city?: City;
      commune?: Commune;
      seller?: Seller;
      payment_type?: PaymentType;
      user?: User;
    }
  >
> {
  try {
    // Pre-fetch all reference data
    await Promise.all([
      fetchAllSellers(),
      fetchAllPaymentTypes(),
      fetchAllUsers(),
    ]);

    // Start with a conservative delay
    let delayBetweenPages = 1000;

    const dtes = await fetchAllPages(
      typeDocument,
      startDate,
      endDate,
      delayBetweenPages
    );

    // Fetch details for each DTE with a delay to avoid rate limiting
    const dtesWithDetails = await Promise.all(
      dtes.map(async (dte, index) => {
        try {
          // Add a small delay between requests to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, index * 1000));

          // Fetch DTE details
          const details = await fetchDteDetails(dte.id);

          // Fetch related data in parallel
          const [customer, city, commune, seller, paymentType, user] =
            await Promise.all([
              dte.customer_id
                ? fetchCustomer(dte.customer_id)
                : Promise.resolve(undefined),
              dte.city_id ? fetchCity(dte.city_id) : Promise.resolve(undefined),
              dte.commune_id
                ? fetchCommune(dte.commune_id)
                : Promise.resolve(undefined),
              dte.seller_id
                ? Promise.resolve(cache.sellers.get(dte.seller_id))
                : Promise.resolve(undefined),
              dte.type_payment_id
                ? Promise.resolve(cache.paymentTypes.get(dte.type_payment_id))
                : Promise.resolve(undefined),
              dte.user_id
                ? Promise.resolve(cache.users.get(dte.user_id))
                : Promise.resolve(undefined),
            ]);

          return {
            ...dte,
            details,
            customer,
            city,
            commune,
            seller,
            payment_type: paymentType,
            user,
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

    return dtesWithDetails.filter((dte) => dte !== undefined) as Array<
      Dte & {
        details?: DteDetail;
        customer?: Customer;
        city?: City;
        commune?: Commune;
        seller?: Seller;
        payment_type?: PaymentType;
        user?: User;
      }
    >;
  } catch (error) {
    console.error(
      `Error fetching all DTEs with details (${startDate} to ${endDate}):`,
      error
    );
    return [];
  }
}


// Main function to process all date ranges
async function processAllDateRanges() {
  const dateRanges = generateDateRanges();
  const typeDocument = "33"; // Document type 33 (Factura Electrónica)

  // Process each date range
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
        const fileName = `./data/dtes_type${typeDocument}_${range.year
          }_${String(range.month).padStart(2, "0")}.xlsx`;
        saveToExcel(data, fileName);
        console.log(`Saved ${data.length} records to ${fileName}`);
      } else {
        console.log(
          `No data found for range ${range.startDate} to ${range.endDate}`
        );
      }

      // Add delay between date ranges to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(
        `Error processing date range ${range.startDate} to ${range.endDate}:`,
        error
      );
    }
  }
}

// Start processing all date ranges
processAllDateRanges().catch((error) => {
  console.error("Error in processAllDateRanges:", error);
});

