export interface Customer {
  id: number;
  name: string;
  phone: string;
  last_order?: string;
}

export interface Order {
  id: number;
  customer_id: number;
  product_type_id: number;
  custom_name: string;
  manufacturing_status: string;
  payment_status: string;
  total_amount: number;
  paid_amount: number;
  delivery_date: string | null;
  urgency_level?: string;
  description: string;
  created_at: string;
  normalized_name: string;
  order_images?: string; // Comma separated file paths specialized for this order
  reference_images?: string; // Comma separated file paths shared for this product type
}

export interface FinancialRecord {
  name: string;
  total: number;
}

export interface PendingOrder extends Order {
  customer_name: string;
  preview_image?: string;
}

export interface ImageAsset {
  id: number;
  product_type_id: number;
  order_id: number | null;
  file_path: string;
  product_name: string;
}
