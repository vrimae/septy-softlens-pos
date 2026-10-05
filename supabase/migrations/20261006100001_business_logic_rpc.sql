-- ==============================================================================
-- MIGRATION: 20261006100001_business_logic_rpc.sql
-- DESCRIPTION: Atomic PL/pgSQL Business Logic & Stored Procedures
-- AUTHOR: Senior Backend Engineer
-- IDEMPOTENT: Yes
-- ==============================================================================

-- 1. HELPER: CURRENT USER ROLE
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'KASIR'
  );
$$;

-- ==============================================================================
-- 2. TRANSAKSI PENJUALAN KASIR (create_sale)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_sale(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
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
  
  v_cash_register_id UUID;
  v_points_earned INTEGER := 0;
  v_point_multiplier NUMERIC(15,2);
BEGIN
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
    WHERE idempotency_key = v_idempotency_key;

    IF v_existing_sale IS NOT NULL THEN
      RETURN v_existing_sale;
    END IF;
  END IF;

  -- 2. EKSTRAKSI PARAMETER
  v_branch_id := (p_payload->>'branch_id')::UUID;
  v_customer_id := (p_payload->>'customer_id')::UUID;
  v_cashier_id := COALESCE((p_payload->>'cashier_id')::UUID, auth.uid());
  v_sales_channel := COALESCE(p_payload->>'sales_channel', 'Toko');
  v_notes := p_payload->>'notes';
  v_discount_amount := COALESCE((p_payload->>'discount_amount')::NUMERIC, 0.00);

  IF jsonb_array_length(p_payload->'items') = 0 THEN
    RAISE EXCEPTION 'KERANJANG_KOSONG: Transaksi harus memiliki minimal satu barang.';
  END IF;

  -- 3. VALIDASI DAN LOCKING STOK (FOR UPDATE)
  -- Loop pertama: Validasi stok dan kalkulasi HPP + Subtotal di Server
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
    WHERE id = v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      -- Cek fallback ke tabel products langsung jika transaksi menggunakan product_id
      SELECT id, stock_global, cost_price, price_regular
      INTO v_product_id, v_current_stock, v_cost_price, v_sell_price
      FROM public.products
      WHERE id = v_variant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'BARANG_TIDAK_DITEMUKAN: Barang dengan ID % tidak ditemukan di sistem.', v_variant_id;
      END IF;
    END IF;

    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION 'STOK_TIDAK_CUKUP: Stok barang tidak mencukupi (Tersisa: %, Diminta: %).', v_current_stock, v_qty;
    END IF;

    -- Izinkan harga kustom jika dikirim dan store_settings mengizinkan
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
    -- Fallback jika payload pembayaran dikirim dalam bentuk single method
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
    id, invoice_number, receipt_number, branch_id, customer_id, cashier_id,
    sales_channel, subtotal, discount, discount_amount, tax_amount,
    total_amount, total_cost, payment_method, payment_status,
    status, idempotency_key, notes, created_at
  ) VALUES (
    v_sale_id, v_invoice_number, v_invoice_number, v_branch_id, v_customer_id, v_cashier_id,
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
    WHERE id = v_variant_id;

    IF NOT FOUND THEN
      SELECT id, stock_global, cost_price, price_regular
      INTO v_product_id, v_current_stock, v_cost_price, v_sell_price
      FROM public.products
      WHERE id = v_variant_id;
    END IF;

    IF (v_item->>'price_at_sale') IS NOT NULL AND (v_item->>'price_at_sale')::NUMERIC > 0 THEN
      v_sell_price := (v_item->>'price_at_sale')::NUMERIC;
    END IF;
    v_item_subtotal := v_sell_price * v_qty;

    -- Simpan item dengan snapshot HPP
    INSERT INTO public.sale_items (
      sale_id, product_id, variant_id, qty, price,
      price_at_sale, cost_at_sale, discount_item, subtotal
    ) VALUES (
      v_sale_id, v_product_id, v_variant_id, v_qty, v_sell_price,
      v_sell_price, v_cost_price, 0.00, v_item_subtotal
    );

    -- Kurangi stok di varian dan produk
    UPDATE public.product_variants
    SET stock = stock - v_qty
    WHERE id = v_variant_id;

    UPDATE public.products
    SET stock_global = GREATEST(0, stock_global - v_qty)
    WHERE id = v_product_id;

    -- Catat ke Ledger Pergerakan Stok
    INSERT INTO public.stock_movements (
      product_id, variant_id, movement_type, qty_change,
      qty_after, reference_table, reference_id, notes, created_by
    ) VALUES (
      v_product_id, v_variant_id, 'SALE', -v_qty,
      (v_current_stock - v_qty), 'sales', v_sale_id,
      'Penjualan kasir Struk ' || v_invoice_number, v_cashier_id
    );
  END LOOP;

  -- 8. SIMPAN PEMBAYARAN & CATAT ARUS KAS
  -- Cari kantong kas default jika tidak ditentukan
  SELECT id INTO v_cash_register_id FROM public.cash_registers WHERE is_active = true ORDER BY created_at LIMIT 1;

  IF v_payments IS NOT NULL AND jsonb_array_length(v_payments) > 0 THEN
    FOR v_payment IN SELECT * FROM jsonb_array_elements(v_payments)
    LOOP
      v_pay_method := v_payment->>'payment_method';
      v_pay_amount := (v_payment->>'amount')::NUMERIC;

      INSERT INTO public.sale_payments (
        sale_id, payment_method, amount, reference_number, cash_register_id
      ) VALUES (
        v_sale_id, v_pay_method, v_pay_amount, v_payment->>'reference_number', v_cash_register_id
      );

      IF v_cash_register_id IS NOT NULL AND v_pay_amount > 0 THEN
        UPDATE public.cash_registers SET balance = balance + v_pay_amount WHERE id = v_cash_register_id;
        INSERT INTO public.cash_flows (
          cash_register_id, flow_type, category, amount,
          reference_table, reference_id, description, created_by
        ) VALUES (
          v_cash_register_id, 'IN', 'PENJUALAN ' || v_pay_method, v_pay_amount,
          'sales', v_sale_id, 'Penjualan No: ' || v_invoice_number, v_cashier_id
        );
      END IF;
    END LOOP;
  ELSE
    INSERT INTO public.sale_payments (
      sale_id, payment_method, amount, cash_register_id
    ) VALUES (
      v_sale_id, v_pay_method, v_total_amount, v_cash_register_id
    );

    IF v_cash_register_id IS NOT NULL AND v_total_amount > 0 THEN
      UPDATE public.cash_registers SET balance = balance + v_total_amount WHERE id = v_cash_register_id;
      INSERT INTO public.cash_flows (
        cash_register_id, flow_type, category, amount,
        reference_table, reference_id, description, created_by
      ) VALUES (
        v_cash_register_id, 'IN', 'PENJUALAN ' || v_pay_method, v_total_amount,
        'sales', v_sale_id, 'Penjualan No: ' || v_invoice_number, v_cashier_id
      );
    END IF;
  END IF;

  -- 9. AKUMULASI CRM PELANGGAN & POIN
  IF v_customer_id IS NOT NULL THEN
    v_point_multiplier := 10000.00;
    v_points_earned := FLOOR(v_total_amount / v_point_multiplier)::INTEGER;

    UPDATE public.customers
    SET total_spend = total_spend + v_total_amount,
        points = points + v_points_earned
    WHERE id = v_customer_id;
  END IF;

  -- 10. RETURN HASIL STRUK LENGKAP
  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'invoice_number', v_invoice_number,
    'subtotal', v_calculated_subtotal,
    'discount', v_discount_amount,
    'total_amount', v_total_amount,
    'total_paid', v_total_paid,
    'change_amount', (v_total_paid - v_total_amount),
    'points_earned', v_points_earned,
    'created_at', NOW()
  );
