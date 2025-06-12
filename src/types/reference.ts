// types/reference.ts
export interface Reference {
    id: number;
    code: string;
    name: string;
    created_at: string;
    updated_at: string;
    is_view_invoice: boolean;
    is_view_export_invoice: boolean;
    is_dte: boolean;
}

export interface ReferenceResponse {
    data: {
        references: Reference[];
    };
    meta: {
        code: number;
        message: string;
    };
}

export interface DteReference {
    id: number;
    e_document_id: number;
    tpo_doc_ref_id: number;
    code_ref: number;
    folio_ref: string;
    date_ref: string;
    razon_ref: string;
    rut_otro: string | null;
    created_at: string;
    updated_at: string;
    is_dte: boolean;
    rut_otr: string;
    company_id: number;
    business_id: number;
}
