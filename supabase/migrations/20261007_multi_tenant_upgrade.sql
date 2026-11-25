-- ==============================================================================
-- MIGRASI MULTI-TENANT (SaaS) - Revisi (Bypass Trigger Stock Movements)
-- Script ini akan menambahkan kolom `store_id` ke seluruh tabel operasional
-- dan menghubungkannya dengan tabel `store_settings` (sebagai Tenant Induk).
-- ==============================================================================

-- MATIKAN SEMENTARA TRIGGER MUTASI STOK AGAR BISA DI-UPDATE
ALTER TABLE public.stock_movements DISABLE TRIGGER trg_prevent_stock_movement_mutation;

-- 1. Ambil ID Toko Utama (Store pertama yang ada di database)
DO $$
DECLARE
  v_default_store_id UUID;
BEGIN
  -- Ambil ID Toko Utama
  SELECT id INTO v_default_store_id FROM public.store_settings LIMIT 1;

  -- Jika belum ada toko sama sekali, kita buat 1 toko default
  IF v_default_store_id IS NULL THEN
    v_default_store_id := gen_random_uuid();
    INSERT INTO public.store_settings (id, store_name) VALUES (v_default_store_id, 'Toko Utama');
  END IF;

  -- 2. Fungsi bantuan untuk menambahkan kolom `store_id` ke tabel jika belum ada
  -- dan mengisi data yang sudah ada dengan ID Toko Utama
  -- ==============================================================================
  DECLARE
    t_name TEXT;
    tables_list TEXT[] := ARRAY[
      'branches', 'profiles', 'categories', 'brands', 'products', 'product_variants', 
      'customers', 'suppliers', 'cash_registers', 'cash_flows', 'shift_closings', 
      'sales', 'sale_items', 'sale_payments', 'held_sales', 'purchases', 
      'purchase_items', 'purchase_payments', 'returns', 'return_items', 
      'damaged_goods', 'stock_movements', 'stock_adjustments', 'promos', 
      'rewards', 'approvals', 'audit_logs'
    ];
  BEGIN
    FOREACH t_name IN ARRAY tables_list
    LOOP
      -- Cek apakah kolom sudah ada
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'store_id'
      ) THEN
        -- Tambahkan kolom, set nilai default ke toko utama, lalu jadikan NOT NULL, dan pasang Foreign Key
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN store_id UUID REFERENCES public.store_settings(id) ON DELETE CASCADE', t_name);
        EXECUTE format('UPDATE public.%I SET store_id = %L WHERE store_id IS NULL', t_name, v_default_store_id);
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN store_id SET NOT NULL', t_name);
      END IF;
    END LOOP;
  END;
END $$;

-- AKTIFKAN KEMBALI TRIGGER MUTASI STOK
ALTER TABLE public.stock_movements ENABLE TRIGGER trg_prevent_stock_movement_mutation;

-- 3. PERBAIKAN UNIQUE CONSTRAINTS
-- Sebelumnya product_code unik secara global, sekarang hanya unik di dalam 1 toko
-- Hapus constraint lama
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_name_key;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_name_key;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_product_code_key;
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_sku_key;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_key;
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_name_key;
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_invoice_number_key;
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_po_number_key;

-- Buat constraint baru (Unik per store_id)
ALTER TABLE public.branches ADD CONSTRAINT branches_store_name_key UNIQUE (store_id, name);
ALTER TABLE public.categories ADD CONSTRAINT categories_store_name_key UNIQUE (store_id, name);
ALTER TABLE public.brands ADD CONSTRAINT brands_store_name_key UNIQUE (store_id, name);
ALTER TABLE public.products ADD CONSTRAINT products_store_code_key UNIQUE (store_id, product_code);
ALTER TABLE public.product_variants ADD CONSTRAINT variants_store_sku_key UNIQUE (store_id, sku);
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_store_name_key UNIQUE (store_id, name);
ALTER TABLE public.sales ADD CONSTRAINT sales_store_invoice_key UNIQUE (store_id, invoice_number);
ALTER TABLE public.purchases ADD CONSTRAINT purchases_store_po_key UNIQUE (store_id, po_number);

