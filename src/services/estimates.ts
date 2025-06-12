// services/estimates.ts
import type { Estimate, EstimateDetailResponse, EstimatesResponse } from "../types/estimate.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

export async function fetchAllEstimates(): Promise<Map<number, Estimate>> {
    if (cache.estimates.size > 0) {
        return cache.estimates;
    }

    try {
        const url = `${base_url}/cotizaciones`;
        console.log(`[${new Date().toISOString()}] Fetching all estimates from ${url}`);
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: EstimatesResponse = await response.json();
        data.data.estimates.forEach((estimate) => {
            cache.estimates.set(estimate.id, estimate);
        });
        console.log(`[${new Date().toISOString()}] Successfully fetched ${data.data.estimates.length} estimates`);
        return cache.estimates;
    } catch (error) {
        console.error("Error fetching all estimates:", error);
        return cache.estimates;
    }
}

export async function fetchEstimateDetails(estimateId: number): Promise<Estimate | undefined> {
    try {
        const url = `${base_url}/cotizaciones/${estimateId}`;
        console.log(`[${new Date().toISOString()}] Fetching estimate details from ${url}`);
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Estimate ${estimateId} not found`);
                return undefined;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: EstimateDetailResponse = await response.json();
        console.log(`[${new Date().toISOString()}] Successfully fetched details for estimate ${estimateId}`);
        return data.data;
    } catch (error) {
        console.error(`Error fetching details for estimate ${estimateId}:`, error);
        return undefined;
    }
}
