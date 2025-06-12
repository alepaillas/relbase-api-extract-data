import type { PaymentType, PaymentTypesResponse } from "../types/payment_type.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

// Fetch all payment types with pagination support
export async function fetchAllPaymentTypes(): Promise<Map<number, PaymentType>> {
    // Return cached data if we already have it
    if (cache.paymentTypes.size > 0) {
        console.log(`[${new Date().toISOString()}] Returning ${cache.paymentTypes.size} cached payment types`);
        return cache.paymentTypes;
    }

    try {
        console.log(`[${new Date().toISOString()}] Starting to fetch all payment types`);
        let currentPage = 1;
        let totalPages = 1;
        let allPaymentTypes: PaymentType[] = [];

        // First fetch to get total pages
        const firstUrl = `${base_url}/forma_pagos?page=${currentPage}`;
        console.log(`[${new Date().toISOString()}] Fetching first page of payment types: ${firstUrl}`);

        const firstResponse = await fetch(firstUrl, {
            method: "GET",
            headers: headers,
        });

        if (!firstResponse.ok) {
            throw new Error(`HTTP error! status: ${firstResponse.status}`);
        }

        const firstData: PaymentTypesResponse = await firstResponse.json();
        allPaymentTypes = allPaymentTypes.concat(firstData.data.type_payments);
        totalPages = firstData.meta.total_pages;
        console.log(`[${new Date().toISOString()}] Found ${firstData.data.type_payments.length} payment types on first page. Total pages: ${totalPages}`);

        // If there are more pages, fetch them
        if (totalPages > 1) {
            console.log(`[${new Date().toISOString()}] Starting to fetch remaining pages of payment types...`);

            // We'll fetch pages 2 and 3 sequentially
            for (let page = 2; page <= Math.min(3, totalPages); page++) {
                try {
                    const pageUrl = `${base_url}/forma_pagos?page=${page}`;
                    console.log(`[${new Date().toISOString()}] Fetching payment types page ${page}: ${pageUrl}`);

                    const response = await fetch(pageUrl, {
                        method: "GET",
                        headers: headers,
                    });

                    if (!response.ok) {
                        console.error(`[${new Date().toISOString()}] Error fetching payment types page ${page}: HTTP ${response.status}`);
                        continue;
                    }

                    const pageData: PaymentTypesResponse = await response.json();
                    allPaymentTypes = allPaymentTypes.concat(pageData.data.type_payments);
                    console.log(`[${new Date().toISOString()}] Fetched ${pageData.data.type_payments.length} payment types from page ${page}`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Error fetching payment types page ${page}:`, error);
                    continue;
                }
            }
        }

        // Cache all payment types
        allPaymentTypes.forEach((paymentType) => {
            cache.paymentTypes.set(paymentType.id, paymentType);
        });

        console.log(`[${new Date().toISOString()}] Successfully fetched ${allPaymentTypes.length} payment types`);
        return cache.paymentTypes;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching payment types:`, error);
        throw error;
    }
}
