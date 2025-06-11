import type { City, CityResponse } from "../types/city.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

// Fetch city data
export async function fetchCity(cityId: number): Promise<City | undefined> {
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
                console.warn(`City ${cityId} not found`);
                return undefined;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CityResponse = await response.json();
        cache.cities.set(cityId, data.data);
        return data.data;
    } catch (error) {
        console.error(`Error fetching city ${cityId}:`, error);
        return undefined;
    }
}