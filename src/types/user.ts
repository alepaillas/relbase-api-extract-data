import type { Meta } from "./meta.ts";

// Interface for User
export interface User {
  id: number;
  branch_id: number | null;
  first_name: string;
  last_name: string;
  role: string | null;
  email: string;
  token: string;
  ware_house_id: number | null;
  seller_id: number | null;
  channel_id: number | null;
  type_document_sii: string | null;
  type_document_sn: string | null;
  type_payment_id: number | null;
  type_print_pos: number;
  ticket: boolean;
  is_income_paid: boolean;
  comment_estimate: string | null;
  comment_sales_note: string | null;
  comment_dte: string | null;
  charset_id: number | null;
  charset_name: string | null;
  is_mnt_bruto_estimate: boolean;
  ware_house_web_id: number | null;
  is_owner_warehouse: boolean;
}

export interface UsersResponse {
  data: {
    users: User[];
  };
  meta: Meta;
}
