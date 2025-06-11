import type { User, UsersResponse } from "../types/user.ts";
import { cache } from "../utils/cache.ts";
import { base_url, headers } from "../utils/dotenv.ts";

// Fetch all users - let safeFetch handle error logging
export async function fetchAllUsers(): Promise<Map<number, User>> {
    if (cache.users.size > 0) {
        return cache.users;
    }

    try {
        const url = `${base_url}/usuarios`;
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (!response.ok) {
            // Don't log other errors here - let safeFetch handle it
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: UsersResponse = await response.json();
        data.data.users.forEach((user) => {
            cache.users.set(user.id, user);
        });

        return cache.users;
    } catch (error) {
        // Don't log errors here - let safeFetch handle retries and logging
        throw error; // Re-throw so safeFetch can handle it
    }
}