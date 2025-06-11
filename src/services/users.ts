import { User, UsersResponse } from "../types/user";
import { cache } from "../utils/cache";
import { base_url, headers } from "../utils/dotenv";

// Fetch all users
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: UsersResponse = await response.json();
        data.data.users.forEach((user) => {
            cache.users.set(user.id, user);
        });
        return cache.users;
    } catch (error) {
        console.error("Error fetching all users:", error);
        return cache.users;
    }
}