import type { Meta } from "./meta.ts";

// Interface for Customer
export interface Customer {
  id: number;
  type_customer: string;
  rut: string;
  name: string;
  name_fantasy: string;
  address: string;
  business_activity: string;
  city_id: number;
  commune_id: number;
  active: boolean;
  code: string;
  name_payment: string | null;
  phone_payment: string;
  email: string[];
  business_contact: string | null;
  email_commercial: string[];
  phone: string | null;
  mobile: string | null;
  reference: string | null;
  discount: number | null;
  credit: number | null;
  type_payment_id: number | null;
  credit_amount: number;
  is_overdue_invoice: boolean;
  days_overdue: number | null;
  price_list_id: number | null;
  price_list_name: string | null;
  is_price_list_default: boolean | null;
  full_address: string;
}

export interface CustomerResponse {
  data: Customer;
  meta: Meta;
}

export interface AllCustomersResponse {
  data: {
    customers: Customer[];
  };
  meta: {
    code: number;
    message: string;
  };
}