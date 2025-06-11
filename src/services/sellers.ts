import type { Seller, SellersResponse } from "../types/seller.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

// Fetch all sellers - let safeFetch handle error logging
export async function fetchAllSellers(): Promise<Map<number, Seller>> {
    if (cache.sellers.size > 0) {
        return cache.sellers;
    }

    try {
        const url = `${base_url}/vendedores`;
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            // Don't log other errors here - let safeFetch handle it
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: SellersResponse = await response.json();
        data.data.sellers.forEach((seller) => {
            cache.sellers.set(seller.id, seller);
        });

        return cache.sellers;
    } catch (error) {
        // Don't log errors here - let safeFetch handle retries and logging
        throw error; // Re-throw so safeFetch can handle it
    }
}