-- ==============================================================================
-- MIGRATION: 20261006100000_core_schema.sql
-- DESCRIPTION: Core relational schema for Septy Softlens POS & ERP
-- AUTHOR: Senior Backend Engineer
-- IDEMPOTENT: Yes
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SEQUENCES FOR DOCUMENT NUMBERING
CREATE SEQUENCE IF NOT EXISTS seq_invoice_number START 1;
CREATE SEQUENCE IF NOT EXISTS seq_po_number START 1;
CREATE SEQUENCE IF NOT EXISTS seq_return_number START 1;

-- 3. FUNCTIONS FOR FORMATTED DOCUMENT NUMBERS
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_today TEXT;
  v_num BIGINT;
BEGIN
  v_today := to_char(CURRENT_DATE, 'YYYYMMDD');
  v_num := nextval('seq_invoice_number');
  RETURN 'INV-' || v_today || '-' || lpad((v_num % 10000)::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_today TEXT;
  v_num BIGINT;
BEGIN
  v_today := to_char(CURRENT_DATE, 'YYYYMMDD');
  v_num := nextval('seq_po_number');
  RETURN 'PO-' || v_today || '-' || lpad((v_num % 10000)::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_today TEXT;
  v_num BIGINT;
BEGIN
  v_today := to_char(CURRENT_DATE, 'YYYYMMDD');
  v_num := nextval('seq_return_number');
  RETURN 'RTN-' || v_today || '-' || lpad((v_num % 10000)::TEXT, 4, '0');
END;
$$;

-- 4. TRIGGER FUNCTION FOR updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 5. MASTER & SYSTEM TABLES
-- ==============================================================================

-- 5.1. BRANCHES (Cabang Toko)
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.2. STORE SETTINGS (Profil Toko & Parameter Sistem)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(150) NOT NULL DEFAULT 'Septy Softlens',
  address TEXT DEFAULT 'Jl. Raya Darmo Permai, Surabaya',
  phone VARCHAR(50) DEFAULT '081234567890',
  receipt_footer TEXT DEFAULT 'Terima kasih telah berbelanja di Septy Softlens!',
  qris_raw_data TEXT DEFAULT '00020101021126670016COM.NOBUBANK.WWW011893600...',
  allow_cashier_price_change BOOLEAN NOT NULL DEFAULT false,
  enable_incentives BOOLEAN NOT NULL DEFAULT true,
  incentive_per_item NUMERIC(15,2) NOT NULL DEFAULT 1000.00,
  incentive_upselling_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  target_upselling_count INTEGER NOT NULL DEFAULT 10,
  inventory_cost_method VARCHAR(30) NOT NULL DEFAULT 'WEIGHTED_AVG' CHECK (inventory_cost_method IN ('WEIGHTED_AVG', 'LAST_PURCHASE')),
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.3. PROFILES (Pengguna & Role Toko, terhubung ke auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'KASIR' CHECK (role IN ('OWNER', 'ADMIN', 'KASIR')),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'INACTIVE')),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.4. CATEGORIES (Kategori Barang)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  target_margin NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  target_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  use_expired BOOLEAN NOT NULL DEFAULT false,
  track_expired BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.5. BRANDS (Merk Pabrikan)
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.6. PRODUCTS (Master Barang Dasar)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  product_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  type VARCHAR(100),
  color VARCHAR(100),
  sku VARCHAR(100),
  cost_price NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
  price_regular NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (price_regular >= 0),
  price_gold NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (price_gold >= 0),
  price_vip NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (price_vip >= 0),
  stock_global INTEGER NOT NULL DEFAULT 0 CHECK (stock_global >= 0),
  min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.7. PRODUCT VARIANTS (Varian Softlens Spesifik: Minus, BC, DIA, Expired)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(100),
  variant_name VARCHAR(200) NOT NULL,
  power NUMERIC(4,2) DEFAULT 0.00, -- minus/plus
  diameter NUMERIC(4,2), -- e.g. 14.2, 14.5
  base_curve NUMERIC(4,2), -- e.g. 8.6
  color VARCHAR(50),
  expiry_date DATE,
  cost_price NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
  price_regular NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (price_regular >= 0),
  price_gold NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (price_gold >= 0),
  price_vip NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (price_vip >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.8. CUSTOMERS (Pelanggan, CRM, Riwayat Resep Mata)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  customer_level VARCHAR(20) NOT NULL DEFAULT 'REGULER' CHECK (customer_level IN ('REGULER', 'GOLD', 'VIP')),
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  total_spend NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (total_spend >= 0),
  prescription_notes JSONB DEFAULT '{"r_sphere": 0, "r_cyl": 0, "r_axis": 0, "l_sphere": 0, "l_cyl": 0, "l_axis": 0, "pd": 0}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.9. SUPPLIERS (Pemasok / Pabrik)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL UNIQUE,
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  address TEXT,
  total_debt NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (total_debt >= 0),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. KEUANGAN & KANTONG KAS
-- ==============================================================================

-- 6.1. CASH REGISTERS (Kantong Kas Toko)
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.2. CASH FLOWS (Buku Kas / Mutasi Arus Kas)
CREATE TABLE IF NOT EXISTS public.cash_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('IN', 'OUT')),
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  reference_table VARCHAR(50),
  reference_id UUID,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.3. SHIFT CLOSINGS (Rekonsiliasi Tutup Kasir)
CREATE TABLE IF NOT EXISTS public.shift_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES public.profiles(id),
  branch_id UUID REFERENCES public.branches(id),
  shift_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift_end TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  system_cash NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  actual_cash NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  difference NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PAS', 'LEBIH', 'KURANG')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. TRANSAKSI PENJUALAN (SALES & POS)
-- ==============================================================================

-- 7.1. SALES
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  receipt_number VARCHAR(50),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sales_channel VARCHAR(30) NOT NULL DEFAULT 'Toko' CHECK (sales_channel IN ('Toko', 'WhatsApp', 'Marketplace')),
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  discount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0), -- Total HPP riil
  payment_method VARCHAR(50) NOT NULL DEFAULT 'TUNAI',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PARTIAL', 'UNPAID')),
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'HOLD', 'CANCELLED')),
  idempotency_key VARCHAR(100) UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.2. SALE ITEMS (Snapshot Detail Produk saat Penjualan)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  price NUMERIC(15,2),
  price_at_sale NUMERIC(15,2) NOT NULL CHECK (price_at_sale >= 0),
  cost_at_sale NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (cost_at_sale >= 0), -- Snapshot HPP
  discount_item NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (discount_item >= 0),
  subtotal NUMERIC(15,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.3. SALE PAYMENTS (Pembayaran & Split Payment)
CREATE TABLE IF NOT EXISTS public.sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('TUNAI', 'TRANSFER', 'QRIS')),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  reference_number VARCHAR(100),
  cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.4. HELD SALES (Transaksi Ditahan / Pending Cart)
