import type { Meta } from "./meta.ts";

// Interface for Payment Type
export interface PaymentType {
  id: number;
  name: string;
  fma_pago_sii: number;
  kind_payment: number;
  enabled: boolean;
}

export interface PaymentTypesResponse {
  data: {
    type_payments: PaymentType[];
  };
  meta: Meta & {
    current_page: number;
    next_page: number;
    prev_page: number;
    total_pages: number;
    total_count: number;
  };
}
