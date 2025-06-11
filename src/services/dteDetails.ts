import type { DteDetail, DteDetailResponse } from "../types/dte.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";
import { fetchSellerNameFromPrint } from "./print.ts";

// Fetch details for a specific DTE - let safeFetch handle error logging
export async function fetchDteDetails(dteId: number): Promise<DteDetail | undefined> {
    try {
        const url = `${base_url}/dtes/${dteId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            if (response.status === 404) {
                // 404 is expected for some DTEs, so we can log this quietly
                console.log(`DTE ${dteId} not found (404)`);
                return undefined;
            }
            // Don't log other errors here - let safeFetch handle it
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: DteDetailResponse = await response.json();

        // If seller_id exists but seller isn't in cache, try to get seller info
        if (data.data.seller_id && !cache.sellers.has(data.data.seller_id)) {
            // First try to get seller from the standard endpoint
            let seller = cache.sellers.get(data.data.seller_id);

            // If not found, try to get from print endpoint
            if (!seller) {
                const sellerInfo = await fetchSellerNameFromPrint(dteId);
                if (sellerInfo) {
                    // Create a temporary seller object with the name
                    seller = {
                        id: data.data.seller_id,
                        first_name: sellerInfo.first_name,
                        last_name: sellerInfo.last_name,
                        role: "unknown",
                        profile_id: null,
                    };
                    cache.sellers.set(data.data.seller_id, seller);
                }
            }
        }

        return data.data;
    } catch (error) {
        // Don't log errors here - let safeFetch handle retries and logging
        throw error; // Re-throw so safeFetch can handle it
    }
}
