DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_current_store_id() RETURNS UUID AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE POLICY "categories_tenant_isolation" ON public.categories FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "brands_tenant_isolation" ON public.brands FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "products_tenant_isolation" ON public.products FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "product_variants_tenant_isolation" ON public.product_variants FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "customers_tenant_isolation" ON public.customers FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "suppliers_tenant_isolation" ON public.suppliers FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "sales_tenant_isolation" ON public.sales FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "sale_items_tenant_isolation" ON public.sale_items FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "sale_payments_tenant_isolation" ON public.sale_payments FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "held_sales_tenant_isolation" ON public.held_sales FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "purchases_tenant_isolation" ON public.purchases FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "purchase_items_tenant_isolation" ON public.purchase_items FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "purchase_payments_tenant_isolation" ON public.purchase_payments FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "returns_tenant_isolation" ON public.returns FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "return_items_tenant_isolation" ON public.return_items FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "damaged_goods_tenant_isolation" ON public.damaged_goods FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "cash_registers_tenant_isolation" ON public.cash_registers FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "cash_flows_tenant_isolation" ON public.cash_flows FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "shift_closings_tenant_isolation" ON public.shift_closings FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "promos_tenant_isolation" ON public.promos FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "rewards_tenant_isolation" ON public.rewards FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "approvals_tenant_isolation" ON public.approvals FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "audit_logs_tenant_isolation" ON public.audit_logs FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "stock_movements_tenant_isolation" ON public.stock_movements FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());
CREATE POLICY "stock_adjustments_tenant_isolation" ON public.stock_adjustments FOR ALL USING (store_id = public.get_current_store_id()) WITH CHECK (store_id = public.get_current_store_id());

CREATE POLICY "store_settings_tenant_isolation" ON public.store_settings FOR ALL USING (id = public.get_current_store_id());
CREATE POLICY "branches_tenant_isolation" ON public.branches FOR ALL USING (store_id = public.get_current_store_id());
CREATE POLICY "profiles_tenant_isolation" ON public.profiles FOR ALL USING (store_id = public.get_current_store_id());


-- Pastikan fungsi dashboard tunduk pada RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_dashboard_stats') THEN
    ALTER FUNCTION public.get_dashboard_stats SECURITY INVOKER;
  END IF;
END $$;