-- 4. UBAH FUNGSI TRANSAKSI (CREATE_SALE) AGAR MENDUKUNG MULTI-TENANT
-- ==============================================================================
DROP FUNCTION IF EXISTS public.create_sale(JSONB);

CREATE OR REPLACE FUNCTION public.create_sale(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_id UUID;
  v_idempotency_key TEXT;
  v_existing_sale JSONB;
  v_invoice_number TEXT;
  v_sale_id UUID;
  v_branch_id UUID;
  v_customer_id UUID;
  v_cashier_id UUID;
  v_sales_channel TEXT;
  v_notes TEXT;
  
  v_item JSONB;
  v_variant_id UUID;
  v_product_id UUID;
  v_qty INTEGER;
  v_current_stock INTEGER;
  v_cost_price NUMERIC(15,2);
  v_sell_price NUMERIC(15,2);
  v_item_subtotal NUMERIC(15,2);
  v_calculated_subtotal NUMERIC(15,2) := 0.00;
  v_total_cost NUMERIC(15,2) := 0.00;
  
  v_discount_amount NUMERIC(15,2);
  v_tax_amount NUMERIC(15,2) := 0.00;
  v_total_amount NUMERIC(15,2);
  
  v_payments JSONB;
  v_payment JSONB;
  v_pay_method TEXT;
  v_pay_amount NUMERIC(15,2);
  v_total_paid NUMERIC(15,2) := 0.00;
BEGIN
  -- Ambil Store ID dari payload, atau fallback dari profile
  v_store_id := (p_payload->>'store_id')::UUID;
  v_cashier_id := COALESCE((p_payload->>'cashier_id')::UUID, auth.uid());
  
  IF v_store_id IS NULL THEN
     SELECT store_id INTO v_store_id FROM public.profiles WHERE id = v_cashier_id;
  END IF;

  -- 1. CEK IDEMPOTENCY KEY
  v_idempotency_key := p_payload->>'idempotency_key';
  IF v_idempotency_key IS NOT NULL AND v_idempotency_key <> '' THEN
    SELECT jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'sale_id', id,
      'invoice_number', invoice_number,
      'total_amount', total_amount,
      'created_at', created_at
    ) INTO v_existing_sale
    FROM public.sales
    WHERE idempotency_key = v_idempotency_key AND store_id = v_store_id;

    IF v_existing_sale IS NOT NULL THEN
      RETURN v_existing_sale;
    END IF;
  END IF;

  -- 2. EKSTRAKSI PARAMETER
  v_branch_id := (p_payload->>'branch_id')::UUID;
  v_customer_id := (p_payload->>'customer_id')::UUID;
  v_sales_channel := COALESCE(p_payload->>'sales_channel', 'Toko');
  v_notes := p_payload->>'notes';
  v_discount_amount := COALESCE((p_payload->>'discount_amount')::NUMERIC, 0.00);

  IF jsonb_array_length(p_payload->'items') = 0 THEN
    RAISE EXCEPTION 'KERANJANG_KOSONG: Transaksi harus memiliki minimal satu barang.';
  END IF;

  -- 3. VALIDASI DAN LOCKING STOK (FOR UPDATE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_qty := (v_item->>'qty')::INTEGER;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'QTY_TIDAK_VALID: Jumlah barang harus lebih dari 0.';
    END IF;

    -- Kunci baris dengan FOR UPDATE agar race condition dua kasir aman
    SELECT product_id, stock, cost_price, price_regular
    INTO v_product_id, v_current_stock, v_cost_price, v_sell_price
    FROM public.product_variants
    WHERE id = v_variant_id AND store_id = v_store_id
    FOR UPDATE;

    IF NOT FOUND THEN
      SELECT id, stock_global, cost_price, price_regular
      INTO v_product_id, v_current_stock, v_cost_price, v_sell_price
      FROM public.products
      WHERE id = v_variant_id AND store_id = v_store_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'BARANG_TIDAK_DITEMUKAN: Barang dengan ID % tidak ditemukan di sistem.', v_variant_id;
      END IF;
    END IF;

    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION 'STOK_TIDAK_CUKUP: Stok barang tidak mencukupi (Tersisa: %, Diminta: %).', v_current_stock, v_qty;
    END IF;

    IF (v_item->>'price_at_sale') IS NOT NULL AND (v_item->>'price_at_sale')::NUMERIC > 0 THEN
      v_sell_price := (v_item->>'price_at_sale')::NUMERIC;
    END IF;

    v_item_subtotal := v_sell_price * v_qty;
    v_calculated_subtotal := v_calculated_subtotal + v_item_subtotal;
    v_total_cost := v_total_cost + (v_cost_price * v_qty);
  END LOOP;

  -- 4. HITUNG TOTAL AKHIR
  v_total_amount := GREATEST(0.00, v_calculated_subtotal - v_discount_amount + v_tax_amount);

  -- 5. VALIDASI PEMBAYARAN
  v_payments := p_payload->'payments';
  IF v_payments IS NULL OR jsonb_array_length(v_payments) = 0 THEN
    v_pay_amount := COALESCE((p_payload->>'pay_amount')::NUMERIC, v_total_amount);
    v_pay_method := COALESCE(p_payload->>'payment_method', 'TUNAI');
    v_total_paid := v_pay_amount;
  ELSE
    FOR v_payment IN SELECT * FROM jsonb_array_elements(v_payments)
    LOOP
      v_pay_amount := (v_payment->>'amount')::NUMERIC;
      v_total_paid := v_total_paid + v_pay_amount;
    END LOOP;
  END IF;

  IF v_total_paid < v_total_amount THEN
    RAISE EXCEPTION 'PEMBAYARAN_KURANG: Total pembayaran (Rp %) kurang dari total belanja (Rp %).', v_total_paid, v_total_amount;
  END IF;

  -- 6. GENERATE NOMOR INVOICE & INSERT KE SALES
  v_invoice_number := generate_invoice_number();
  v_sale_id := gen_random_uuid();

  INSERT INTO public.sales (
    id, store_id, invoice_number, receipt_number, branch_id, customer_id, cashier_id,
    sales_channel, subtotal, discount, discount_amount, tax_amount,
    total_amount, total_cost, payment_method, payment_status,
    status, idempotency_key, notes, created_at
  ) VALUES (
    v_sale_id, v_store_id, v_invoice_number, v_invoice_number, v_branch_id, v_customer_id, v_cashier_id,
    v_sales_channel, v_calculated_subtotal, v_discount_amount, v_discount_amount, v_tax_amount,
    v_total_amount, v_total_cost, 
    CASE WHEN v_payments IS NOT NULL AND jsonb_array_length(v_payments) > 1 THEN 'SPLIT' ELSE COALESCE(v_pay_method, 'TUNAI') END,
    'PAID', 'COMPLETED', v_idempotency_key, v_notes, NOW()
  );

  -- 7. INSERT DETAIL ITEM, POTONG STOK, & CATAT MUTASI
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_qty := (v_item->>'qty')::INTEGER;

    SELECT product_id, stock, cost_price, price_regular
    INTO v_product_id, v_current_stock, v_cost_price, v_sell_price
    FROM public.product_variants
    WHERE id = v_variant_id AND store_id = v_store_id;

    IF NOT FOUND THEN
      SELECT id, stock_global, cost_price, price_regular
      INTO v_product_id, v_current_stock, v_cost_price, v_sell_price
      FROM public.products
      WHERE id = v_variant_id AND store_id = v_store_id;
    END IF;

    IF (v_item->>'price_at_sale') IS NOT NULL AND (v_item->>'price_at_sale')::NUMERIC > 0 THEN
      v_sell_price := (v_item->>'price_at_sale')::NUMERIC;
    END IF;
    v_item_subtotal := v_sell_price * v_qty;

    INSERT INTO public.sale_items (
      sale_id, store_id, product_id, variant_id, qty, price,
      price_at_sale, cost_at_sale, discount_item, subtotal
    ) VALUES (
      v_sale_id, v_store_id, v_product_id, v_variant_id, v_qty, v_sell_price,
      v_sell_price, v_cost_price, 0.00, v_item_subtotal
    );

    UPDATE public.product_variants
    SET stock = stock - v_qty
    WHERE id = v_variant_id AND store_id = v_store_id;

    UPDATE public.products
    SET stock_global = GREATEST(0, stock_global - v_qty)
    WHERE id = v_product_id AND store_id = v_store_id;

    INSERT INTO public.stock_movements (
      store_id, product_id, variant_id, movement_type, qty_change,
      qty_after, reference_table, reference_id, notes, created_by
    ) VALUES (
      v_store_id, v_product_id, v_variant_id, 'SALE', -v_qty,
      (v_current_stock - v_qty), 'sales', v_sale_id,
      'Penjualan kasir Struk ' || v_invoice_number, v_cashier_id
    );
  END LOOP;

  -- KEMBALIKAN HASIL TRANSAKSI
  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'invoice_number', v_invoice_number,
    'subtotal', v_calculated_subtotal,
    'discount_amount', v_discount_amount,
    'total_amount', v_total_amount,
    'payment_method', COALESCE(v_pay_method, 'SPLIT'),
    'change_amount', GREATEST(0, v_total_paid - v_total_amount),
    'created_at', NOW()
  );
