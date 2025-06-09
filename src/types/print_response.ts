import type { Meta } from "./meta.ts";

// Add this interface for the print endpoint response
export interface PrintResponse {
  data: {
    is_print_header: boolean;
    is_print_logo: boolean;
    is_print_content: boolean;
    is_print_stamp: boolean;
    is_print_footer: boolean;
    print_header: string;
    print_logo: string;
    print_content: string[];
    print_stamp: string;
    print_footer: string;
    print_header_v2: string;
    print_footer_v2: string;
    print_content_v2: string[];
    print_company_v2: string;
    print_products_v2: string[];
    print_totals_v2: string[][];
    comment_v2: string;
  };
  meta: Meta;
}
