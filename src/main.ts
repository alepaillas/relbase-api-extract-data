import type { Customer, CustomerResponse } from "./types/customer.ts";
import type { City, CityResponse } from "./types/city.ts";
import type { Commune, CommuneResponse } from "./types/commune.ts";
import type { Seller, SellersResponse } from "./types/seller.ts";
import type { PaymentType, PaymentTypesResponse } from "./types/payment_type.ts";
import type { User, UsersResponse } from "./types/user.ts";
import type { Dte, DteChild, DteDetail, DteDetailResponse, DteListResponse } from "./types/dte.ts";
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
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff delays

// Track request timings for debugging
const requestTimings: number[] = [];


// Ensure minimum delay between requests
async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  // Adjust interval based on recent error rate
  const dynamicInterval = consecutiveErrors > 3
    ? REQUEST_INTERVAL * 2
    : REQUEST_INTERVAL;

  if (timeSinceLastRequest < dynamicInterval) {
    const delay = dynamicInterval - timeSinceLastRequest;
    console.log(`[${new Date().toISOString()}] Rate limiting: Waiting ${delay.toFixed(2)}ms before next request...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
  requestStats.total++;
}

// Enhanced request statistics tracking
interface RequestStats {
  total: number;
  successes: number;
  rateLimited: number;
  otherErrors: number;  // Changed from 'errors' to 'otherErrors'
  retries: number;
  successfulRetries: number;
  failedAfterRetries: number;
  dataLoss: number;
}

const requestStats: RequestStats = {
  total: 0,
  successes: 0,
  rateLimited: 0,
  otherErrors: 0,  // Changed from 'errors' to 'otherErrors'
  retries: 0,
  successfulRetries: 0,
  failedAfterRetries: 0,
  dataLoss: 0
};

// Enhanced error handling wrapper with better logging
async function safeFetch<T>(
  id: number | null | undefined,
  fetchFn: (id: number) => Promise<T | undefined>,
  type: string,
  idName: string,
  idValue: number | string,
  isCritical: boolean = false
): Promise<T | undefined> {
  if (id === null || id === undefined) {
    console.log(`[${new Date().toISOString()}] No ${type} ID found for ${idName} (ID: ${idValue})`);
    return undefined;
  }

  let attempt = 0;
  const maxAttempts = 3;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt++;
    requestStats.total++;

    try {
      await enforceRateLimit();
      console.log(`[${new Date().toISOString()}] Attempt ${attempt} to fetch ${type} ${idName} ${idValue}`);

      const startTime = Date.now();
      const result = await fetchFn(id);
      const duration = Date.now() - startTime;

      requestStats.successes++;
      if (attempt > 1) requestStats.successfulRetries++;

      console.log(`[${new Date().toISOString()}] SUCCESS: Fetched ${type} ${idName} ${idValue} in ${duration}ms (attempt ${attempt})`);
      return result;
    } catch (error: any) {
      lastError = error;

      if (error.message.includes('403')) {
        requestStats.rateLimited++;
        console.warn(`[${new Date().toISOString()}] RATE LIMITED (403): ${type} ${idName} ${idValue} (attempt ${attempt})`);

        if (attempt < maxAttempts) {
          requestStats.retries++;
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[${new Date().toISOString()}] Will retry in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          requestStats.failedAfterRetries++;
          console.error(`[${new Date().toISOString()}] FAILED AFTER RETRIES: ${type} ${idName} ${idValue}`);
          if (isCritical) requestStats.dataLoss++;
          return undefined;
        }
      } else {
        requestStats.otherErrors++;
        console.error(`[${new Date().toISOString()}] ERROR: ${type} ${idName} ${idValue}:`, error.message);
        return undefined;
      }
    }
  }

  console.error(`[${new Date().toISOString()}] MAX ATTEMPTS REACHED: Failed to fetch ${type} ${idName} ${idValue} after ${maxAttempts} attempts`);
  if (isCritical) requestStats.dataLoss++;
  return undefined;
}

// Fetch a single page of DTEs with rate limiting
async function fetchPage(
  page: number,
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<Response> {
  console.log(`[${new Date().toISOString()}] Preparing to fetch page ${page} for date range ${startDate} to ${endDate}`);
  await enforceRateLimit();

  try {
    const url = new URL(`${base_url}/dtes`);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("type_document", typeDocument);
    url.searchParams.append("range_date", `${startDate} / ${endDate}`);

    console.log(`[${new Date().toISOString()}] Fetching page ${page}: ${url.toString()}`);
    const startTime = Date.now();
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: headers,
    });
    const duration = Date.now() - startTime;

    if (response.status === 403) {
      requestStats.rateLimited++;
      console.warn(`[${new Date().toISOString()}] Rate limited (403) when fetching page ${page} - will retry`);
      throw new Error(`Rate limited (403) when fetching page ${page}`);
    }

    console.log(`[${new Date().toISOString()}] Successfully fetched page ${page} in ${duration}ms - Status: ${response.status}`);
    requestStats.successes++;
    return response;
  } catch (error: any) {
    requestStats.otherErrors++;
    console.error(`[${new Date().toISOString()}] Error fetching page ${page}:`, error.message);
    throw error;
  }
}

async function fetchAllPages(
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<Dte[]> {
  console.log(`[${new Date().toISOString()}] Starting to fetch all pages for date range ${startDate} to ${endDate}`);
  let allData: Dte[] = [];
  let currentPage = 1;
  let totalPages = 1;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;

  try {
    // First fetch to get total pages
    let firstResponse: Response;
    try {
      console.log(`[${new Date().toISOString()}] Fetching first page to determine total pages...`);
      firstResponse = await fetchPageWithRetry(currentPage, typeDocument, startDate, endDate);

      if (!firstResponse.ok) {
        throw new Error(`HTTP error! status: ${firstResponse.status}`);
      }

      const firstData: DteListResponse = await firstResponse.json();
      const dteCount = firstData.data.dtes.length;
      allData = allData.concat(firstData.data.dtes);
      totalPages = firstData.meta.total_pages;
      consecutiveErrors = 0;

      console.log(`[${new Date().toISOString()}] First page fetched successfully. Found ${dteCount} DTEs. Total pages: ${totalPages}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching first page (${startDate} to ${endDate}):`, error);
      return [];
    }

    // If there are more pages, fetch them
    if (totalPages > 1) {
      console.log(`[${new Date().toISOString()}] Starting to fetch remaining ${totalPages - 1} pages...`);
      for (let page = 2; page <= totalPages; page++) {
        try {
          const startTime = Date.now();
          const response = await fetchPageWithRetry(page, typeDocument, startDate, endDate);
          const duration = Date.now() - startTime;

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const pageData: DteListResponse = await response.json();
          const dteCount = pageData.data.dtes.length;
          allData = allData.concat(pageData.data.dtes);
          consecutiveErrors = 0;

          console.log(`[${new Date().toISOString()}] Page ${page}/${totalPages} fetched in ${duration}ms with ${dteCount} DTEs. Total DTEs so far: ${allData.length}`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error fetching page ${page} (${startDate} to ${endDate}):`, error);
          consecutiveErrors++;

          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.error(`[${new Date().toISOString()}] Too many consecutive errors (${maxConsecutiveErrors}). Stopping.`);
            break;
          }
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Completed fetching all pages. Total DTEs found: ${allData.length}`);
    return allData;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching all pages (${startDate} to ${endDate}):`, error);
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
      console.log(`[${new Date().toISOString()}] Attempt ${attempt} for page ${page}`);
      const response = await fetchPage(page, typeDocument, startDate, endDate);

      if (response.status === 403) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[${new Date().toISOString()}] 403 Forbidden on attempt ${attempt} for page ${page}. Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      console.error(`[${new Date().toISOString()}] Attempt ${attempt} failed for page ${page}:`, error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[${new Date().toISOString()}] Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[${new Date().toISOString()}] All ${maxRetries} attempts failed for page ${page}`);
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

// Type guard to check if a value is ExtendedDte
function isExtendedDte(value: any): value is ExtendedDte {
  return value !== undefined && value !== null && typeof value === 'object' && 'id' in value;
}

// Helper function to safely filter out undefined values
function filterUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

// Enhanced DTE processing with better error tracking
async function fetchAllDtesWithDetails(
  typeDocument: string,
  startDate: string,
  endDate: string
): Promise<ExtendedDte[]> {
  console.log(`[${new Date().toISOString()}] Starting fetchAllDtesWithDetails for date range ${startDate} to ${endDate}`);

  // Reset stats for this run
  Object.keys(requestStats).forEach(key => {
    requestStats[key as keyof RequestStats] = 0;
  });

  try {
    // Pre-fetch all reference data with rate limiting
    console.log(`[${new Date().toISOString()}] Pre-fetching reference data...`);
    const startTime = Date.now();
    await Promise.all([
      safeFetch(null, fetchAllSellers, 'sellers', 'reference data', 'all', false),
      safeFetch(null, fetchAllPaymentTypes, 'payment types', 'reference data', 'all', false),
      safeFetch(null, fetchAllUsers, 'users', 'reference data', 'all', false)
    ]);
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Reference data pre-fetched in ${duration}ms`);

    const dtes = await fetchAllPages(typeDocument, startDate, endDate);
    console.log(`[${new Date().toISOString()}] Found ${dtes.length} DTEs to process`);

    // Process DTEs in batches
    const BATCH_SIZE = 20;
    const dtesWithDetails: ExtendedDte[] = [];

    for (let i = 0; i < dtes.length; i += BATCH_SIZE) {
      const batch = dtes.slice(i, i + BATCH_SIZE);
      console.log(`[${new Date().toISOString()}] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(dtes.length / BATCH_SIZE)} (DTEs ${i + 1}-${i + batch.length})`);

      const batchResults = await Promise.all(
        batch.map(async (dte) => {
          try {
            console.log(`[${new Date().toISOString()}] Processing DTE ${dte.id} (${i + batch.indexOf(dte) + 1}/${dtes.length})`);

            // Create a base extended DTE object with all optional fields
            const extendedDte: ExtendedDte = {
              ...dte,
              details: undefined,
              customer: undefined,
              city: undefined,
              commune: undefined,
              seller: undefined,
              payment_type: undefined,
              user: undefined
            };

            // Fetch DTE details (critical data)
            extendedDte.details = await safeFetch(
              dte.id,
              fetchDteDetails,
              'DTE details',
              'DTE',
              dte.id,
              true
            );

            // Fetch related data in parallel
            const [customer, city, commune] = await Promise.all([
              safeFetch(dte.customer_id, fetchCustomer, 'customer', 'customer', dte.customer_id || 'unknown', false),
              safeFetch(dte.city_id, fetchCity, 'city', 'city', dte.city_id || 'unknown', false),
              safeFetch(dte.commune_id, fetchCommune, 'commune', 'commune', dte.commune_id || 'unknown', false)
            ]);

            // Assign fetched data to the extended DTE
            extendedDte.customer = customer;
            extendedDte.city = city;
            extendedDte.commune = commune;

            // Get cached data (non-critical)
            extendedDte.seller = dte.seller_id ? cache.sellers.get(dte.seller_id) : undefined;
            extendedDte.payment_type = dte.type_payment_id ? cache.paymentTypes.get(dte.type_payment_id) : undefined;
            extendedDte.user = dte.user_id ? cache.users.get(dte.user_id) : undefined;

            return extendedDte;
          } catch (error) {
            console.error(`[${new Date().toISOString()}] ERROR PROCESSING DTE ${dte.id}:`, error);
            requestStats.dataLoss++;
            return undefined;
          }
        })
      );

      // Filter out undefined results and add to final array
      const validBatch = batchResults.filter(isExtendedDte);
      dtesWithDetails.push(...validBatch);
      console.log(`[${new Date().toISOString()}] Completed batch ${Math.floor(i / BATCH_SIZE) + 1} - ${validBatch.length} successful, ${batch.length - validBatch.length} failed`);
    }

    // Print summary statistics
    console.log(`\n[${new Date().toISOString()}] REQUEST STATISTICS SUMMARY:`);
    console.log(`- Total requests: ${requestStats.total}`);
    console.log(`- Successful requests: ${requestStats.successes} (${(requestStats.successes / requestStats.total * 100).toFixed(1)}%)`);
    console.log(`- Rate limited (403): ${requestStats.rateLimited} (${(requestStats.rateLimited / requestStats.total * 100).toFixed(1)}%)`);
    console.log(`- Other errors: ${requestStats.otherErrors} (${(requestStats.otherErrors / requestStats.total * 100).toFixed(1)}%)`);
    console.log(`- Retries attempted: ${requestStats.retries}`);
    console.log(`- Successful retries: ${requestStats.successfulRetries}`);
    console.log(`- Failed after retries: ${requestStats.failedAfterRetries}`);
    console.log(`- Potential data loss: ${requestStats.dataLoss}`);

    console.log(`\n[${new Date().toISOString()}] Completed processing all DTEs. ${dtesWithDetails.length} DTEs processed successfully.`);
    return dtesWithDetails;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] FATAL ERROR in fetchAllDtesWithDetails (${startDate} to ${endDate}):`, error);
    return [];
  }
}

async function processAllDateRanges() {
  const dateRanges = generateDateRanges();
  const typeDocument = "33";
  console.log(`[${new Date().toISOString()}] Starting to process ${dateRanges.length} date ranges`);

  for (const [index, range] of dateRanges.entries()) {
    try {
      console.log(`[${new Date().toISOString()}] [${index + 1}/${dateRanges.length}] Processing date range: ${range.startDate} to ${range.endDate}`);

      const startTime = Date.now();
      const data = await fetchAllDtesWithDetails(
        typeDocument,
        range.startDate,
        range.endDate
      );
      const duration = Date.now() - startTime;

      if (data.length > 0) {
        const fileName = `./data/dtes_type${typeDocument}_${range.year}_${String(range.month).padStart(2, "0")}.xlsx`;
        console.log(`[${new Date().toISOString()}] Saving ${data.length} records to ${fileName}`);
        saveToExcel(data, fileName);
        console.log(`[${new Date().toISOString()}] Successfully saved data to ${fileName} in ${duration}ms`);
      } else {
        console.log(`[${new Date().toISOString()}] No data found for range ${range.startDate} to ${range.endDate}`);
      }

      // Add delay between date ranges
      if (index < dateRanges.length - 1) {
        console.log(`[${new Date().toISOString()}] Waiting 2 seconds before next date range...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing date range ${range.startDate} to ${range.endDate}:`, error);
    }
  }

  console.log(`[${new Date().toISOString()}] Completed processing all date ranges`);
}

console.log(`[${new Date().toISOString()}] Starting DTE extraction process...`);
processAllDateRanges().catch((error) => {
  console.error(`[${new Date().toISOString()}] Fatal error in processAllDateRanges:`, error);
});
