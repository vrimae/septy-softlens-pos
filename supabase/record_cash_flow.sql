CREATE OR REPLACE FUNCTION public.record_cash_flow(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reg_id UUID;
  v_amount NUMERIC;
  v_flow_type VARCHAR;
  v_category VARCHAR;
  v_desc VARCHAR;
  v_created_by UUID;
  v_branch_id UUID;
  v_balance NUMERIC;
BEGIN
  v_amount := (p_payload->>'amount')::NUMERIC;
  v_flow_type := p_payload->>'flow_type';
  v_category := p_payload->>'category';
  v_desc := p_payload->>'description';
  v_created_by := NULLIF(p_payload->>'created_by', '')::UUID;
  v_reg_id := NULLIF(p_payload->>'cash_register_id', '')::UUID;
  v_branch_id := NULLIF(p_payload->>'branch_id', '')::UUID;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'NOMINAL_TIDAK_VALID: Nominal harus lebih dari 0.';
  END IF;

  IF v_reg_id IS NULL THEN
    SELECT id INTO v_reg_id FROM public.cash_registers WHERE is_active = true ORDER BY created_at LIMIT 1;
  END IF;

  IF v_reg_id IS NULL THEN
    RAISE EXCEPTION 'KAS_TIDAK_ADA: Belum ada kantong kas. Buat kantong kas terlebih dahulu.';
  END IF;

  -- Kunci baris kas agar saldo konsisten saat ada transaksi bersamaan
  SELECT balance INTO v_balance FROM public.cash_registers WHERE id = v_reg_id FOR UPDATE;

  IF v_flow_type = 'IN' THEN
    UPDATE public.cash_registers SET balance = balance + v_amount WHERE id = v_reg_id;
  ELSE
    IF v_balance < v_amount THEN
      RAISE EXCEPTION 'SALDO_KAS_KURANG: Saldo kas (Rp %) tidak cukup untuk pengeluaran Rp %.', v_balance, v_amount;
    END IF;
    UPDATE public.cash_registers SET balance = balance - v_amount WHERE id = v_reg_id;
  END IF;

  INSERT INTO public.cash_flows (
    cash_register_id, flow_type, category, amount, description, created_by, branch_id
  ) VALUES (
    v_reg_id, v_flow_type, v_category, v_amount, v_desc, v_created_by, v_branch_id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
