import type { City, CityResponse } from "../types/city.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

// Updated fetchCity function - let safeFetch handle error logging
export async function fetchCity(cityId: number): Promise<City | undefined> {
    // Check cache first
    if (cache.cities.has(cityId)) {
        return cache.cities.get(cityId);
    }

    try {
        const url = `${base_url}/ciudades/${cityId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            if (response.status === 404) {
                // 404 is expected for some cities, so we can log this quietly
                console.log(`City ${cityId} not found (404)`);
                return undefined;
            }
            // Don't log other errors here - let safeFetch handle it
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CityResponse = await response.json();
        cache.cities.set(cityId, data.data);
        return data.data;
    } catch (error) {
        // Don't log errors here - let safeFetch handle retries and logging
        throw error; // Re-throw so safeFetch can handle it
    }
}