CREATE TABLE IF NOT EXISTS public.held_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  cashier_id UUID REFERENCES public.profiles(id),
  cart_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. PENGADAAN & PEMBELIAN (PURCHASES & PO)
-- ==============================================================================

-- 8.1. PURCHASES (PO Belanja Stok)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  invoice_number_supplier VARCHAR(100),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
  total_paid NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (total_paid >= 0),
  debt_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (debt_balance >= 0),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'LUNAS' CHECK (payment_status IN ('LUNAS', 'UTANG', 'PENDING')),
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('ORDERED', 'RECEIVED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.2. PURCHASE ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  cost_per_unit NUMERIC(15,2) NOT NULL CHECK (cost_per_unit >= 0),
  subtotal NUMERIC(15,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.3. PURCHASE PAYMENTS (Cicilan Pelunasan Utang PO)
CREATE TABLE IF NOT EXISTS public.purchase_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Transfer Bank',
  cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. RETUR & BARANG RUSAK
-- ==============================================================================

-- 9.1. RETURNS (Retur / Tukar Barang)
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(50) NOT NULL UNIQUE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  return_type VARCHAR(20) NOT NULL DEFAULT 'EXCHANGE' CHECK (return_type IN ('EXCHANGE', 'REFUND')),
  price_difference NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9.2. RETURN ITEMS
CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  returned_product_id UUID REFERENCES public.products(id),
  returned_variant_id UUID REFERENCES public.product_variants(id),
  qty_returned INTEGER NOT NULL CHECK (qty_returned > 0),
  reason VARCHAR(255) NOT NULL,
  destination VARCHAR(30) NOT NULL DEFAULT 'RESTOCKED' CHECK (destination IN ('RESTOCKED', 'DAMAGED')),
  exchange_product_id UUID REFERENCES public.products(id),
  exchange_variant_id UUID REFERENCES public.product_variants(id),
  qty_exchange INTEGER DEFAULT 0 CHECK (qty_exchange >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9.3. DAMAGED GOODS (Gudang Barang Bermasalah / Rusak / Expired)
CREATE TABLE IF NOT EXISTS public.damaged_goods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  code VARCHAR(100),
  name VARCHAR(200),
  category VARCHAR(100),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
  issue_description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLAIMED_SUPPLIER', 'DESTROYED')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. BUKU BESAR MUTASI STOK (IMMUTABLE LEDGER)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN (
    'INITIAL', 'SALE', 'SALE_CANCEL', 'PURCHASE', 'RETURN_IN', 'RETURN_EXCHANGE_OUT', 
    'ADJUSTMENT', 'DAMAGED_WRITE_OFF'
  )),
  qty_change INTEGER NOT NULL, -- Positif untuk masuk, Negatif untuk keluar
  qty_after INTEGER NOT NULL,
  reference_table VARCHAR(50),
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRIGGER UNTUK MENCEGAH EDIT ATAU HAPUS PADA LEDGER STOK (APPEND-ONLY)
CREATE OR REPLACE FUNCTION prevent_stock_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'TABEL STOCK_MOVEMENTS ADALAH BUKU BESAR MUTASI YANG TIDAK BISA DIUBAH ATAU DIHAPUS (APPEND-ONLY).';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_stock_movement_mutation ON public.stock_movements;
CREATE TRIGGER trg_prevent_stock_movement_mutation
BEFORE UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION prevent_stock_ledger_mutation();

-- 10.1. STOCK ADJUSTMENTS (Opname)
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  physical_qty INTEGER NOT NULL CHECK (physical_qty >= 0),
  system_qty INTEGER NOT NULL CHECK (system_qty >= 0),
  difference INTEGER NOT NULL,
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. PROMO, REWARD, APPROVAL, & AUDIT
-- ==============================================================================

-- 11.1. PROMOS
CREATE TABLE IF NOT EXISTS public.promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  promo_type VARCHAR(30) NOT NULL DEFAULT 'PERCENT' CHECK (promo_type IN ('PERCENT', 'FLAT', 'BUY_X_GET_Y', 'GROSIR')),
  target VARCHAR(150) DEFAULT 'Semua Softlens',
  period VARCHAR(100),
  discount_value NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  min_purchase NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'AKTIF' CHECK (status IN ('AKTIF', 'BERAKHIR')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11.2. REWARDS
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11.3. APPROVALS
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(30) NOT NULL CHECK (category IN ('PRICE_OVERRIDE', 'EXPENSE', 'CASH_DIFF', 'DAMAGED_WRITE_OFF')),
  title VARCHAR(200) NOT NULL,
  requester_id UUID REFERENCES public.profiles(id),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decided_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11.4. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  activity VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  data_before JSONB,
  data_after JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 12. INDEXING UNTUK PERFORMA TINGGI
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products (product_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.product_variants (sku);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON public.product_variants (barcode);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON public.sales (invoice_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_purchases_po ON public.purchases (po_number);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.stock_movements (variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_flows_register ON public.cash_flows (cash_register_id, created_at DESC);

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_updated_at ON public.sales;
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_purchases_updated_at ON public.purchases;
CREATE TRIGGER trg_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
