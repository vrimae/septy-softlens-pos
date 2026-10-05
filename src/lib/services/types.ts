// ==============================================================================
// FILE: src/lib/services/types.ts
// DESCRIPTION: Domain TypeScript Types & Interfaces for Septy Softlens POS
// ==============================================================================

export type UserRole = 'owner' | 'admin' | 'kasir' | 'warehouse';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  branch_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  branch_code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_percentage: number;
  loyalty_points_enabled: boolean;
  points_per_amount: number;
  require_prescription: boolean;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Brand {
  id: string;
  name: string;
  code?: string | null;
  country_of_origin?: string | null;
  created_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  barcode?: string | null;
  variant_name: string;
  power?: string | null;
  color?: string | null;
  cylinder?: string | null;
  axis?: string | null;
  cost_price: number;
  price_regular: number;
  price_member?: number | null;
  price_promo?: number | null;
  stock: number;
  min_stock: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  product_code: string;
  name: string;
  category_id?: string | null;
  brand_id?: string | null;
  category?: Category | null;
  brand?: Brand | null;
  cost_price: number;
  price_regular: number;
  price_member?: number | null;
  stock_global: number;
  min_stock: number;
  diameter?: string | null;
  base_curve?: string | null;
  water_content?: string | null;
  replacement_period?: string | null;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  variants?: ProductVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface PrescriptionData {
  od_sphere?: string;
  od_cylinder?: string;
  od_axis?: string;
  os_sphere?: string;
  os_cylinder?: string;
  os_axis?: string;
  bc?: string;
  dia?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  points: number;
  total_spent: number;
  notes?: string | null;
  prescription_data?: PrescriptionData | null;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SaleItemPayload {
  variant_id: string;
  qty: number;
  price_at_sale?: number;
  discount_amount?: number;
  notes?: string;
}

export interface SalePaymentPayload {
  payment_method: 'TUNAI' | 'TRANSFER' | 'QRIS' | 'DEBIT' | 'KREDIT';
  amount: number;
  reference_number?: string;
}

export interface CreateSalePayload {
  branch_id?: string;
  customer_id?: string | null;
  cashier_id?: string | null;
  sales_channel?: 'Toko' | 'WhatsApp' | 'Marketplace';
  discount_amount?: number;
  promo_code?: string;
  notes?: string;
  idempotency_key?: string;
  items: SaleItemPayload[];
  payments?: SalePaymentPayload[];
  pay_amount?: number;
  payment_method?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string | null;
  variant_id?: string | null;
  sku_snapshot: string;
  product_name_snapshot: string;
  qty: number;
  unit_price: number;
  cost_price_snapshot: number;
  discount_amount: number;
  subtotal: number;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  payment_method: string;
  amount: number;
  reference_number?: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  receipt_number?: string | null;
  branch_id?: string | null;
  customer_id?: string | null;
  customer?: Customer | null;
  cashier_id?: string | null;
  sales_channel: string;
  subtotal: number;
  discount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  total_cost: number;
  payment_method: string;
  payment_status: string;
  status: string;
  notes?: string | null;
  created_at: string;
  sale_items?: SaleItem[];
  sale_payments?: SalePayment[];
}

export interface PurchaseItemPayload {
  product_id?: string;
  variant_id: string;
  qty: number;
  cost_price: number;
  notes?: string;
}

export interface CreatePurchasePayload {
  supplier_id: string;
  branch_id?: string;
  notes?: string;
  items: PurchaseItemPayload[];
  payment?: {
    payment_method: string;
    paid_amount: number;
    reference_number?: string;
  };
}

export interface StockAdjustmentPayload {
  variant_id: string;
  branch_id?: string;
  actual_stock: number;
  reason: string;
  notes?: string;
}

export interface CashRegister {
  id: string;
  name: string;
  register_name?: string;
  branch_id?: string | null;
  is_active: boolean;
  balance: number;
  current_balance?: number;
  created_at: string;
}

export interface CashFlow {
  id: string;
  cash_register_id?: string | null;
  register_id?: string | null;
  flow_type: 'IN' | 'OUT';
  category: string;
  amount: number;
  description?: string | null;
  created_at: string;
}

export interface ShiftClosingPayload {
  register_id: string;
  physical_cash: number;
  notes?: string;
}

export interface DashboardMetrics {
  gross_sales: number;
  cogs: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  total_transactions: number;
  avg_basket_size: number;
  total_items_sold: number;
  cash_collected: number;
  non_cash_collected: number;
}
