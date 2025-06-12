// types/estimate.ts
export interface EstimateProduct {
    id: number;
    product_id: number;
    name: string;
    url_image: string | null;
    code: string;
    description: string;
    quantity: number;
    price: number;
    discount: number | null;
    surcharge: number | null;
    unit_item: string | null;
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

export interface EstimateEmail {
    id: number;
    estimate_id: number;
    email: string;
    created_at: string;
    updated_at: string;
    message: string;
    subject: string;
    reminder_id: number | null;
    company_id: number;
    business_id: number;
}

export interface Estimate {
    id: number;
    company_id: number;
    business_id: number;
    customer_id: number;
    city_id: number | null;
    commune_id: number | null;
    user_id: number;
    type_payment_id: number | null;
    start_date: string;
    end_date: string;
    folio: number;
    address: string;
    iva: number;
    global_discount: number | null;
    status: string;
    comment: string;
    contact: string;
    pdf_file: {
        url: string;
    };
    amount_total: string;
    amount_iva: string;
    amount_neto: string;
    amount_exempt: string;
    payment_comment: string;
    created_at: string;
    updated_at: string;
    branch_id: number | null;
    label_value: string | null;
    valid_for: number;
    delivery_time: string;
    currency: string;
    job_id: number | null;
    seller_id: number | null;
    tpo_valor: string;
    amount_tax: string;
    is_continuous: boolean;
    mnt_bruto: boolean;
    price_list_id: number | null;
    products: EstimateProduct[];
    emails: EstimateEmail[];
}

export interface EstimatesResponse {
    data: {
        estimates: Estimate[];
    };
    meta: {
        code: number;
        message: string;
        current_page: number;
        next_page: number | null;
        prev_page: number | null;
        total_pages: number;
        total_count: number;
    };
}

export interface EstimateDetailResponse {
    data: Estimate;
    meta: {
        code: number;
        message: string;
    };
}
