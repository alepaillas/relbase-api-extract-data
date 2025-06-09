export interface Product {
  product_id: number;
  name: string;
  url_image: string | null;
  price: number;
  quantity: number;
  description: string;
  discount: number | null;
  surcharge: number | null;
  unit_item: string | null;
  code: string;
  tax_affected: boolean;
  created_at: string;
  updated_at: string;
  additional_tax_code: string | null;
  additional_tax_fee: number | null;
  unit_cost: number;
  real_quantity: number;
  real_amount_neto: number;
  is_profit: boolean;
  expiration_date: string | null;
  lot_serial_number_id: number | null;
  lot_serial_number: string | null;
  traceability: string | null;
}
