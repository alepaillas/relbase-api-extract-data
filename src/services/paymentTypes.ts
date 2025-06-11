import type { PaymentType, PaymentTypesResponse } from "../types/payment_type.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

// Fetch all payment types - let safeFetch handle error logging
export async function fetchAllPaymentTypes(): Promise<Map<number, PaymentType>> {
    if (cache.paymentTypes.size > 0) {
        return cache.paymentTypes;
    }

    try {
        const url = `${base_url}/forma_pagos`;
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            // Don't log other errors here - let safeFetch handle it
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: PaymentTypesResponse = await response.json();
        data.data.type_payments.forEach((paymentType) => {
            cache.paymentTypes.set(paymentType.id, paymentType);
        });

        return cache.paymentTypes;
    } catch (error) {
        // Don't log errors here - let safeFetch handle retries and logging
        throw error; // Re-throw so safeFetch can handle it
    }
}