import type { AllCommunesResponse, Commune, CommuneResponse } from "../types/commune.ts";
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

export async function fetchAllCommunes(): Promise<Map<number, Commune>> {
    if (cache.communes.size > 0) {
        return cache.communes;
    }

    try {
        const url = `${base_url}/comunas`;
        console.log(`[${new Date().toISOString()}] Fetching all communes from ${url}`);
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AllCommunesResponse = await response.json();
        data.data.communes.forEach((commune) => {
            cache.communes.set(commune.id, commune);
        });
        console.log(`[${new Date().toISOString()}] Successfully fetched ${data.data.communes.length} communes`);
        return cache.communes;
    } catch (error) {
        console.error("Error fetching all communes:", error);
        return cache.communes;
    }
}