const fs = require('fs');
let sql = fs.readFileSync('supabase/MASTER_SETUP.sql', 'utf8');

// Fix branches
sql = sql.replace(/branch_code, /g, '');
sql = sql.replace(/'BR-01', /g, '');
sql = sql.replace(/ON CONFLICT \(branch_code\)/g, 'ON CONFLICT (name)');

// Fix store_settings
const storeSettingsOld = /INSERT INTO public\.store_settings \([\s\S]*?ON CONFLICT DO NOTHING;/m;
const storeSettingsNew = "INSERT INTO public.store_settings (store_name, receipt_footer, phone, address, tax_percent, enable_incentives, incentive_per_item) VALUES ('Septy Softlens', 'Terima kasih atas kunjungan Anda! Lensa nyaman, mata sehat.', '0812-3456-7890', 'Jl. Malioboro No. 45, Yogyakarta', 0.00, true, 1000.00);";
sql = sql.replace(storeSettingsOld, storeSettingsNew);

// Fix categories
const catOld = /INSERT INTO public\.categories \(id, name, code, description\) VALUES[\s\S]*?ON CONFLICT DO NOTHING;/m;
const catNew = "INSERT INTO public.categories (id, name, target_margin, target_margin_percent, use_expired, track_expired) VALUES (v_cat_normal, 'Softlens Normal', 15.00, 15.00, false, false), (v_cat_minus, 'Softlens Minus', 20.00, 20.00, false, false), (v_cat_color, 'Softlens Warna', 25.00, 25.00, false, false) ON CONFLICT (name) DO NOTHING;";
sql = sql.replace(catOld, catNew);

fs.writeFileSync('supabase/MASTER_SETUP.sql', sql);
console.log('Fixed MASTER_SETUP.sql');
