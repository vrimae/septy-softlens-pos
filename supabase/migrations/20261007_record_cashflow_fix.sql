CREATE OR REPLACE FUNCTION public.record_cash_flow(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_id UUID;
  v_reg_id UUID;
  v_amount NUMERIC;
  v_flow_type VARCHAR;
  v_category VARCHAR;
  v_desc VARCHAR;
  v_created_by UUID;
  v_branch_id UUID;
  v_balance NUMERIC;
BEGIN
  v_store_id := get_current_store_id();
  v_amount := (p_payload->>'amount')::NUMERIC;
  v_flow_type := p_payload->>'flow_type';
  v_category := p_payload->>'category';
  v_desc := p_payload->>'description';
  v_created_by := COALESCE(NULLIF(p_payload->>'created_by', '')::UUID, auth.uid());
  v_reg_id := NULLIF(p_payload->>'cash_register_id', '')::UUID;
  v_branch_id := NULLIF(p_payload->>'branch_id', '')::UUID;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'NOMINAL_TIDAK_VALID: Nominal harus lebih dari 0.';
  END IF;

  IF v_reg_id IS NULL THEN
    SELECT id INTO v_reg_id FROM public.cash_registers 
    WHERE is_active = true AND store_id = v_store_id
    ORDER BY created_at LIMIT 1;
  END IF;

  IF v_reg_id IS NULL THEN
    RAISE EXCEPTION 'KAS_TIDAK_DITEMUKAN: Tidak ada laci kas aktif di toko ini.';
  END IF;

  SELECT balance INTO v_balance FROM public.cash_registers WHERE id = v_reg_id AND store_id = v_store_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'KAS_TIDAK_VALID: Laci kas tidak valid atau bukan milik toko ini.';
  END IF;

  IF v_flow_type = 'OUT' THEN
    IF v_balance < v_amount THEN
      RAISE EXCEPTION 'SALDO_TIDAK_CUKUP: Saldo kas saat ini (Rp %) tidak cukup untuk pengeluaran (Rp %).', v_balance, v_amount;
    END IF;
    v_balance := v_balance - v_amount;
  ELSE
    v_balance := v_balance + v_amount;
  END IF;

  UPDATE public.cash_registers SET balance = v_balance WHERE id = v_reg_id AND store_id = v_store_id;

  INSERT INTO public.cash_flows (
    store_id, cash_register_id, flow_type, category, amount, description, created_by
  ) VALUES (
    v_store_id, v_reg_id, v_flow_type, v_category, v_amount, v_desc, v_created_by
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_balance);
END;
$$;
