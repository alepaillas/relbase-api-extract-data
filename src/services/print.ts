import type { PrintResponse } from "../types/print_response.ts";
import { base_url, headers } from "../utils/dotenv.ts";

export async function fetchSellerNameFromPrint(
  dteId: number
): Promise<{ first_name: string; last_name: string } | undefined> {
  try {
    const url = `${base_url}/dtes/${dteId}/imprimir`;
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Print data for DTE ${dteId} not found`);
        return undefined;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PrintResponse = await response.json();

    // More comprehensive patterns to extract seller name
    const patterns = [
      // Pattern 1: Vendedor: FirstName LastName
      /Vendedor:\s*([^\n<]+?)\s+([^\n<]+)/i,
      // Pattern 2: Vendedor:</b> FirstName LastName
      /Vendedor:\s*<\/b>\s*([^\n<]+?)\s+([^\n<]+)/i,
      // Pattern 3: Vendedor: FirstName LastName</b>
      /Vendedor:\s*([^\n<]+?)\s+([^\n<]+)<\/b>/i,
      // Pattern 4: Vendedor:</b> FirstName LastName</b>
      /Vendedor:\s*<\/b>\s*([^\n<]+?)\s+([^\n<]+)<\/b>/i,
      // Pattern 5: Vendedor: FirstName LastName with possible HTML tags
      /Vendedor:\s*<[^>]+>\s*([^\n<]+?)\s+([^\n<]+)\s*<\/[^>]+>/i,
      // Pattern 6: Simple Vendedor: Name
      /Vendedor:\s*([^\n]+)/i,
    ];

    // Function to clean up the name by removing HTML tags and extra whitespace
    const cleanName = (name: string): string => {
      return name
        .replace(/<[^>]+>/g, "") // Remove HTML tags
        .replace(/\[[^\]]+\]/g, "") // Remove [L], [R], [C] tags
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .trim();
    };

    // Check print_content first
    for (const content of [
      ...data.data.print_content,
      ...data.data.print_content_v2,
    ]) {
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          // Handle different pattern match groups
          if (match.length >= 3) {
            // Patterns that capture first and last name separately
            const firstName = cleanName(match[1]);
            const lastName = cleanName(match[2]);
            return { first_name: firstName, last_name: lastName };
          } else if (match.length >= 2) {
            // Patterns that capture full name
            const fullName = cleanName(match[1]);
            // Try to split into first and last name
            const nameParts = fullName.split(/\s+/);
            if (nameParts.length >= 2) {
              return {
                first_name: nameParts[0],
                last_name: nameParts.slice(1).join(" "),
              };
            }
            return { first_name: fullName, last_name: "" };
          }
        }
      }
    }

    console.warn(`No seller name found in print data for DTE ${dteId}`);
    return undefined;
  } catch (error) {
    console.error(
      `Error fetching seller name from print endpoint for DTE ${dteId}:`,
      error
    );
    return undefined;
  }
}
