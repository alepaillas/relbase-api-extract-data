import type { Customer, CustomerResponse } from "../types/customer.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

// Updated fetchCustomer function
export async function fetchCustomer(customerId: number): Promise<Customer | undefined> {
    if (cache.customers.has(customerId)) {
        return cache.customers.get(customerId);
    }

    try {
        const url = `${base_url}/clientes/${customerId}`;
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.log(`Customer ${customerId} not found (404)`);
                return undefined;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CustomerResponse = await response.json();
        cache.customers.set(customerId, data.data);
        return data.data;
    } catch (error) {
        throw error; // Let safeFetch handle it
    }
}