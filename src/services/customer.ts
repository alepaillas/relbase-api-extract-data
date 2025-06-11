import { Customer, CustomerResponse } from "../types/customer";
import { cache } from "../utils/cache";
import { base_url, headers } from "../utils/dotenv";

// Fetch customer data
export async function fetchCustomer(
    customerId: number
): Promise<Customer | undefined> {
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
                console.warn(`Customer ${customerId} not found`);
                return undefined;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: CustomerResponse = await response.json();
        cache.customers.set(customerId, data.data);
        return data.data;
    } catch (error) {
        console.error(`Error fetching customer ${customerId}:`, error);
        return undefined;
    }
}