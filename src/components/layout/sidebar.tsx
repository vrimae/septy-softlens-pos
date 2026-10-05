"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Box, 
  ShoppingCart, 
  Store, 
  Wallet,
  Settings,
  ChevronDown,
  Search,
  Building,
  LogOut,
  User,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAuth();
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'master': true,
  });

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-[280px] bg-white border-r border-gray-100 flex-col hidden md:flex h-full shrink-0">
      <div className="h-20 flex items-center px-6 gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 font-bold italic text-xs">
          Septy
        </div>
        <span className="font-extrabold text-xl tracking-tight text-gray-900">Septy Softlens</span>
      </div>

      <div className="px-6 pb-4 shrink-0">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari menu / fitur..." 
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">KONTINER AKTIF</p>
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2.5 px-3 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building className="h-4 w-4 text-blue-500" />
              <span>Semua Cabang (Glob...</span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">MENU UTAMA</p>
          <ul className="space-y-1">
            {/* Dashboard */}
            <li>
              <Link
                href="/"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                  pathname === "/" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <div className={cn("p-1.5 rounded-md", pathname === "/" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500")}>
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                Dashboard
              </Link>
            </li>

            {/* Master Data */}
            <li>
              <button 
                onClick={() => toggleMenu('master')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-gray-100 text-gray-500">
                    <Box className="h-4 w-4" />
                  </div>
                  Master Data
                </div>
                <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", openMenus['master'] ? "rotate-180" : "")} />
              </button>
              {openMenus['master'] && (
                <ul className="mt-1 mb-2 ml-10 border-l border-gray-100 pl-4 space-y-1 py-1">
                  <li>
                    <Link href="/products" className={cn("block py-2 text-sm font-medium transition-colors", pathname === "/products" ? "text-blue-600 bg-blue-50/50 rounded-md px-3 -ml-3" : "text-gray-500 hover:text-gray-900 px-3 -ml-3")}>
                      <div className="flex items-center gap-2">
                        {pathname === "/products" && <Box className="h-3.5 w-3.5" />}
                        Master Barang
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link href="/categories" className={cn("block py-2 text-sm font-medium transition-colors", pathname === "/categories" ? "text-blue-600 bg-blue-50/50 rounded-md px-3 -ml-3" : "text-gray-500 hover:text-gray-900 px-3 -ml-3")}>
                      <div className="flex items-center gap-2">
                        {pathname === "/categories" && <Box className="h-3.5 w-3.5" />}
                        Kategori Barang
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link href="/customers" className={cn("block py-2 text-sm font-medium transition-colors", pathname === "/customers" ? "text-blue-600 bg-blue-50/50 rounded-md px-3 -ml-3" : "text-gray-500 hover:text-gray-900 px-3 -ml-3")}>
                      Pelanggan
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="block py-2 px-3 -ml-3 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                      Master Promo
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="block py-2 px-3 -ml-3 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                      Master Reward (...)
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Transaksi */}
            <li>
              <button 
                onClick={() => toggleMenu('transaksi')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-gray-100 text-gray-500">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  Transaksi
                </div>
                <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", openMenus['transaksi'] ? "rotate-180" : "rotate-270")} />
              </button>
            </li>

            {/* Gudang & Supplier */}
            <li>
              <button 
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-gray-100 text-gray-500">
                    <Store className="h-4 w-4" />
                  </div>
                  Gudang & Supplier
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
              </button>
            </li>

            {/* Keuangan & Laporan */}
            <li>
              <button 
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-gray-100 text-gray-500">
                    <Wallet className="h-4 w-4" />
                  </div>
                  Keuangan & Laporan
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
              </button>
            </li>

            {/* Sistem & Admin */}
            <li>
              <button 
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-gray-100 text-gray-500">
                    <Settings className="h-4 w-4" />
                  </div>
                  Sistem & Admin
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 shrink-0 space-y-2">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
          <Settings className="h-4 w-4 text-gray-400" />
          Profil Toko
        </Link>
        <div 
          onClick={handleLogout}
          className="flex items-center justify-between p-3 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 capitalize">{role || 'Owner'}</p>
              <p className="text-xs text-gray-500 uppercase">{role || 'Owner'}</p>
            </div>
          </div>
          <LogOut className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </aside>
  );
}