END;
$$;

-- ==============================================================================
-- 3. PEMBATALAN TRANSAKSI PENJUALAN (cancel_sale)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cancel_sale(p_sale_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
  v_payment RECORD;
  v_user_role TEXT;
BEGIN
  v_user_role := current_user_role();
  IF v_user_role NOT IN ('OWNER', 'ADMIN') THEN
    RAISE EXCEPTION 'TIDAK_BERHAK: Hanya Owner atau Admin yang diizinkan membatalkan transaksi penjualan.';
  END IF;

  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSAKSI_TIDAK_DITEMUKAN: Penjualan tidak ditemukan.';
  END IF;

  IF v_sale.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'SUDAH_DIBATALKAN: Transaksi ini sudah pernah dibatalkan.';
  END IF;

  -- 1. Kembalikan stok untuk setiap item
  FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    IF v_item.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET stock = stock + v_item.qty WHERE id = v_item.variant_id;
    END IF;
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products SET stock_global = stock_global + v_item.qty WHERE id = v_item.product_id;
    END IF;

    -- Catat Ledger Pembalikan Stok
    INSERT INTO public.stock_movements (
      product_id, variant_id, movement_type, qty_change,
      qty_after, reference_table, reference_id, notes, created_by
    ) VALUES (
      v_item.product_id, v_item.variant_id, 'SALE_CANCEL', v_item.qty,
      (SELECT COALESCE(stock, 0) FROM public.product_variants WHERE id = v_item.variant_id),
      'sales', p_sale_id, 'Pembatalan transaksi Struk ' || v_sale.invoice_number || ': ' || p_reason,
      auth.uid()
    );
  END LOOP;

  -- 2. Kembalikan kas keluar (reversal)
  FOR v_payment IN SELECT * FROM public.sale_payments WHERE sale_id = p_sale_id
  LOOP
    IF v_payment.cash_register_id IS NOT NULL THEN
      UPDATE public.cash_registers SET balance = balance - v_payment.amount WHERE id = v_payment.cash_register_id;
      INSERT INTO public.cash_flows (
        cash_register_id, flow_type, category, amount,
        reference_table, reference_id, description, created_by
      ) VALUES (
        v_payment.cash_register_id, 'OUT', 'BATAL PENJUALAN', v_payment.amount,
        'sales', p_sale_id, 'Pembatalan struk ' || v_sale.invoice_number || ': ' || p_reason, auth.uid()
      );
    END IF;
  END LOOP;

  -- 3. Kurangi total spend customer jika ada
  IF v_sale.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET total_spend = GREATEST(0.00, total_spend - v_sale.total_amount),
        points = GREATEST(0, points - FLOOR(v_sale.total_amount / 10000.00)::INTEGER)
    WHERE id = v_sale.customer_id;
  END IF;

  -- 4. Update status sale
  UPDATE public.sales
  SET status = 'CANCELLED', notes = COALESCE(notes, '') || ' [DIBATALKAN: ' || p_reason || ']'
  WHERE id = p_sale_id;

  -- 5. Catat audit
  INSERT INTO public.audit_logs (
    user_id, activity, table_name, record_id, reason
  ) VALUES (
    auth.uid(), 'CANCEL_SALE', 'sales', p_sale_id, p_reason
  );

  RETURN jsonb_build_object('success', true, 'message', 'Transaksi berhasil dibatalkan dan stok telah dikembalikan.');
END;
$$;

-- ==============================================================================
-- 4. PENGADAAN & PENERIMAAN PEMBELIAN (receive_purchase)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.receive_purchase(p_purchase_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_po RECORD;
  v_item RECORD;
  v_old_stock INTEGER;
  v_old_cost NUMERIC(15,2);
  v_new_cost NUMERIC(15,2);
  v_cost_method TEXT;
BEGIN
  SELECT * INTO v_po FROM public.purchases WHERE id = p_purchase_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO_TIDAK_DITEMUKAN: Surat pesanan pembelian tidak ditemukan.';
  END IF;

  IF v_po.status = 'RECEIVED' THEN
    RAISE EXCEPTION 'PO_SUDAH_DITERIMA: PO ini sudah pernah diterima sebelumnya.';
  END IF;

  SELECT inventory_cost_method INTO v_cost_method FROM public.store_settings LIMIT 1;
  v_cost_method := COALESCE(v_cost_method, 'WEIGHTED_AVG');

  FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id
  LOOP
    SELECT stock, cost_price INTO v_old_stock, v_old_cost
    FROM public.product_variants WHERE id = v_item.variant_id;

    IF NOT FOUND THEN
      SELECT stock_global, cost_price INTO v_old_stock, v_old_cost
      FROM public.products WHERE id = v_item.product_id;
    END IF;

    v_old_stock := COALESCE(v_old_stock, 0);
    v_old_cost := COALESCE(v_old_cost, 0.00);

    -- Kalkulasi HPP Baru (Weighted Average)
    IF v_cost_method = 'WEIGHTED_AVG' AND (v_old_stock + v_item.qty) > 0 THEN
      v_new_cost := ((v_old_stock * v_old_cost) + (v_item.qty * v_item.cost_per_unit)) / (v_old_stock + v_item.qty);
    ELSE
      v_new_cost := v_item.cost_per_unit;
    END IF;

    -- Update varian
    IF v_item.variant_id IS NOT NULL THEN
      UPDATE public.product_variants
      SET stock = stock + v_item.qty, cost_price = v_new_cost
      WHERE id = v_item.variant_id;
    END IF;

    -- Update produk global
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock_global = stock_global + v_item.qty, cost_price = v_new_cost
      WHERE id = v_item.product_id;
    END IF;

    -- Catat Ledger Stok Masuk
    INSERT INTO public.stock_movements (
      product_id, variant_id, movement_type, qty_change,
      qty_after, reference_table, reference_id, notes, created_by
    ) VALUES (
      v_item.product_id, v_item.variant_id, 'PURCHASE', v_item.qty,
      (v_old_stock + v_item.qty), 'purchases', p_purchase_id,
      'Penerimaan stok dari PO ' || v_po.po_number, auth.uid()
    );
  END LOOP;

  -- Update utang supplier jika status belum lunas
  IF v_po.payment_status = 'UTANG' AND v_po.debt_balance > 0 THEN
    UPDATE public.suppliers
    SET total_debt = total_debt + v_po.debt_balance
    WHERE id = v_po.supplier_id;
  END IF;

  UPDATE public.purchases SET status = 'RECEIVED' WHERE id = p_purchase_id;

  RETURN jsonb_build_object('success', true, 'message', 'Stok PO berhasil diterima dan HPP telah disesuaikan.');
END;
$$;

-- ==============================================================================
-- 5. CICILAN UTANG SUPPLIER (pay_purchase_debt)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.pay_purchase_debt(
  p_purchase_id UUID,
  p_amount NUMERIC(15,2),
  p_payment_method TEXT DEFAULT 'Transfer Bank',
  p_cash_register_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_po RECORD;
  v_reg_id UUID;
  v_new_debt NUMERIC(15,2);
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'NOMINAL_TIDAK_VALID: Nominal pembayaran cicilan harus lebih dari 0.';
  END IF;

  SELECT * INTO v_po FROM public.purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO_TIDAK_DITEMUKAN: Tagihan pembelian tidak ditemukan.';
  END IF;

  IF v_po.debt_balance <= 0 THEN
    RAISE EXCEPTION 'SUDAH_LUNAS: Tagihan PO ini sudah lunas.';
  END IF;

  v_new_debt := GREATEST(0.00, v_po.debt_balance - p_amount);
  v_reg_id := p_cash_register_id;
  IF v_reg_id IS NULL THEN
    SELECT id INTO v_reg_id FROM public.cash_registers WHERE is_active = true ORDER BY created_at LIMIT 1;
  END IF;

  -- Insert riwayat cicilan
  INSERT INTO public.purchase_payments (
    purchase_id, amount, payment_method, cash_register_id, notes
  ) VALUES (
    p_purchase_id, p_amount, p_payment_method, v_reg_id, 'Cicilan utang PO ' || v_po.po_number
  );

  -- Update saldo kas keluar
  IF v_reg_id IS NOT NULL THEN
    UPDATE public.cash_registers SET balance = balance - p_amount WHERE id = v_reg_id;
    INSERT INTO public.cash_flows (
      cash_register_id, flow_type, category, amount,
      reference_table, reference_id, description, created_by
    ) VALUES (
      v_reg_id, 'OUT', 'BAYAR UTANG SUPPLIER', p_amount,
      'purchases', p_purchase_id, 'Pelunasan PO ' || v_po.po_number, auth.uid()
    );
  END IF;

  -- Update saldo utang supplier & PO
  UPDATE public.suppliers
  SET total_debt = GREATEST(0.00, total_debt - p_amount)
  WHERE id = v_po.supplier_id;

  UPDATE public.purchases
  SET total_paid = total_paid + p_amount,
      debt_balance = v_new_debt,
      payment_status = CASE WHEN v_new_debt = 0 THEN 'LUNAS' ELSE 'UTANG' END
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cicilan berhasil dibayar.',
    'sisa_utang', v_new_debt
  );
END;
$$;

-- ==============================================================================
-- 6. STOCK OPNAME / PENYESUAIAN STOK (adjust_stock)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_variant_id UUID,
  p_physical_qty INTEGER,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_system_qty INTEGER;
  v_diff INTEGER;
  v_product_id UUID;
BEGIN
  IF current_user_role() NOT IN ('OWNER', 'ADMIN') THEN
    RAISE EXCEPTION 'TIDAK_BERHAK: Hanya Owner dan Admin yang berwenang melakukan Stock Opname.';
  END IF;

  SELECT product_id, stock INTO v_product_id, v_system_qty
  FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;

  IF NOT FOUND THEN
    SELECT id, stock_global INTO v_product_id, v_system_qty
    FROM public.products WHERE id = p_variant_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'BARANG_TIDAK_DITEMUKAN: Varian barang tidak ditemukan.';
    END IF;
  END IF;

  v_diff := p_physical_qty - v_system_qty;

  -- Update stok fisik
  UPDATE public.product_variants SET stock = p_physical_qty WHERE id = p_variant_id;
  UPDATE public.products SET stock_global = stock_global + v_diff WHERE id = v_product_id;

  -- Catat log opname
  INSERT INTO public.stock_adjustments (
    product_id, variant_id, physical_qty, system_qty, difference, reason, approved_by
  ) VALUES (
    v_product_id, p_variant_id, p_physical_qty, v_system_qty, v_diff, p_reason, auth.uid()
  );

  -- Catat ledger
  INSERT INTO public.stock_movements (
    product_id, variant_id, movement_type, qty_change,
    qty_after, reference_table, notes, created_by
  ) VALUES (
    v_product_id, p_variant_id, 'ADJUSTMENT', v_diff,
    p_physical_qty, 'stock_adjustments', 'Stock Opname: ' || p_reason, auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'selisih', v_diff,
    'stok_sekarang', p_physical_qty
  );
END;
$$;

-- ==============================================================================
-- 7. REKONSILIASI TUTUP SHIFT KASIR (close_cash_shift)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.close_cash_shift(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cashier_id UUID;
  v_actual_cash NUMERIC(15,2);
  v_notes TEXT;
  v_system_cash NUMERIC(15,2);
  v_diff NUMERIC(15,2);
  v_status TEXT;
  v_shift_id UUID;
BEGIN
  v_cashier_id := COALESCE((p_payload->>'cashier_id')::UUID, auth.uid());
  v_actual_cash := (p_payload->>'actual_cash')::NUMERIC;
  v_notes := p_payload->>'notes';

  -- Hitung saldo tunai yang masuk dari penjualan hari ini
  SELECT COALESCE(SUM(sp.amount), 0.00)
  INTO v_system_cash
  FROM public.sale_payments sp
  JOIN public.sales s ON s.id = sp.sale_id
  WHERE sp.payment_method = 'TUNAI'
    AND s.status = 'COMPLETED'
    AND s.created_at >= CURRENT_DATE;

  -- Kurangi pengeluaran kas operasional kasir hari ini
  v_system_cash := v_system_cash - COALESCE(
    (SELECT SUM(amount) FROM public.cash_flows WHERE flow_type = 'OUT' AND created_at >= CURRENT_DATE),
    0.00
  );
  v_system_cash := GREATEST(0.00, v_system_cash);

  v_diff := v_actual_cash - v_system_cash;
  IF v_diff = 0 THEN
    v_status := 'PAS';
  ELSIF v_diff > 0 THEN
    v_status := 'LEBIH';
  ELSE
    v_status := 'KURANG';
  END IF;

  v_shift_id := gen_random_uuid();
  INSERT INTO public.shift_closings (
    id, cashier_id, shift_start, shift_end,
    system_cash, actual_cash, difference, status, notes
  ) VALUES (
    v_shift_id, v_cashier_id, CURRENT_DATE, NOW(),
    v_system_cash, v_actual_cash, v_diff, v_status, v_notes
  );

  -- Jika ada selisih, buat antrean approval wewenang owner
  IF v_diff <> 0 THEN
    INSERT INTO public.approvals (
      category, title, requester_id, details
    ) VALUES (
      'CASH_DIFF', 'Selisih Kas Shift Kasir: Rp ' || v_diff::TEXT,
      v_cashier_id, jsonb_build_object(
        'shift_id', v_shift_id,
        'system_cash', v_system_cash,
        'actual_cash', v_actual_cash,
        'difference', v_diff,
        'notes', v_notes
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'system_cash', v_system_cash,
    'actual_cash', v_actual_cash,
    'difference', v_diff,
    'status', v_status
  );
END;
$$;

-- ==============================================================================
-- 8. DASHBOARD EKSEKUTIF METRICS (get_owner_dashboard_metrics)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_owner_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_omzet NUMERIC(15,2);
  v_laba NUMERIC(15,2);
  v_aset_stok NUMERIC(15,2);
  v_saldo_kas NUMERIC(15,2);
  v_total_trx INTEGER;
  v_total_pcs INTEGER;
BEGIN
  -- Omzet bulan ini
  SELECT COALESCE(SUM(total_amount), 0.00), COUNT(id)
  INTO v_omzet, v_total_trx
  FROM public.sales
  WHERE status = 'COMPLETED'
    AND created_at >= date_trunc('month', CURRENT_DATE);

  -- Laba kotor (Omzet - HPP riil saat penjualan)
  SELECT COALESCE(SUM((price_at_sale - cost_at_sale) * qty), 0.00), COALESCE(SUM(qty), 0)
  INTO v_laba, v_total_pcs
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  WHERE s.status = 'COMPLETED'
    AND s.created_at >= date_trunc('month', CURRENT_DATE);

  -- Nilai Aset Persediaan Fisik (HPP x Stok)
  SELECT COALESCE(SUM(cost_price * stock), 0.00)
  INTO v_aset_stok
  FROM public.product_variants
  WHERE deleted_at IS NULL;

  -- Jika varian belum ada, fallback ke products
  IF v_aset_stok = 0 THEN
    SELECT COALESCE(SUM(cost_price * stock_global), 0.00)
    INTO v_aset_stok
    FROM public.products
    WHERE deleted_at IS NULL;
  END IF;

  -- Saldo Total Kantong Kas
  SELECT COALESCE(SUM(balance), 0.00)
  INTO v_saldo_kas
  FROM public.cash_registers
  WHERE is_active = true;

  RETURN jsonb_build_object(
    'total_omzet', v_omzet,
    'total_laba', v_laba,
    'aset_stok', v_aset_stok,
    'saldo_kas', v_saldo_kas,
    'total_transaksi', v_total_trx,
    'total_pcs', v_total_pcs
  );
END;
$$;

-- ==============================================================================
-- 9. LAPORAN KOMPREHENSIF ERP (get_comprehensive_report)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_comprehensive_report(
  p_start_date TIMESTAMPTZ DEFAULT date_trunc('month', CURRENT_DATE),
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_omzet NUMERIC(15,2);
  v_hpp NUMERIC(15,2);
  v_laba_kotor NUMERIC(15,2);
  v_pengeluaran NUMERIC(15,2);
  v_laba_bersih NUMERIC(15,2);
  v_total_trx INTEGER;
  v_total_pcs INTEGER;
  v_kas_saldo NUMERIC(15,2);
BEGIN
  SELECT 
    COALESCE(SUM(total_amount), 0.00),
    COALESCE(SUM(total_cost), 0.00),
    COUNT(id)
  INTO v_omzet, v_hpp, v_total_trx
  FROM public.sales
  WHERE status = 'COMPLETED'
    AND created_at BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  v_laba_kotor := v_omzet - v_hpp;

  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_pengeluaran
  FROM public.cash_flows
  WHERE flow_type = 'OUT'
    AND created_at BETWEEN p_start_date AND p_end_date;

  v_laba_bersih := v_laba_kotor - v_pengeluaran;

  SELECT COALESCE(SUM(si.qty), 0)
  INTO v_total_pcs
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  WHERE s.status = 'COMPLETED'
    AND s.created_at BETWEEN p_start_date AND p_end_date;

  SELECT COALESCE(SUM(balance), 0.00)
  INTO v_kas_saldo
  FROM public.cash_registers WHERE is_active = true;

  RETURN jsonb_build_object(
    'omzet', v_omzet,
    'hpp', v_hpp,
    'laba_kotor', v_laba_kotor,
    'pengeluaran', v_pengeluaran,
    'laba_bersih', v_laba_bersih,
    'total_transaksi', v_total_trx,
    'total_pcs', v_total_pcs,
    'saldo_kas', v_kas_saldo
  );
END;
$$;

-- ==============================================================================
-- 10. AI RESTOCK & SLOW MOVING ANALYTICS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_ai_restock_recommendations()
RETURNS TABLE (
  variant_id UUID,
  product_code VARCHAR,
  product_name VARCHAR,
  current_stock INTEGER,
  daily_velocity NUMERIC(5,2),
  safe_days INTEGER,
  suggested_qty INTEGER,
  est_cost NUMERIC(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH sales_30d AS (
    SELECT 
      si.variant_id AS var_id,
      COALESCE(SUM(si.qty), 0) AS total_sold
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
    WHERE s.status = 'COMPLETED'
      AND s.created_at >= (NOW() - INTERVAL '30 days')
    GROUP BY si.variant_id
  )
  SELECT 
    p.id AS variant_id,
    p.product_code::VARCHAR,
    p.name::VARCHAR,
    p.stock_global,
    ROUND((COALESCE(s30.total_sold, 0)::NUMERIC / 30.0), 2) AS daily_velocity,
    14 AS safe_days,
    GREATEST(10, ROUND((COALESCE(s30.total_sold, 1)::NUMERIC / 30.0) * 14)::INTEGER - p.stock_global) AS suggested_qty,
    (GREATEST(10, ROUND((COALESCE(s30.total_sold, 1)::NUMERIC / 30.0) * 14)::INTEGER - p.stock_global) * p.cost_price) AS est_cost
  FROM public.products p
  LEFT JOIN sales_30d s30 ON s30.var_id = p.id
  WHERE p.deleted_at IS NULL AND p.stock_global <= p.min_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_slow_moving_products(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  product_id UUID,
  code VARCHAR,
  name VARCHAR,
  stock INTEGER,
  days_dormant INTEGER,
  cost_stuck NUMERIC(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS product_id,
    p.product_code::VARCHAR,
    p.name::VARCHAR,
    p.stock_global,
    p_days,
    (p.cost_price * p.stock_global) AS cost_stuck
  FROM public.products p
  WHERE p.stock_global > 0
    AND p.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
      WHERE (si.product_id = p.id OR si.variant_id = p.id)
        AND s.created_at >= (NOW() - (p_days || ' days')::INTERVAL)
    );
END;
$$;

-- ==============================================================================
-- 11. SUPER ADMIN AUTH & USER MANAGEMENT RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.confirm_user_email(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE lower(email) = lower(target_email)
  RETURNING id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET status = 'ACTIVE'
    WHERE id = v_user_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Akun ' || target_email || ' berhasil dikonfirmasi & diaktifkan.');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Email tidak ditemukan di sistem otentikasi.');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  created_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  full_name VARCHAR,
  role VARCHAR,
  status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::VARCHAR,
    u.created_at,
    u.email_confirmed_at,
    COALESCE(p.full_name, (u.raw_user_meta_data->>'full_name')::VARCHAR, 'Pengguna')::VARCHAR,
    COALESCE(p.role, (u.raw_user_meta_data->>'role')::VARCHAR, 'OWNER')::VARCHAR,
    COALESCE(p.status, CASE WHEN u.email_confirmed_at IS NOT NULL THEN 'ACTIVE' ELSE 'PENDING' END)::VARCHAR
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;
