import type { AllCustomersResponse, Customer, CustomerResponse } from "../types/customer.ts";
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

export async function fetchAllCustomers(): Promise<Map<number, Customer>> {
    if (cache.customers.size > 0) {
        return cache.customers;
    }

    try {
        const url = `${base_url}/clientes`;
        console.log(`[${new Date().toISOString()}] Fetching all customers from ${url}`);
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AllCustomersResponse = await response.json();
        data.data.customers.forEach((customer) => {
            cache.customers.set(customer.id, customer);
        });
        console.log(`[${new Date().toISOString()}] Successfully fetched ${data.data.customers.length} customers`);
        return cache.customers;
    } catch (error) {
        console.error("Error fetching all customers:", error);
        return cache.customers;
    }
}