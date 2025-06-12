// Add to your main.ts
import { fetchAllEstimates } from "./services/estimates.ts";
import { fetchEstimateDetails } from "./services/estimates.ts";
import type { City } from "./types/city.ts";
import type { Commune } from "./types/commune.ts";
import type { Customer } from "./types/customer.ts";
import type { Estimate, EstimatesResponse } from "./types/estimate.ts";
import type { PaymentType } from "./types/payment_type.ts";
import type { Seller } from "./types/seller.ts";
import type { User } from "./types/user.ts";
import { base_url, headers } from "./utils/dotenv.ts";
import { generateDateRanges } from "./utils/generateDateRanges.ts";
import { fetchAllCommunes, fetchCommune } from "./services/commune.ts";
import { fetchAllCustomers, fetchCustomer } from "./services/customer.ts";
import { fetchDteDetails } from "./services/dteDetails.ts";
import { fetchAllPaymentTypes } from "./services/paymentTypes.ts";
import { fetchAllSellers } from "./services/sellers.ts";
import { fetchAllUsers } from "./services/users.ts";
import { fetchAllCities, fetchCity } from "./services/city.ts";
import { cache } from "./utils/cache.ts";
import * as XLSX from "xlsx";
import * as fs from "fs";

// Ensure the data directory exists
function ensureDataDirectory() {
    const dir = './data/estimates';
    if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    }
}

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

// Define a type for the extended Estimate with all possible relations
type ExtendedEstimate = Estimate & {
    customer?: Customer;
    city?: City;
    commune?: Commune;
    seller?: Seller;
    payment_type?: PaymentType;
    user?: User;
};

