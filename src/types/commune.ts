import type { Meta } from "./meta.ts";

// Interface for Commune
export interface Commune {
  id: number;
  name: string;
  city_id: number;
}

export interface CommuneResponse {
  data: Commune;
  meta: Meta;
}
