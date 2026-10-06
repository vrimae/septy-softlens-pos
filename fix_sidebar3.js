const fs = require('fs');
let file = 'src/components/layout/sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Dashboard Kasir with Dashboard Utama
content = content.replace('Dashboard Kasir', 'Dashboard Utama');

// We need to hide the Menu Utama section for non-owners, or at least the dashboard links.
// Let's find the "MENU UTAMA" section.
content = content.replace(
  '<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Menu Utama</p>',
  '{role === "owner" && (<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Menu Utama</p>)}'
);

content = content.replace(
  '<li>\\n                <Link\\n                  href="/owner-dashboard"',
  '{role === "owner" && (<li>\\n                <Link\\n                  href="/owner-dashboard"'
);

// We need to carefully wrap the <li> tags.
// I will just use regex to wrap the whole Dashboard items.
