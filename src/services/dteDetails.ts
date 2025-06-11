import { DteDetail, DteDetailResponse } from "../types/dte";
import { cache } from "../utils/cache";
import { base_url, headers } from "../utils/dotenv";
import { fetchSellerNameFromPrint } from "./print";

// Fetch details for a specific DTE
export async function fetchDteDetails(dteId: number): Promise<DteDetail | undefined> {
    try {
        const url = `${base_url}/dtes/${dteId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`DTE ${dteId} not found`);
                return undefined;
            }
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
        console.error(`Error fetching details for DTE ${dteId}:`, error);
        return undefined;
    }
}