END;
$$;

-- 5. ROW LEVEL SECURITY (RLS) UNTUK ISOLASI SAAS
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_current_store_id() RETURNS UUID AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DO $$
DECLARE
  t_name TEXT;
  tables_list TEXT[] := ARRAY[
    'branches', 'profiles', 'categories', 'brands', 'products', 'product_variants', 
    'customers', 'suppliers', 'cash_registers', 'cash_flows', 'shift_closings', 
    'sales', 'sale_items', 'sale_payments', 'held_sales', 'purchases', 
    'purchase_items', 'purchase_payments', 'returns', 'return_items', 
    'damaged_goods', 'stock_movements', 'stock_adjustments', 'promos', 
    'rewards', 'approvals', 'audit_logs'
  ];
BEGIN
  FOREACH t_name IN ARRAY tables_list
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.%I', t_name);
    EXCEPTION WHEN OTHERS THEN END;
    EXECUTE format('
      CREATE POLICY "tenant_isolation_policy" ON public.%I 
      FOR ALL 
      USING (store_id = get_current_store_id())
      WITH CHECK (store_id = get_current_store_id())', t_name);
  END LOOP;
END $$;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.store_settings;
CREATE POLICY "tenant_isolation_policy" ON public.store_settings
FOR ALL USING (id = get_current_store_id()) WITH CHECK (id = get_current_store_id());

-- 6. FUNGSI REGISTRASI TOKO BARU (SaaS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.register_new_tenant(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_store_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_store_id UUID;
BEGIN
  v_new_store_id := gen_random_uuid();
  
  INSERT INTO public.store_settings (id, store_name)
  VALUES (v_new_store_id, p_store_name);
  
  INSERT INTO public.profiles (id, email, full_name, role, status, store_id)
  VALUES (p_user_id, p_email, p_full_name, 'OWNER', 'ACTIVE', v_new_store_id);

  INSERT INTO public.branches (store_id, name, is_active)
  VALUES (v_new_store_id, 'Cabang Pusat', true);
  
  RETURN v_new_store_id;
END;
$$;

-- 7. SET DEFAULT VALUE UNTUK STORE_ID AGAR FRONTEND TIDAK PERLU DIUBAH
-- ==============================================================================
DO $$
DECLARE
  t_name TEXT;
  tables_list TEXT[] := ARRAY[
    'branches', 'profiles', 'categories', 'brands', 'products', 'product_variants', 
    'customers', 'suppliers', 'cash_registers', 'cash_flows', 'shift_closings', 
    'sales', 'sale_items', 'sale_payments', 'held_sales', 'purchases', 
    'purchase_items', 'purchase_payments', 'returns', 'return_items', 
    'damaged_goods', 'stock_movements', 'stock_adjustments', 'promos', 
    'rewards', 'approvals', 'audit_logs'
  ];
BEGIN
  FOREACH t_name IN ARRAY tables_list
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN store_id SET DEFAULT get_current_store_id()', t_name);
  END LOOP;
END $$;
