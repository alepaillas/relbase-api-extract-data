// Interfaces for DTE details
export interface Email {
  id: number;
  e_document_id: number;
  email: string;
  created_at: string;
  updated_at: string;
  message: string;
  subject: string;
  email_to_reply: string[];
  reminder_id: number;
  company_id: number;
  business_id: number;
}
