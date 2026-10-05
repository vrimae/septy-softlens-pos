-- ==============================================================================
-- MIGRATION: 20261006100003_seed_data.sql
-- DESCRIPTION: Initial Seed Data for Septy Softlens POS
-- AUTHOR: Senior Backend Engineer
-- IDEMPOTENT: Yes (Using ON CONFLICT DO NOTHING / UPDATE)
-- ==============================================================================

DO $$
DECLARE
  v_branch_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_cat_normal UUID := '10000000-0000-0000-0000-000000000001'::UUID;
  v_cat_minus UUID  := '10000000-0000-0000-0000-000000000002'::UUID;
  v_cat_color UUID  := '10000000-0000-0000-0000-000000000003'::UUID;
  v_cat_sol UUID    := '10000000-0000-0000-0000-000000000004'::UUID;
  v_cat_acc UUID    := '10000000-0000-0000-0000-000000000005'::UUID;

  v_brand_x2 UUID     := '20000000-0000-0000-0000-000000000001'::UUID;
  v_brand_acuvue UUID := '20000000-0000-0000-0000-000000000002'::UUID;
  v_brand_fresh UUID  := '20000000-0000-0000-0000-000000000003'::UUID;
  v_brand_bausch UUID := '20000000-0000-0000-0000-000000000004'::UUID;

  v_sup_1 UUID := '30000000-0000-0000-0000-000000000001'::UUID;
  v_sup_2 UUID := '30000000-0000-0000-0000-000000000002'::UUID;

  v_cust_walkin UUID := '40000000-0000-0000-0000-000000000001'::UUID;
  v_cust_1 UUID      := '40000000-0000-0000-0000-000000000002'::UUID;

  v_prod_1 UUID := '50000000-0000-0000-0000-000000000001'::UUID;
  v_prod_2 UUID := '50000000-0000-0000-0000-000000000002'::UUID;
  v_prod_3 UUID := '50000000-0000-0000-0000-000000000003'::UUID;
  v_prod_4 UUID := '50000000-0000-0000-0000-000000000004'::UUID;
  v_prod_5 UUID := '50000000-0000-0000-0000-000000000005'::UUID;
  v_prod_6 UUID := '50000000-0000-0000-0000-000000000006'::UUID;
