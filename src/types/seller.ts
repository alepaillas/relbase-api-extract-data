import type { Meta } from "./meta.ts";

// Interface for Seller
export interface Seller {
  id: number;
  first_name: string;
  last_name: string;
  role: string | null;
  profile_id: number | null;
}

export interface SellersResponse {
  data: {
    sellers: Seller[];
  };
  meta: Meta;
}
