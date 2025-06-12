// services/references.ts
import type { Reference, ReferenceResponse } from "../types/reference.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

export async function fetchAllReferences(): Promise<Map<number, Reference>> {
    if (cache.references.size > 0) {
        return cache.references;
    }

    try {
        const url = `${base_url}/references`;
        console.log(`[${new Date().toISOString()}] Fetching all references from ${url}`);
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ReferenceResponse = await response.json();
        data.data.references.forEach((reference) => {
            cache.references.set(reference.id, reference);
        });
        console.log(`[${new Date().toISOString()}] Successfully fetched ${data.data.references.length} references`);
        return cache.references;
    } catch (error) {
        throw error
    }
}