// Enhanced error handling wrapper with corrected 403 detection and retry logic
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

    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
            console.error(`Error fetching ${type} ${id}:`, error);

            // Check for 403 status in multiple ways
            const is403Error = error.message?.includes('403') ||
                error.message?.includes('status: 403') ||
                error.status === 403 ||
                error.response?.status === 403;

            if (is403Error) {
                requestStats.rateLimited++;
                console.warn(`[${new Date().toISOString()}] RATE LIMITED (403): ${type} ${idName} ${idValue} (attempt ${attempt})`);
            } else {
                requestStats.otherErrors++;
                console.error(`[${new Date().toISOString()}] OTHER ERROR: ${type} ${idName} ${idValue} (attempt ${attempt}):`, error.message);
            }

            // Retry logic for both 403 and other errors (if not last attempt)
            if (attempt < maxAttempts) {
                requestStats.retries++;
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`[${new Date().toISOString()}] Will retry in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; // Continue to next iteration
            } else {
                // Final attempt failed
                requestStats.failedAfterRetries++;
                console.error(`[${new Date().toISOString()}] FAILED AFTER ${maxAttempts} RETRIES: ${type} ${idName} ${idValue}`);
                if (isCritical) requestStats.dataLoss++;
                return undefined;
            }
        }
    }

    // This should never be reached due to the loop structure above, but just in case
    console.error(`[${new Date().toISOString()}] UNEXPECTED: Reached end of safeFetch without returning`);
    if (isCritical) requestStats.dataLoss++;
    return undefined;
}


// Function to fetch a single page of estimates
async function fetchEstimatePage(
    page: number,
    startDate: string,
    endDate: string
): Promise<Response> {
    console.log(`[${new Date().toISOString()}] Preparing to fetch estimate page ${page} for date range ${startDate} to ${endDate}`);
    await enforceRateLimit();

    try {
        const url = new URL(`${base_url}/cotizaciones`);
        url.searchParams.append("page", page.toString());
        url.searchParams.append("range_date", `${startDate} / ${endDate}`);

        console.log(`[${new Date().toISOString()}] Fetching estimate page ${page}: ${url.toString()}`);
        const startTime = Date.now();
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: headers,
        });
        const duration = Date.now() - startTime;

        if (response.status === 403) {
            requestStats.rateLimited++;
            console.warn(`[${new Date().toISOString()}] Rate limited (403) when fetching estimate page ${page} - will retry`);
            throw new Error(`Rate limited (403) when fetching estimate page ${page}`);
        }

        console.log(`[${new Date().toISOString()}] Successfully fetched estimate page ${page} in ${duration}ms - Status: ${response.status}`);
        requestStats.successes++;
        return response;
    } catch (error: any) {
        requestStats.otherErrors++;
        console.error(`[${new Date().toISOString()}] Error fetching estimate page ${page}:`, error.message);
        throw error;
    }
}

// Function to fetch all estimate pages
async function fetchAllEstimatePages(
    startDate: string,
    endDate: string
): Promise<Estimate[]> {
    console.log(`[${new Date().toISOString()}] Starting to fetch all estimate pages for date range ${startDate} to ${endDate}`);
    let allData: Estimate[] = [];
    let currentPage = 1;
    let totalPages = 1;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    try {
        // First fetch to get total pages
        let firstResponse: Response;
        try {
            console.log(`[${new Date().toISOString()}] Fetching first estimate page to determine total pages...`);
            firstResponse = await fetchEstimatePageWithRetry(currentPage, startDate, endDate);

            if (!firstResponse.ok) {
                throw new Error(`HTTP error! status: ${firstResponse.status}`);
            }

            const firstData: EstimatesResponse = await firstResponse.json();
            const estimateCount = firstData.data.estimates.length;
            allData = allData.concat(firstData.data.estimates);
            totalPages = firstData.meta.total_pages;
            consecutiveErrors = 0;

            console.log(`[${new Date().toISOString()}] First estimate page fetched successfully. Found ${estimateCount} estimates. Total pages: ${totalPages}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error fetching first estimate page (${startDate} to ${endDate}):`, error);
            return [];
        }

        // If there are more pages, fetch them
        if (totalPages > 1) {
            console.log(`[${new Date().toISOString()}] Starting to fetch remaining ${totalPages - 1} estimate pages...`);
            for (let page = 2; page <= totalPages; page++) {
                try {
                    const startTime = Date.now();
                    const response = await fetchEstimatePageWithRetry(page, startDate, endDate);
                    const duration = Date.now() - startTime;

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const pageData: EstimatesResponse = await response.json();
                    const estimateCount = pageData.data.estimates.length;
                    allData = allData.concat(pageData.data.estimates);
                    consecutiveErrors = 0;

                    console.log(`[${new Date().toISOString()}] Estimate page ${page}/${totalPages} fetched in ${duration}ms with ${estimateCount} estimates. Total estimates so far: ${allData.length}`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Error fetching estimate page ${page} (${startDate} to ${endDate}):`, error);
                    consecutiveErrors++;

                    if (consecutiveErrors >= maxConsecutiveErrors) {
                        console.error(`[${new Date().toISOString()}] Too many consecutive errors (${maxConsecutiveErrors}). Stopping.`);
                        break;
                    }
                }
            }
        }

        console.log(`[${new Date().toISOString()}] Completed fetching all estimate pages. Total estimates found: ${allData.length}`);
        return allData;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching all estimate pages (${startDate} to ${endDate}):`, error);
        return [];
    }
}

// Helper function with retry logic for estimates
async function fetchEstimatePageWithRetry(
    page: number,
    startDate: string,
    endDate: string
): Promise<Response> {
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[${new Date().toISOString()}] Attempt ${attempt} for estimate page ${page}`);
            const response = await fetchEstimatePage(page, startDate, endDate);

            if (response.status === 403) {
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`[${new Date().toISOString()}] 403 Forbidden on attempt ${attempt} for estimate page ${page}. Waiting ${delay}ms before retry...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
        } catch (error) {
            lastError = error;
            console.error(`[${new Date().toISOString()}] Attempt ${attempt} failed for estimate page ${page}:`, error);

            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`[${new Date().toISOString()}] Waiting ${delay}ms before retry...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    console.error(`[${new Date().toISOString()}] All ${maxRetries} attempts failed for estimate page ${page}`);
    throw lastError instanceof Error ? lastError : new Error("Unknown error");
}

