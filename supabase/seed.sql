-- Seed Data for Septy Softlens POS

-- Seed Store Settings
INSERT INTO public.store_settings (store_name, address, phone, receipt_footer)
VALUES ('Septy Softlens', 'Jl. Contoh Optik No. 123, Jakarta', '081234567890', 'Terima kasih atas kunjungan Anda. Barang yang sudah dibeli tidak dapat ditukar.');

-- Seed Products
INSERT INTO public.products (name, brand, type, color, diameter, base_curve, power, duration, sku, barcode, cost_price, sell_price, stock_qty)
VALUES 
('X2 Bio Color', 'X2', 'Color', 'Blue', 14.5, 8.6, -1.00, 'Monthly', 'X2-BIO-BLU-100', '100000000001', 35000, 75000, 50),
('Acuvue Oasys', 'Acuvue', 'Clear', 'Clear', 14.0, 8.4, -2.50, 'Daily', 'ACU-OAS-CLR-250', '100000000002', 150000, 250000, 20),
('Dreamcolor 1', 'Dreamcolor', 'Color', 'Grey', 14.2, 8.6, 0.00, 'Monthly', 'DRM-COL-GRY-000', '100000000003', 45000, 85000, 30);

-- Seed Customers
INSERT INTO public.customers (name, phone, address, prescription_notes)
VALUES 
('Pelanggan Umum', '000000000000', '-', '-'),
('Andi', '08111111111', 'Jl. Melati', 'Kanan: -1.00, Kiri: -1.25');

-- Seed Suppliers
INSERT INTO public.suppliers (name, phone, address)
VALUES 
('PT. Optik Indo', '0219999999', 'Jakarta Barat');
