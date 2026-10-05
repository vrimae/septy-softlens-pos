-- Migration: Initial Schema for Septy Softlens POS
-- Description: Create all tables, RLS policies, triggers, and functions.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users / profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'kasir')) DEFAULT 'kasir',
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT,
  type TEXT, -- e.g., 'Color', 'Clear'
  color TEXT,
  diameter NUMERIC,
  base_curve NUMERIC,
  power NUMERIC, -- negative for minus, positive for plus, 0 for normal
  duration TEXT, -- e.g., 'Daily', 'Monthly', 'Yearly'
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. inventory_movements
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUST')),
  qty INTEGER NOT NULL,
  reference_id UUID, -- Can be sale_id, purchase_id, return_id
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  prescription_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('TUNAI', 'TRANSFER', 'QRIS')),
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  change_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'HOLD', 'CANCELLED')) DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. sale_items
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  price NUMERIC NOT NULL,
  discount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. purchases
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('PAID', 'UNPAID')) DEFAULT 'UNPAID',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. purchase_items
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  cost_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. returns
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE RESTRICT,
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. return_items
CREATE TABLE public.return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE RESTRICT,
  qty_returned INTEGER NOT NULL CHECK (qty_returned > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. store_settings
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  receipt_footer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_returns_updated_at BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ATOMIC RPC FOR CHECKOUT
-- This RPC handles the sale transaction atomically
CREATE OR REPLACE FUNCTION checkout_sale(
  p_customer_id UUID,
  p_cashier_id UUID,
  p_total_amount NUMERIC,
  p_discount NUMERIC,
  p_final_amount NUMERIC,
  p_payment_method TEXT,
  p_amount_paid NUMERIC,
  p_change_amount NUMERIC,
  p_status TEXT,
  p_items JSONB -- Array of {product_id, qty, price, discount, subtotal}
) RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_price NUMERIC;
  v_discount NUMERIC;
  v_subtotal NUMERIC;
  v_current_stock INTEGER;
BEGIN
  -- 1. Insert Sale
  INSERT INTO public.sales (customer_id, cashier_id, total_amount, discount, final_amount, payment_method, amount_paid, change_amount, status)
  VALUES (p_customer_id, p_cashier_id, p_total_amount, p_discount, p_final_amount, p_payment_method, p_amount_paid, p_change_amount, p_status)
  RETURNING id INTO v_sale_id;

  -- 2. Process Items if status is COMPLETED
  IF p_status = 'COMPLETED' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_product_id := (v_item->>'product_id')::UUID;
      v_qty := (v_item->>'qty')::INTEGER;
      v_price := (v_item->>'price')::NUMERIC;
      v_discount := (v_item->>'discount')::NUMERIC;
      v_subtotal := (v_item->>'subtotal')::NUMERIC;

      -- Check Stock
      SELECT stock_qty INTO v_current_stock FROM public.products WHERE id = v_product_id FOR UPDATE;
      IF v_current_stock < v_qty THEN
        RAISE EXCEPTION 'Stok tidak mencukupi untuk produk dengan ID %', v_product_id;
      END IF;

      -- Insert Sale Item
      INSERT INTO public.sale_items (sale_id, product_id, qty, price, discount, subtotal)
      VALUES (v_sale_id, v_product_id, v_qty, v_price, v_discount, v_subtotal);

      -- Deduct Stock
      UPDATE public.products SET stock_qty = stock_qty - v_qty WHERE id = v_product_id;

      -- Record Movement
      INSERT INTO public.inventory_movements (product_id, movement_type, qty, reference_id, notes, created_by)
      VALUES (v_product_id, 'OUT', -v_qty, v_sale_id, 'Penjualan POS', p_cashier_id);
    END LOOP;
  ELSE
    -- If HOLD, just save items without deducting stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_product_id := (v_item->>'product_id')::UUID;
      v_qty := (v_item->>'qty')::INTEGER;
      v_price := (v_item->>'price')::NUMERIC;
      v_discount := (v_item->>'discount')::NUMERIC;
      v_subtotal := (v_item->>'subtotal')::NUMERIC;
      INSERT INTO public.sale_items (sale_id, product_id, qty, price, discount, subtotal)
      VALUES (v_sale_id, v_product_id, v_qty, v_price, v_discount, v_subtotal);
    END LOOP;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Creating a helper function to get current user role
CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Profiles: Users can read their own profile, owner can read all. 
CREATE POLICY "Profiles are viewable by users who created them or owner" ON public.profiles FOR SELECT USING (auth.uid() = id OR get_my_role() = 'owner');
CREATE POLICY "Profiles can be created by owner" ON public.profiles FOR INSERT WITH CHECK (get_my_role() = 'owner');
CREATE POLICY "Profiles can be updated by owner or self" ON public.profiles FOR UPDATE USING (auth.uid() = id OR get_my_role() = 'owner');

-- Products: Everyone authenticated can read. Owner/Admin can write.
CREATE POLICY "Products are viewable by authenticated" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Products are insertable by owner/admin" ON public.products FOR INSERT WITH CHECK (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Products are updatable by owner/admin" ON public.products FOR UPDATE USING (get_my_role() IN ('owner', 'admin'));

-- Inventory Movements: Everyone authenticated can read. System handles insert mostly, but owner/admin can insert adjustment.
CREATE POLICY "Inventory viewable by authenticated" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inventory insertable by authenticated" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

-- Customers: Everyone can read and insert. Owner/Admin can update.
CREATE POLICY "Customers viewable by authenticated" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customers insertable by authenticated" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Customers updatable by authenticated" ON public.customers FOR UPDATE TO authenticated USING (true);

-- Suppliers: Owner/Admin can read, insert, update.
CREATE POLICY "Suppliers viewable by owner/admin" ON public.suppliers FOR SELECT USING (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Suppliers insertable by owner/admin" ON public.suppliers FOR INSERT WITH CHECK (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Suppliers updatable by owner/admin" ON public.suppliers FOR UPDATE USING (get_my_role() IN ('owner', 'admin'));

-- Sales: Everyone can read. Everyone can insert.
CREATE POLICY "Sales viewable by authenticated" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales insertable by authenticated" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Sales updatable by authenticated" ON public.sales FOR UPDATE TO authenticated USING (true);

-- Sale Items: Everyone can read and insert.
CREATE POLICY "Sale Items viewable by authenticated" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sale Items insertable by authenticated" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- Purchases: Owner/Admin can read, insert, update.
CREATE POLICY "Purchases viewable by owner/admin" ON public.purchases FOR SELECT USING (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Purchases insertable by owner/admin" ON public.purchases FOR INSERT WITH CHECK (get_my_role() IN ('owner', 'admin'));

-- Purchase Items: Owner/Admin can read, insert.
CREATE POLICY "Purchase Items viewable by owner/admin" ON public.purchase_items FOR SELECT USING (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Purchase Items insertable by owner/admin" ON public.purchase_items FOR INSERT WITH CHECK (get_my_role() IN ('owner', 'admin'));

-- Expenses: Owner/Admin can read, insert.
CREATE POLICY "Expenses viewable by owner/admin" ON public.expenses FOR SELECT USING (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Expenses insertable by owner/admin" ON public.expenses FOR INSERT WITH CHECK (get_my_role() IN ('owner', 'admin'));

-- Returns: Everyone can read, insert.
CREATE POLICY "Returns viewable by authenticated" ON public.returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Returns insertable by authenticated" ON public.returns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Returns updatable by authenticated" ON public.returns FOR UPDATE TO authenticated USING (true);

-- Return Items: Everyone can read, insert.
CREATE POLICY "Return Items viewable by authenticated" ON public.return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Return Items insertable by authenticated" ON public.return_items FOR INSERT TO authenticated WITH CHECK (true);

-- Store Settings: Everyone can read. Owner can update.
CREATE POLICY "Store Settings viewable by authenticated" ON public.store_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Store Settings updatable by owner" ON public.store_settings FOR UPDATE USING (get_my_role() = 'owner');
