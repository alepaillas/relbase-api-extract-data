import { Commune, CommuneResponse } from "../types/commune";
import { cache } from "../utils/cache";
import { base_url, headers } from "../utils/dotenv";

// Fetch commune data
export async function fetchCommune(communeId: number): Promise<Commune | undefined> {
    if (cache.communes.has(communeId)) {
        return cache.communes.get(communeId);
    }

    try {
        const url = `${base_url}/comunas/${communeId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Commune ${communeId} not found`);
                return undefined;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CommuneResponse = await response.json();
        cache.communes.set(communeId, data.data);
        return data.data;
    } catch (error) {
        console.error(`Error fetching commune ${communeId}:`, error);
        return undefined;
    }
}