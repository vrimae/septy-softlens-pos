-- ==============================================================================
-- MIGRATION: 20261006100002_security_rls.sql
-- DESCRIPTION: Row Level Security (RLS) Policies & Function Grants
-- AUTHOR: Senior Backend Engineer
-- IDEMPOTENT: Yes
-- ==============================================================================

-- 1. HELPER FUNCTIONS UNTUK EVALUASI KEAMANAN
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'OWNER'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('OWNER', 'ADMIN')
  );
$$;

-- 2. AKTIFKAN RLS PADA SEMUA TABEL
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.held_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damaged_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. PERMISSIVE POLICIES UNTUK OPERASIONAL POS (Dengan Proteksi Role)

-- 3.1. PROFILES
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_owner" ON public.profiles;
CREATE POLICY "profiles_insert_owner" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
CREATE POLICY "profiles_update_owner" ON public.profiles FOR UPDATE USING (is_owner_or_admin() OR auth.uid() = id);

-- 3.2. STORE SETTINGS & BRANCHES
DROP POLICY IF EXISTS "settings_select" ON public.store_settings;
CREATE POLICY "settings_select" ON public.store_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings_modify" ON public.store_settings;
CREATE POLICY "settings_modify" ON public.store_settings FOR ALL USING (is_owner_or_admin()) WITH CHECK (is_owner_or_admin());

DROP POLICY IF EXISTS "branches_select" ON public.branches;
CREATE POLICY "branches_select" ON public.branches FOR SELECT USING (true);
DROP POLICY IF EXISTS "branches_modify" ON public.branches;
CREATE POLICY "branches_modify" ON public.branches FOR ALL USING (is_owner_or_admin()) WITH CHECK (is_owner_or_admin());

-- 3.3. MASTER PRODUK, KATEGORI, BRAND, VARIAN
DROP POLICY IF EXISTS "categories_all" ON public.categories;
CREATE POLICY "categories_all" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "brands_all" ON public.brands;
CREATE POLICY "brands_all" ON public.brands FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "products_all" ON public.products;
CREATE POLICY "products_all" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "variants_all" ON public.product_variants;
CREATE POLICY "variants_all" ON public.product_variants FOR ALL USING (true) WITH CHECK (true);

-- 3.4. CUSTOMERS & SUPPLIERS
DROP POLICY IF EXISTS "customers_all" ON public.customers;
CREATE POLICY "customers_all" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "suppliers_all" ON public.suppliers;
CREATE POLICY "suppliers_all" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- 3.5. SALES & DETAIL ITEMS
DROP POLICY IF EXISTS "sales_all" ON public.sales;
CREATE POLICY "sales_all" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sale_items_all" ON public.sale_items;
CREATE POLICY "sale_items_all" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sale_payments_all" ON public.sale_payments;
CREATE POLICY "sale_payments_all" ON public.sale_payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "held_sales_all" ON public.held_sales;
CREATE POLICY "held_sales_all" ON public.held_sales FOR ALL USING (true) WITH CHECK (true);

-- 3.6. PURCHASES & PO
DROP POLICY IF EXISTS "purchases_all" ON public.purchases;
CREATE POLICY "purchases_all" ON public.purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "purchase_items_all" ON public.purchase_items;
CREATE POLICY "purchase_items_all" ON public.purchase_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "purchase_payments_all" ON public.purchase_payments;
CREATE POLICY "purchase_payments_all" ON public.purchase_payments FOR ALL USING (true) WITH CHECK (true);

-- 3.7. RETURNS & BARANG RUSAK
DROP POLICY IF EXISTS "returns_all" ON public.returns;
CREATE POLICY "returns_all" ON public.returns FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "return_items_all" ON public.return_items;
CREATE POLICY "return_items_all" ON public.return_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "damaged_goods_all" ON public.damaged_goods;
CREATE POLICY "damaged_goods_all" ON public.damaged_goods FOR ALL USING (true) WITH CHECK (true);

-- 3.8. KEUANGAN & KAS
DROP POLICY IF EXISTS "cash_registers_all" ON public.cash_registers;
CREATE POLICY "cash_registers_all" ON public.cash_registers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "cash_flows_all" ON public.cash_flows;
CREATE POLICY "cash_flows_all" ON public.cash_flows FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shift_closings_all" ON public.shift_closings;
CREATE POLICY "shift_closings_all" ON public.shift_closings FOR ALL USING (true) WITH CHECK (true);

-- 3.9. LEDGER STOK & ADJUSTMENTS
DROP POLICY IF EXISTS "stock_movements_all" ON public.stock_movements;
CREATE POLICY "stock_movements_all" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stock_adjustments_all" ON public.stock_adjustments;
CREATE POLICY "stock_adjustments_all" ON public.stock_adjustments FOR ALL USING (true) WITH CHECK (true);

-- 3.10. PROMO, REWARD, APPROVAL, & AUDIT
DROP POLICY IF EXISTS "promos_all" ON public.promos;
CREATE POLICY "promos_all" ON public.promos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rewards_all" ON public.rewards;
CREATE POLICY "rewards_all" ON public.rewards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "approvals_all" ON public.approvals;
CREATE POLICY "approvals_all" ON public.approvals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_all" ON public.audit_logs;
CREATE POLICY "audit_logs_all" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 4. GRANT EXECUTE PADA SELURUH FUNGSI STORED PROCEDURES (RPC)
GRANT EXECUTE ON FUNCTION public.create_sale(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_sale(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.receive_purchase(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pay_purchase_debt(UUID, NUMERIC, TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_stock(UUID, INTEGER, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_cash_shift(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_owner_dashboard_metrics() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_comprehensive_report(TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_restock_recommendations() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_slow_moving_products(INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO anon, authenticated, service_role;
