"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText,
  Settings,
  ArrowRightLeft,
  Banknote,
  RotateCcw
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Kasir (POS)", href: "/pos", icon: ShoppingCart },
  { name: "Master Produk", href: "/products", icon: Package },
  { name: "Pelanggan", href: "/customers", icon: Users },
  { name: "Pembelian", href: "/purchases", icon: ArrowRightLeft },
  { name: "Pengeluaran", href: "/expenses", icon: Banknote },
  { name: "Retur", href: "/returns", icon: RotateCcw },
  { name: "Laporan", href: "/reports", icon: FileText },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 font-bold text-xl border-b border-slate-800">
        Septy POS
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    ? "bg-slate-800 text-teal-400"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
