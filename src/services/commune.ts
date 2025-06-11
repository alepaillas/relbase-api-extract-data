import type { Commune, CommuneResponse } from "../types/commune.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

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
                console.log(`Commune ${communeId} not found (404)`);
                return undefined;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CommuneResponse = await response.json();
        cache.communes.set(communeId, data.data);
        return data.data;
    } catch (error) {
        throw error; // Let safeFetch handle it
    }
}