// Function to fetch all estimates with details
async function fetchAllEstimatesWithDetails(
    startDate: string,
    endDate: string
): Promise<ExtendedEstimate[]> {
    console.log(`[${new Date().toISOString()}] Starting fetchAllEstimatesWithDetails for date range ${startDate} to ${endDate}`);

    // Reset stats for this run
    Object.keys(requestStats).forEach(key => {
        requestStats[key as keyof RequestStats] = 0;
    });

    try {
        // Pre-fetch all reference data with rate limiting
        console.log(`[${new Date().toISOString()}] Pre-fetching reference data...`);
        const startTime = Date.now();
        await Promise.all([
            // safeFetch(null, fetchAllSellers, 'sellers', 'reference data', 'all', false),
            (async () => {
                try {
                    console.log(`[${new Date().toISOString()}] Fetching all sellers...`);
                    await fetchAllSellers();
                    console.log(`[${new Date().toISOString()}] Successfully loaded ${cache.sellers.size} sellers`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Failed to load sellers:`, error);
                }
            })(),
            // safeFetch(null, fetchAllPaymentTypes, 'payment types', 'reference data', 'all', false),
            (async () => {
                try {
                    console.log(`[${new Date().toISOString()}] Fetching all paymentTypes...`);
                    await fetchAllPaymentTypes();
                    console.log(`[${new Date().toISOString()}] Successfully loaded ${cache.paymentTypes.size} paymentTypes`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Failed to load paymentTypes:`, error);
                }
            })(),
            // safeFetch(null, fetchAllUsers, 'users', 'reference data', 'all', false),
            (async () => {
                try {
                    console.log(`[${new Date().toISOString()}] Fetching all users...`);
                    await fetchAllUsers();
                    console.log(`[${new Date().toISOString()}] Successfully loaded ${cache.users.size} users`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Failed to load users:`, error);
                }
            })(),
            // safeFetch(null, fetchAllCustomers, 'customers', 'reference data', 'all', false),
            (async () => {
                try {
                    console.log(`[${new Date().toISOString()}] Fetching all customers...`);
                    await fetchAllCustomers();
                    console.log(`[${new Date().toISOString()}] Successfully loaded ${cache.customers.size} customers`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Failed to load customers:`, error);
                }
            })(),
            // safeFetch(null, fetchAllCities, 'cities', 'reference data', 'all', false),
            (async () => {
                try {
                    console.log(`[${new Date().toISOString()}] Fetching all cities...`);
                    await fetchAllCities();
                    console.log(`[${new Date().toISOString()}] Successfully loaded ${cache.cities.size} cities`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Failed to load cities:`, error);
                }
            })(),
            // safeFetch(null, fetchAllCommunes, 'communes', 'reference data', 'all', false),
            (async () => {
                try {
                    console.log(`[${new Date().toISOString()}] Fetching all communes...`);
                    await fetchAllCommunes();
                    console.log(`[${new Date().toISOString()}] Successfully loaded ${cache.communes.size} communes`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Failed to load communes:`, error);
                }
            })(),
            (async () => {
                try {
                    console.log(`[${new Date().toISOString()}] Fetching all estimates...`);
                    await fetchAllEstimates();
                    console.log(`[${new Date().toISOString()}] Successfully loaded ${cache.estimates.size} estimates`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Failed to load estimates:`, error);
                }
            })()
        ]);
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Reference data pre-fetched in ${duration}ms`);

        const estimates = await fetchAllEstimatePages(startDate, endDate);
        console.log(`[${new Date().toISOString()}] Found ${estimates.length} estimates to process`);

        // Process estimates in batches
        const BATCH_SIZE = 20;
        const estimatesWithDetails: ExtendedEstimate[] = [];

        for (let i = 0; i < estimates.length; i += BATCH_SIZE) {
            const batch = estimates.slice(i, i + BATCH_SIZE);
            console.log(`[${new Date().toISOString()}] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(estimates.length / BATCH_SIZE)} (estimates ${i + 1}-${i + batch.length})`);

            const batchResults = await Promise.all(
                batch.map(async (estimate) => {
                    try {
                        console.log(`[${new Date().toISOString()}] Processing estimate ${estimate.id} (${i + batch.indexOf(estimate) + 1}/${estimates.length})`);

                        // Create a base extended estimate object with all optional fields
                        const extendedEstimate: ExtendedEstimate = {
                            ...estimate,
                            customer: undefined,
                            city: undefined,
                            commune: undefined,
                            seller: undefined,
                            payment_type: undefined,
                            user: undefined
                        };

                        // Fetch estimate details (critical data)
                        const details = await safeFetch(
                            estimate.id,
                            fetchEstimateDetails,
                            'estimate details',
                            'estimate',
                            estimate.id,
                            true
                        );

                        if (details) {
                            Object.assign(extendedEstimate, details);
                        }

                        // Fetch related data in parallel
                        const [customer, city, commune] = await Promise.all([
                            safeFetch(estimate.customer_id, fetchCustomer, 'customer', 'customer', estimate.customer_id || 'unknown', false),
                            safeFetch(estimate.city_id, fetchCity, 'city', 'city', estimate.city_id || 'unknown', false),
                            safeFetch(estimate.commune_id, fetchCommune, 'commune', 'commune', estimate.commune_id || 'unknown', false)
                        ]);

                        // Assign fetched data to the extended estimate
                        extendedEstimate.customer = customer;
                        extendedEstimate.city = city;
                        extendedEstimate.commune = commune;

                        // Get cached data (non-critical)
                        extendedEstimate.seller = estimate.seller_id ? cache.sellers.get(estimate.seller_id) : undefined;
                        extendedEstimate.payment_type = estimate.type_payment_id ? cache.paymentTypes.get(estimate.type_payment_id) : undefined;
                        extendedEstimate.user = estimate.user_id ? cache.users.get(estimate.user_id) : undefined;

                        return extendedEstimate;
                    } catch (error) {
                        console.error(`[${new Date().toISOString()}] ERROR PROCESSING ESTIMATE ${estimate.id}:`, error);
                        requestStats.dataLoss++;
                        return undefined;
                    }
                })
            );

            // Filter out undefined results and add to final array
            const validBatch = batchResults.filter((estimate): estimate is ExtendedEstimate => estimate !== undefined);
            estimatesWithDetails.push(...validBatch);
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

        console.log(`\n[${new Date().toISOString()}] Completed processing all estimates. ${estimatesWithDetails.length} estimates processed successfully.`);
        return estimatesWithDetails;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] FATAL ERROR in fetchAllEstimatesWithDetails (${startDate} to ${endDate}):`, error);
        return [];
    }
}

// Function to process all date ranges for estimates
async function processAllEstimateDateRanges() {
    const dateRanges = generateDateRanges();
    console.log(`[${new Date().toISOString()}] Starting to process ${dateRanges.length} estimate date ranges`);

    for (const [index, range] of dateRanges.entries()) {
        try {
            console.log(`[${new Date().toISOString()}] [${index + 1}/${dateRanges.length}] Processing estimate date range: ${range.startDate} to ${range.endDate}`);

            const startTime = Date.now();
            const data = await fetchAllEstimatesWithDetails(
                range.startDate,
                range.endDate
            );
            const duration = Date.now() - startTime;

            if (data.length > 0) {
                const fileName = `./data/estimates/estimates_${range.year}_${String(range.month).padStart(2, "0")}.xlsx`;
                console.log(`[${new Date().toISOString()}] Saving ${data.length} estimate records to ${fileName}`);
                saveEstimatesToExcel(data, fileName);
                console.log(`[${new Date().toISOString()}] Successfully saved estimate data to ${fileName} in ${duration}ms`);
            } else {
                console.log(`[${new Date().toISOString()}] No estimate data found for range ${range.startDate} to ${range.endDate}`);
            }

            // Add delay between date ranges
            if (index < dateRanges.length - 1) {
                console.log(`[${new Date().toISOString()}] Waiting 2 seconds before next estimate date range...`);
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error processing estimate date range ${range.startDate} to ${range.endDate}:`, error);
        }
    }

    console.log(`[${new Date().toISOString()}] Completed processing all estimate date ranges`);
}

// Function to save estimates to Excel
function saveEstimatesToExcel(
    data: ExtendedEstimate[],
    fileName: string
): void {
    try {
        console.log(`[${new Date().toISOString()}] Starting to save estimate data to Excel file: ${fileName}`);

        // Ensure the data directory exists
        ensureDataDirectory();

        const workbook = XLSX.utils.book_new();
        const startTime = Date.now();

        // Create main Estimates sheet with all fields
        console.log(`[${new Date().toISOString()}] Creating Estimates sheet with ${data.length} records`);
        const estimatesSheet = XLSX.utils.json_to_sheet(
            data.map((estimate) => ({
                id: estimate.id,
                company_id: estimate.company_id,
                business_id: estimate.business_id,
                customer_id: estimate.customer_id,
                customer_name: estimate.customer?.name || '',
                city_id: estimate.city_id,
                city_name: estimate.city?.name || '',
                commune_id: estimate.commune_id,
                commune_name: estimate.commune?.name || '',
                user_id: estimate.user_id,
                user_name: estimate.user ? `${estimate.user.first_name} ${estimate.user.last_name}` : '',
                type_payment_id: estimate.type_payment_id,
                payment_type_name: estimate.payment_type?.name || '',
                start_date: estimate.start_date,
                end_date: estimate.end_date,
                folio: estimate.folio,
                address: estimate.address,
                iva: estimate.iva,
                global_discount: estimate.global_discount || 0,
                status: estimate.status,
                comment: estimate.comment,
                contact: estimate.contact,
                pdf_file_url: estimate.pdf_file?.url || '',
                amount_total: estimate.amount_total,
                amount_iva: estimate.amount_iva,
                amount_neto: estimate.amount_neto,
                amount_exempt: estimate.amount_exempt,
                payment_comment: estimate.payment_comment,
                created_at: estimate.created_at,
                updated_at: estimate.updated_at,
                branch_id: estimate.branch_id,
                label_value: estimate.label_value || '',
                valid_for: estimate.valid_for,
                delivery_time: estimate.delivery_time,
                currency: estimate.currency,
                job_id: estimate.job_id,
                seller_id: estimate.seller_id,
                seller_name: estimate.seller ? `${estimate.seller.first_name} ${estimate.seller.last_name}` : '',
                tpo_valor: estimate.tpo_valor,
                amount_tax: estimate.amount_tax,
                is_continuous: estimate.is_continuous,
                mnt_bruto: estimate.mnt_bruto,
                price_list_id: estimate.price_list_id,
                customer_rut: estimate.customer?.rut || '',
                customer_type: estimate.customer?.type_customer || '',
                customer_email: estimate.customer?.email?.join("; ") || '',
                customer_phone: estimate.customer?.phone || '',
                customer_address: estimate.customer?.address || '',
                customer_business_activity: estimate.customer?.business_activity || '',
            }))
        );
        XLSX.utils.book_append_sheet(workbook, estimatesSheet, "Estimates");
        console.log(`[${new Date().toISOString()}] Created Estimates sheet successfully`);

        // Create products sheet with all fields
        const products = data.flatMap((estimate) =>
            estimate.products.map((product) => ({
                estimate_id: estimate.id,
                estimate_folio: estimate.folio,
                product_id: product.product_id,
                name: product.name || '',
                url_image: product.url_image || '',
                code: product.code || '',
                description: product.description || '',
                quantity: product.quantity || 0,
                price: product.price || 0,
                discount: product.discount || 0,
                surcharge: product.surcharge || 0,
                unit_item: product.unit_item || '',
                tax_affected: product.tax_affected,
                created_at: product.created_at || '',
                updated_at: product.updated_at || '',
                unit_cost: product.unit_cost || 0,
                additional_tax_code: product.additional_tax_code || '',
                additional_tax_fee: product.additional_tax_fee || 0,
                real_quantity: product.real_quantity || 0,
                real_amount_neto: product.real_amount_neto || 0,
                is_profit: product.is_profit,
                expiration_date: product.expiration_date || '',
                lot_serial_number_id: product.lot_serial_number_id || 0,
                lot_serial_number: product.lot_serial_number || '',
                traceability: product.traceability || '',
            }))
        );

        if (products.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Products sheet with ${products.length} records`);
            const productsSheet = XLSX.utils.json_to_sheet(products);
            XLSX.utils.book_append_sheet(workbook, productsSheet, "Products");
            console.log(`[${new Date().toISOString()}] Created Products sheet successfully`);
        }

        // Create emails sheet with all fields
        const emails = data.flatMap((estimate) =>
            estimate.emails.map((email) => ({
                estimate_id: estimate.id,
                estimate_folio: estimate.folio,
                id: email.id,
                email: email.email || '',
                created_at: email.created_at || '',
                updated_at: email.updated_at || '',
                message: email.message || '',
                subject: email.subject || '',
                reminder_id: email.reminder_id || 0,
                company_id: email.company_id,
                business_id: email.business_id,
            }))
        );

        if (emails.length > 0) {
            console.log(`[${new Date().toISOString()}] Creating Emails sheet with ${emails.length} records`);
            const emailsSheet = XLSX.utils.json_to_sheet(emails);
            XLSX.utils.book_append_sheet(workbook, emailsSheet, "Emails");
            console.log(`[${new Date().toISOString()}] Created Emails sheet successfully`);
        }

        // Write the workbook to a file
        console.log(`[${new Date().toISOString()}] Writing workbook to file: ${fileName}`);
        XLSX.writeFile(workbook, fileName);
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Successfully saved estimate data to ${fileName} in ${duration}ms`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error saving estimates to Excel:`, error);
        throw error;
    }
}

// Add to your main.ts to start the process
console.log(`[${new Date().toISOString()}] Starting estimate extraction process...`);
processAllEstimateDateRanges().catch((error) => {
    console.error(`[${new Date().toISOString()}] Fatal error in processAllEstimateDateRanges:`, error);
});
