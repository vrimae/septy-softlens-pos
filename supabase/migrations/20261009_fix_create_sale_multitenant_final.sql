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
  v_cash_register_id UUID;
  v_points_earned INTEGER := 0;
  v_point_multiplier NUMERIC(15,2);
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
      -- PERBAIKAN: Jika bukan varian, set variant_id menjadi NULL
      v_variant_id := NULL;
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

  -- PERBAIKAN: Fallback Cerdas untuk metode pembayaran
  v_pay_method := COALESCE(p_payload->>'payment_method', p_payload->'payments'->0->>'payment_method', p_payload->'payments'->0->>'method', 'TUNAI');

  -- 6. GENERATE NOMOR INVOICE & INSERT KE SALES
  v_invoice_number := 'INV-' || to_char(NOW(), 'YYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4));
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

      -- PERBAIKAN: Jika bukan varian, set variant_id menjadi NULL
      v_variant_id := NULL;
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

    IF v_variant_id IS NOT NULL THEN
      UPDATE public.product_variants
      SET stock = stock - v_qty
      WHERE id = v_variant_id AND store_id = v_store_id;
    ELSE
      UPDATE public.products
      SET stock_global = GREATEST(0, stock_global - v_qty)
      WHERE id = v_product_id AND store_id = v_store_id;
    END IF;

    INSERT INTO public.stock_movements (
      store_id, product_id, variant_id, movement_type, qty_change,
      qty_after, reference_table, reference_id, notes, created_by
    ) VALUES (
      v_store_id, v_product_id, v_variant_id, 'SALE', -v_qty,
      (v_current_stock - v_qty), 'sales', v_sale_id,
      'Penjualan kasir Struk ' || v_invoice_number, v_cashier_id
    );
  END LOOP;

  -- 8. INSERT PAYMENTS & CASH FLOW
  IF v_payments IS NOT NULL THEN
    FOR v_payment IN SELECT * FROM jsonb_array_elements(v_payments)
    LOOP
      v_pay_method := COALESCE(v_payment->>'payment_method', v_payment->>'method');
      v_pay_amount := (v_payment->>'amount')::NUMERIC;
      v_cash_register_id := (v_payment->>'cash_register_id')::UUID;

      INSERT INTO public.sale_payments (
        sale_id, store_id, payment_method, amount, cash_register_id,
        reference_number, created_at
      ) VALUES (
        v_sale_id, v_store_id, v_pay_method, v_pay_amount, v_cash_register_id,
        v_payment->>'reference_number', NOW()
      );

      IF v_cash_register_id IS NOT NULL THEN
        UPDATE public.cash_registers SET balance = balance + v_pay_amount WHERE id = v_cash_register_id AND store_id = v_store_id;
        INSERT INTO public.cash_flows (
          store_id, cash_register_id, flow_type, category, amount,
          reference_table, reference_id, description, created_by
        ) VALUES (
          v_store_id, v_cash_register_id, 'IN', 'PENJUALAN', v_pay_amount,
          'sales', v_sale_id, 'Penerimaan Penjualan ' || v_invoice_number, v_cashier_id
        );
      END IF;
    END LOOP;
  ELSE
    v_cash_register_id := (p_payload->>'cash_register_id')::UUID;
    INSERT INTO public.sale_payments (
      sale_id, store_id, payment_method, amount, cash_register_id, created_at
    ) VALUES (
      v_sale_id, v_store_id, v_pay_method, v_total_amount, v_cash_register_id, NOW()
    );

    IF v_cash_register_id IS NOT NULL THEN
      UPDATE public.cash_registers SET balance = balance + v_total_amount WHERE id = v_cash_register_id AND store_id = v_store_id;
      INSERT INTO public.cash_flows (
        store_id, cash_register_id, flow_type, category, amount,
        reference_table, reference_id, description, created_by
      ) VALUES (
        v_store_id, v_cash_register_id, 'IN', 'PENJUALAN', v_total_amount,
        'sales', v_sale_id, 'Penerimaan Penjualan ' || v_invoice_number, v_cashier_id
      );
    END IF;
  END IF;

  -- 9. CUSTOMER POINTS
  IF v_customer_id IS NOT NULL THEN
    SELECT COALESCE(reward_multiplier, 1.0) INTO v_point_multiplier FROM public.store_settings WHERE store_id = v_store_id LIMIT 1;
    v_points_earned := FLOOR((v_total_amount / 10000.00) * v_point_multiplier)::INTEGER;

    UPDATE public.customers
    SET total_spend = total_spend + v_total_amount,
        points = points + v_points_earned
    WHERE id = v_customer_id AND store_id = v_store_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'invoice_number', v_invoice_number,
    'total_amount', v_total_amount,
    'points_earned', v_points_earned
  );
END;
$$;

