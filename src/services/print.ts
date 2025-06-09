import type { PrintResponse } from "../types/print_response.ts";
import { base_url, headers } from "../utils/dotenv.ts";

export async function fetchSellerNameFromPrint(
  dteId: number
): Promise<string | undefined> {
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

    // Improved regex pattern to extract seller name
    // This pattern will:
    // 1. Match "Vendedor:" or "Vendedor: " (with or without space)
    // 2. Capture everything after it until a newline or HTML tag
    // 3. Remove any HTML tags and extra whitespace
    const sellerNameRegex = /Vendedor:\s*<\/b>\s*([^<]+)/i;

    // Check print_content first
    for (const content of data.data.print_content) {
      const match = content.match(sellerNameRegex);
      if (match && match[1]) {
        // Clean up the name by removing any remaining HTML tags or extra whitespace
        return match[1].replace(/<[^>]+>/g, "").trim();
      }
    }

    // Alternative pattern for print_content_v2 which might have different formatting
    const sellerNameRegexV2 = /Vendedor:\s*([^\n]+)/i;

    // If not found in print_content, check print_content_v2
    for (const content of data.data.print_content_v2) {
      const match = content.match(sellerNameRegexV2);
      if (match && match[1]) {
        // Clean up the name by removing any remaining HTML tags or extra whitespace
        return match[1].replace(/<[^>]+>/g, "").trim();
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
