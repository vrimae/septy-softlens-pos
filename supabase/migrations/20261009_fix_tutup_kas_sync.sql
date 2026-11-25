CREATE OR REPLACE FUNCTION public.get_current_system_cash(p_cashier_id UUID)
 RETURNS NUMERIC
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $BODY
DECLARE
  v_system_cash NUMERIC(15,2);
  v_last_closing TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Dapatkan waktu tutup kas terakhir untuk kasir ini
  SELECT COALESCE(MAX(shift_end), '1970-01-01 00:00:00+00') INTO v_last_closing
  FROM public.shift_closings
  WHERE cashier_id = p_cashier_id;

  -- Hitung total penjualan tunai sejak tutup kas terakhir
  SELECT COALESCE(SUM(sp.amount), 0.00)
  INTO v_system_cash
  FROM public.sale_payments sp
  JOIN public.sales s ON s.id = sp.sale_id
  WHERE upper(sp.payment_method) = 'TUNAI'
    AND s.cashier_id = p_cashier_id
    AND s.created_at > v_last_closing
    AND s.status = 'COMPLETED';

  -- Kurangi pengeluaran kas (OUT) jika ada
  v_system_cash := v_system_cash - COALESCE(
    (SELECT SUM(amount) FROM public.cash_flows 
     WHERE flow_type = 'OUT' AND created_by = p_cashier_id AND created_at > v_last_closing),
    0.00
  );
  
  RETURN GREATEST(0.00, v_system_cash);
END;
$BODY;

CREATE OR REPLACE FUNCTION public.close_cash_shift(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $BODY
DECLARE
  v_cashier_id UUID;
  v_actual_cash NUMERIC(15,2);
  v_notes TEXT;
  v_system_cash NUMERIC(15,2);
  v_diff NUMERIC(15,2);
  v_status TEXT;
  v_shift_id UUID;
  v_last_closing TIMESTAMP WITH TIME ZONE;
BEGIN
  v_cashier_id := COALESCE((p_payload->>'cashier_id')::UUID, auth.uid());
  v_actual_cash := (p_payload->>'actual_cash')::NUMERIC;
  v_notes := p_payload->>'notes';

  -- Gunakan logika yang persis sama dengan get_current_system_cash
  SELECT COALESCE(MAX(shift_end), '1970-01-01 00:00:00+00') INTO v_last_closing
  FROM public.shift_closings
  WHERE cashier_id = v_cashier_id;

  SELECT COALESCE(SUM(sp.amount), 0.00)
  INTO v_system_cash
  FROM public.sale_payments sp
  JOIN public.sales s ON s.id = sp.sale_id
  WHERE upper(sp.payment_method) = 'TUNAI'
    AND s.cashier_id = v_cashier_id
    AND s.created_at > v_last_closing
    AND s.status = 'COMPLETED';

  -- Kurangi pengeluaran kas operasional kasir hari ini
  v_system_cash := v_system_cash - COALESCE(
    (SELECT SUM(amount) FROM public.cash_flows 
     WHERE flow_type = 'OUT' AND created_by = v_cashier_id AND created_at > v_last_closing),
    0.00
  );
  
  v_system_cash := GREATEST(0.00, v_system_cash);
  v_diff := v_actual_cash - v_system_cash;

  IF v_diff = 0 THEN
    v_status := 'COCOK';
  ELSIF v_diff > 0 THEN
    v_status := 'LEBIH';
  ELSE
    v_status := 'KURANG';
  END IF;

  INSERT INTO public.shift_closings (
    cashier_id, shift_start, shift_end, system_cash,
    actual_cash, difference, status, notes
  ) VALUES (
    v_cashier_id, v_last_closing, NOW(), v_system_cash,
    v_actual_cash, v_diff, v_status, v_notes
  ) RETURNING id INTO v_shift_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Shift kasir berhasil ditutup.',
    'shift_id', v_shift_id,
    'system_cash', v_system_cash,
    'actual_cash', v_actual_cash,
    'difference', v_diff,
    'status', v_status
  );
END;
$BODY;
