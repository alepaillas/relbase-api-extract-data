import type { DteFile } from "./dte_file.ts";
import type { Email } from "./email.ts";
import type { Meta } from "./meta.ts";
import type { Product } from "./product.ts";
import type { DteReference } from "./reference.ts";

// Interfaces for DTE data
export interface Dte {
  id: number;
  folio: number;
  type_document: number;
  iva: number;
  type_document_name: string;
  sii_status: string;
  sii_status_name: string;
  start_date: string;
  end_date: string;
  pdf_file: DteFile;
  xml_inter_file: DteFile;
  customer_id: number;
  commune_id: number | null;
  city_id: number | null;
  address: string;
  type_transfer: string | null;
  global_discount: number | null;
  contact: string;
  channel_id: number | null;
  type_payment_id: number | null;
  seller_id: number | null;
  label_value: string | null;
  status: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
  type_option_ref: string | null;
  track_id: string | null;
  user_id: number | null;
  is_load_xml: boolean;
  is_manual: boolean;
  amount_iva: number;
  amount_total: number;
  amount_neto: number;
  amount_tax: number;
  amount_exempt: number;
  unit_cost: number;
  real_amount_total: number;
  real_amount_neto: number;
  real_amount_iva: number;
  real_amount_tax: number;
  real_amount_exempt: number;
  cash_sale: number;
  mnt_bruto: boolean;
  dispatch_address: string | null;
  dispatch_city_id: number | null;
  dispatch_commune_id: number | null;
  number_plate: string | null;
  shipper_rut: string | null;
  driver_rut: string | null;
  driver_name: string | null;
  branch_id: number | null;
  continuous: boolean;
  addon_centry: boolean;
  ware_house_id: number | null;
  change_due: number | null;
  amount_paid: number | null;
  logo_propyme: boolean;
  currency: string;
  type_document_sii: string | null;
  is_stock_sale_note: boolean;
  addon_ecommerce: boolean;
  income_type: number;
  reject_date: string | null;
  tpo_tran_venta: string | null;
  tpo_tran_compra: string | null;
  str_commune: string | null;
  str_city: string | null;
  is_str_address: boolean;
  timbre: string;
}

export interface DteChild {
  id: number;
  folio: number;
  type_document: number;
  type_document_name: string;
}

export interface SiiTrack {
  sii_status: string;
  note: string | null;
  ws_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface DteDetail extends Dte {
  emails: Email[];
  products: Product[];
  sii_tracks: SiiTrack[];
  discounts: any[];
  references: DteReference[];
  dte_children: DteChild[];
}

export interface DteListResponse {
  data: {
    dtes: Dte[];
  };
  meta: Meta & {
    current_page: number;
    next_page: number;
    prev_page: number;
    total_pages: number;
    total_count: number;
  };
}

export interface DteDetailResponse {
  data: DteDetail;
  meta: Meta;
}