BEGIN
  -- 1. SEED CABANG UTAMA (BRANCH)
  INSERT INTO public.branches (id, branch_code, name, address, phone, is_active)
  VALUES (v_branch_id, 'BR-01', 'Toko Pusat Septy Softlens', 'Jl. Malioboro No. 45, Yogyakarta', '081234567890', true)
  ON CONFLICT (branch_code) DO UPDATE 
  SET name = EXCLUDED.name, address = EXCLUDED.address;

  -- 2. SEED STORE SETTINGS
  INSERT INTO public.store_settings (
    store_name, receipt_header, receipt_footer, phone, email, address,
    tax_percentage, loyalty_points_enabled, points_per_amount, require_prescription
  ) VALUES (
    'Septy Softlens',
    'Septy Softlens POS - Spesialis Lensa Kontak',
    'Terima kasih atas kunjungan Anda! Lensa nyaman, mata sehat.',
    '0812-3456-7890',
    'vrimae23@gmail.com',
    'Jl. Malioboro No. 45, Yogyakarta',
    0.00,
    true,
    10000.00,
    false
  )
  ON CONFLICT DO NOTHING;

  -- 3. SEED KATEGORI
  INSERT INTO public.categories (id, name, code, description) VALUES
    (v_cat_normal, 'Softlens Normal', 'CAT-NRM', 'Lensa kontak plano / tanpa minus'),
    (v_cat_minus,  'Softlens Minus',  'CAT-MNS', 'Lensa kontak koreksi rabun jauh'),
    (v_cat_color,  'Softlens Warna',  'CAT-CLR', 'Lensa kontak kosmetik dan fashion berwarna'),
    (v_cat_sol,    'Cairan & Tetes',  'CAT-SOL', 'Cairan pembersih serbaguna dan tetes mata'),
    (v_cat_acc,    'Aksesoris & Case','CAT-ACC', 'Tempat softlens, pinset, dan aplikator')
  ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code;

  -- 4. SEED BRAND
  INSERT INTO public.brands (id, name, code, country_of_origin) VALUES
    (v_brand_x2,     'X2 (Exoticon)', 'BRD-X2',  'Indonesia / Korea'),
    (v_brand_acuvue, 'Acuvue',        'BRD-ACU', 'USA / Johnson & Johnson'),
    (v_brand_fresh,  'Freshlook',     'BRD-FRL', 'USA / Alcon'),
    (v_brand_bausch, 'Bausch + Lomb', 'BRD-BNL', 'USA')
  ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code;

  -- 5. SEED SUPPLIER
  INSERT INTO public.suppliers (id, code, name, contact_person, phone, email, address) VALUES
    (v_sup_1, 'SUP-001', 'PT Optik Distribusi Prima', 'Budi Santoso', '08119876543', 'order@optikprima.co.id', 'Kawasan Industri Pulogadung, Jakarta'),
    (v_sup_2, 'SUP-002', 'CV Lensa Jaya Mandiri',     'Siti Rahma',   '08128765432', 'sales@lensajaya.com',   'Jl. Pemuda No. 12, Surabaya')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, contact_person = EXCLUDED.contact_person;

  -- 6. SEED PELANGGAN
  INSERT INTO public.customers (id, customer_code, name, phone, email, notes, prescription_data) VALUES
    (v_cust_walkin, 'CUST-0000', 'Pelanggan Umum', '-', '-', 'Pelanggan Walk-In', '{}'::JSONB),
    (v_cust_1,      'CUST-0001', 'Anisa Rahmawati', '081399887766', 'anisa@gmail.com', 'Member VIP', 
     '{"od_sphere": "-2.50", "os_sphere": "-2.75", "od_cylinder": "-0.50", "bc": "8.6", "dia": "14.2"}'::JSONB)
  ON CONFLICT (customer_code) DO UPDATE SET name = EXCLUDED.name;

  -- 7. SEED PRODUK & VARIAN
  -- Produk 1: X2 Sanso Color
  INSERT INTO public.products (
    id, product_code, name, category_id, brand_id, cost_price, price_regular, 
    stock_global, min_stock, diameter, base_curve, replacement_period, water_content, description
  ) VALUES (
    v_prod_1, 'PRD-X2-SANSO', 'X2 Sanso Color Silicone Hydrogel', v_cat_color, v_brand_x2,
    55000.00, 85000.00, 45, 10, '14.5 mm', '8.8 mm', '3 Bulan', '55%',
    'Lensa kontak warna berbahan silicone hydrogel transmisi oksigen tinggi hingga 80% lebih banyak.'
  ) ON CONFLICT (product_code) DO UPDATE SET name = EXCLUDED.name, price_regular = EXCLUDED.price_regular;

  INSERT INTO public.product_variants (
    id, product_id, sku, barcode, variant_name, power, color,
    cost_price, price_regular, stock, min_stock
  ) VALUES 
    ('51000000-0000-0000-0000-000000000001'::UUID, v_prod_1, 'SKU-SANSO-HAZEL-PL', '899123456001', 'Hazel (Plano)', 'Plano / 0.00', 'Hazel', 55000.00, 85000.00, 15, 3),
    ('51000000-0000-0000-0000-000000000002'::UUID, v_prod_1, 'SKU-SANSO-GREY-PL',  '899123456002', 'Grey (Plano)',  'Plano / 0.00', 'Grey',  55000.00, 85000.00, 15, 3),
    ('51000000-0000-0000-0000-000000000003'::UUID, v_prod_1, 'SKU-SANSO-GREY-M2',  '899123456003', 'Grey (-2.00)',  '-2.00',        'Grey',  55000.00, 85000.00, 15, 3)
  ON CONFLICT (sku) DO UPDATE SET price_regular = EXCLUDED.price_regular, stock = EXCLUDED.stock;

  -- Produk 2: X2 Black Series
  INSERT INTO public.products (
    id, product_code, name, category_id, brand_id, cost_price, price_regular, 
    stock_global, min_stock, diameter, base_curve, replacement_period, water_content, description
  ) VALUES (
    v_prod_2, 'PRD-X2-BLACK', 'X2 Black Series', v_cat_color, v_brand_x2,
    40000.00, 65000.00, 30, 5, '14.5 mm', '8.6 mm', '6 Bulan', '42%',
    'Lensa kontak hitam pekat membuat mata tampak lebih besar, bersinar dan natural.'
  ) ON CONFLICT (product_code) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO public.product_variants (
    id, product_id, sku, barcode, variant_name, power, color,
    cost_price, price_regular, stock, min_stock
  ) VALUES 
    ('52000000-0000-0000-0000-000000000001'::UUID, v_prod_2, 'SKU-X2BLK-01-PL', '899123456011', 'Black Gothic 0.00', 'Plano / 0.00', 'Deep Black', 40000.00, 65000.00, 15, 5),
    ('52000000-0000-0000-0000-000000000002'::UUID, v_prod_2, 'SKU-X2BLK-01-M3', '899123456012', 'Black Gothic -3.00', '-3.00',       'Deep Black', 40000.00, 65000.00, 15, 5)
  ON CONFLICT (sku) DO UPDATE SET price_regular = EXCLUDED.price_regular, stock = EXCLUDED.stock;

  -- Produk 3: Acuvue Oasys 1-Day (30 pcs)
  INSERT INTO public.products (
    id, product_code, name, category_id, brand_id, cost_price, price_regular, 
    stock_global, min_stock, diameter, base_curve, replacement_period, water_content, description
  ) VALUES (
    v_prod_3, 'PRD-ACU-OASYS', 'Acuvue Oasys 1-Day with HydraLuxe (30 Pcs)', v_cat_minus, v_brand_acuvue,
    330000.00, 460000.00, 20, 4, '14.3 mm', '8.5 mm', '1 Hari (Harian)', '38%',
    'Lensa kontak harian premium dengan teknologi HydraLuxe menyatu dengan lapisan air mata alami.'
  ) ON CONFLICT (product_code) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO public.product_variants (
    id, product_id, sku, barcode, variant_name, power, color,
    cost_price, price_regular, stock, min_stock
  ) VALUES 
    ('53000000-0000-0000-0000-000000000001'::UUID, v_prod_3, 'SKU-ACU-OAS-M15', '899123456021', 'Acuvue Oasys -1.50', '-1.50', 'Clear', 330000.00, 460000.00, 10, 2),
    ('53000000-0000-0000-0000-000000000002'::UUID, v_prod_3, 'SKU-ACU-OAS-M35', '899123456022', 'Acuvue Oasys -3.50', '-3.50', 'Clear', 330000.00, 460000.00, 10, 2)
  ON CONFLICT (sku) DO UPDATE SET price_regular = EXCLUDED.price_regular, stock = EXCLUDED.stock;

  -- Produk 4: Renu Fresh Multi-Purpose Solution 355ml
  INSERT INTO public.products (
    id, product_code, name, category_id, brand_id, cost_price, price_regular, 
    stock_global, min_stock, diameter, base_curve, replacement_period, water_content, description
  ) VALUES (
    v_prod_4, 'PRD-RENU-355', 'Bausch + Lomb Renu Fresh Multi-Purpose Solution 355ml', v_cat_sol, v_brand_bausch,
    45000.00, 68000.00, 50, 10, '-', '-', '-', '-',
    'Cairan pembersih serbaguna untuk membersihkan, membilas, disinfeksi, dan melumasi softlens.'
  ) ON CONFLICT (product_code) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO public.product_variants (
    id, product_id, sku, barcode, variant_name, power, color,
    cost_price, price_regular, stock, min_stock
  ) VALUES 
    ('54000000-0000-0000-0000-000000000001'::UUID, v_prod_4, 'SKU-RENU-355ML', '899123456031', 'Renu Fresh 355ml Standar', '-', 'Clear Solution', 45000.00, 68000.00, 50, 10)
  ON CONFLICT (sku) DO UPDATE SET price_regular = EXCLUDED.price_regular, stock = EXCLUDED.stock;

  -- Produk 5: Rohto C Cube Eye Drops 13ml
  INSERT INTO public.products (
    id, product_code, name, category_id, brand_id, cost_price, price_regular, 
    stock_global, min_stock, diameter, base_curve, replacement_period, water_content, description
  ) VALUES (
    v_prod_5, 'PRD-ROHTO-C3', 'Rohto C Cube Lubricant Eye Drops 13ml', v_cat_sol, v_brand_bausch,
    30000.00, 45000.00, 40, 10, '-', '-', '-', '-',
    'Tetes mata khusus pengguna softlens meredakan mata kering, lelah, dan rasa mengganjal.'
  ) ON CONFLICT (product_code) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO public.product_variants (
    id, product_id, sku, barcode, variant_name, power, color,
    cost_price, price_regular, stock, min_stock
  ) VALUES 
    ('55000000-0000-0000-0000-000000000001'::UUID, v_prod_5, 'SKU-ROHTO-C3-13M', '899123456041', 'Rohto C Cube 13ml', '-', 'Clear Drop', 30000.00, 45000.00, 40, 10)
  ON CONFLICT (sku) DO UPDATE SET price_regular = EXCLUDED.price_regular, stock = EXCLUDED.stock;

  -- Produk 6: Macaron Travel Kit Case Softlens
  INSERT INTO public.products (
    id, product_code, name, category_id, brand_id, cost_price, price_regular, 
    stock_global, min_stock, diameter, base_curve, replacement_period, water_content, description
  ) VALUES (
    v_prod_6, 'PRD-KIT-MACARON', 'Macaron Travel Kit Case Softlens (Mirror + Tweezer + Stick)', v_cat_acc, v_brand_x2,
    7000.00, 18000.00, 60, 15, '-', '-', '-', '-',
    'Kotak softlens mini lucu dengan cermin, botol mini cairan, penjepit dan aplikator.'
  ) ON CONFLICT (product_code) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO public.product_variants (
    id, product_id, sku, barcode, variant_name, power, color,
    cost_price, price_regular, stock, min_stock
  ) VALUES 
    ('56000000-0000-0000-0000-000000000001'::UUID, v_prod_6, 'SKU-CASE-MAC-PINK', '899123456051', 'Macaron Kit Pastel Pink', '-', 'Pink', 7000.00, 18000.00, 30, 8),
    ('56000000-0000-0000-0000-000000000002'::UUID, v_prod_6, 'SKU-CASE-MAC-MINT', '899123456052', 'Macaron Kit Mint Green', '-', 'Mint', 7000.00, 18000.00, 30, 8)
  ON CONFLICT (sku) DO UPDATE SET price_regular = EXCLUDED.price_regular, stock = EXCLUDED.stock;

  -- 8. SEED KASIR REGISTER
  INSERT INTO public.cash_registers (id, name, branch_id, is_active, balance)
  VALUES ('60000000-0000-0000-0000-000000000001'::UUID, 'Kasir Utama 01', v_branch_id, true, 500000.00)
  ON CONFLICT DO NOTHING;

  -- 9. SEED PROMO
  INSERT INTO public.promos (promo_code, name, discount_type, discount_value, min_purchase, is_active)
  VALUES 
    ('DISKONMEMBER', 'Diskon Spesial Member 10%', 'PERCENTAGE', 10.00, 50000.00, true),
    ('HEMAT15RB',    'Potongan Langsung 15 Ribu',  'FIXED',      15000.00, 100000.00, true)
  ON CONFLICT (promo_code) DO UPDATE SET discount_value = EXCLUDED.discount_value;

  -- 10. SEED SUPER ADMIN PROFILE UNTUK vrimae23@gmail.com JIKA BELUM ADA
  -- Catatan: Profil akan tersinkron otomatis saat registrasi via trigger auth.users,
  -- namun baris ini memastikan bahwa jika id auth ada atau dicari, rolenya adalah 'owner'
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'vrimae23@gmail.com') THEN
    UPDATE public.profiles 
    SET role = 'owner', is_active = true 
    WHERE email = 'vrimae23@gmail.com';
  END IF;

END $$;
