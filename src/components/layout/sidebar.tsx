"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAuth();
  
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'master': pathname.includes('/products') || pathname.includes('/categories') || pathname.includes('/customers') || pathname.includes('/promos') || pathname.includes('/rewards'),
    'transaksi': pathname.includes('/approvals') || pathname.includes('/pos') || pathname.includes('/riwayat-transaksi') || pathname.includes('/tutup-kas') || pathname.includes('/returns'),
    'gudang': pathname.includes('/purchases') || pathname.includes('/suppliers') || pathname.includes('/slow-moving') || pathname.includes('/warehouse') || pathname.includes('/restock'),
    'keuangan': pathname.includes('/cashflow') || pathname.includes('/laporan-utama') || pathname.includes('/reports'),
  });

  useEffect(() => {
    if (pathname.includes('/products') || pathname.includes('/categories') || pathname.includes('/customers') || pathname.includes('/promos') || pathname.includes('/rewards')) {
      setOpenMenus(prev => ({ ...prev, master: true }));
    }
    if (pathname.includes('/approvals') || pathname.includes('/pos') || pathname.includes('/riwayat-transaksi') || pathname.includes('/tutup-kas') || pathname.includes('/returns')) {
      setOpenMenus(prev => ({ ...prev, transaksi: true }));
    }
    if (pathname.includes('/purchases') || pathname.includes('/suppliers') || pathname.includes('/slow-moving') || pathname.includes('/warehouse') || pathname.includes('/restock')) {
      setOpenMenus(prev => ({ ...prev, gudang: true }));
    }
    if (pathname.includes('/cashflow') || pathname.includes('/laporan-utama') || pathname.includes('/reports')) {
      setOpenMenus(prev => ({ ...prev, keuangan: true }));
    }
  }, [pathname]);

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { 
      title: 'Master Data', icon: Box, key: 'master',
      children: [
        { title: 'Master Barang', href: '/products' },
        { title: 'Kategori Barang', href: '/categories' },
        { title: 'Pelanggan', href: '/customers' },
        { title: 'Master Promo', href: '/promos' },
        { title: 'Master Reward (...)', href: '/rewards' },
      ]
    },
    { 
      title: 'Transaksi', icon: ShoppingCart, key: 'transaksi',
      children: [
        { title: 'Approval Owner', href: '/approvals' },
        { title: 'Kasir (POS)', href: '/pos' },
        { title: 'Riwayat Transaksi', href: '/riwayat-transaksi' },
        { title: 'Tutup Kas', href: '/tutup-kas' },
        { title: 'Retur / Tukar', href: '/returns' },
      ]
    },
    { 
      title: 'Gudang & Supplier', icon: Store, key: 'gudang',
      children: [
        { title: 'Restock Barang', href: '/purchases' },
        { title: 'Utang Supplier', href: '/suppliers' },
        { title: 'Stok Mengendap', href: '/slow-moving' },
        { title: 'Barang Bermasa...', href: '/warehouse' },
        { title: 'AI Restock', href: '/restock' },
      ]
    },
    { 
      title: 'Keuangan & Laporan', icon: Wallet, key: 'keuangan',
      children: [
        { title: 'Buku Kas', href: '/cashflow' },
        { title: 'Laporan Utama', href: '/laporan-utama' },
        { title: 'Laporan (Lama)', href: '/reports' },
      ]
    },
    { title: 'Sistem & Admin', icon: Settings, key: 'sistem' },
  ];

  return (
    <aside className="w-[280px] bg-white border-r border-gray-100 flex-col hidden md:flex h-full shrink-0">
      <div className="h-20 flex items-center px-6 gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 font-bold italic text-xs shadow-sm">
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
            className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-4">
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">KONTINER AKTIF</p>
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2.5 px-3 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Building className="h-4 w-4 text-[#64748b]" />
              <span>Semua Cabang (Glob...</span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div>
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.title}>
                {item.children ? (
                  <>
                    <button 
                      onClick={() => toggleMenu(item.key!)}
                      className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors", 
                        openMenus[item.key!] ? "text-gray-900" : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-md", openMenus[item.key!] ? "bg-gray-100 text-gray-700" : "bg-gray-50 text-gray-500")}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        {item.title}
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", openMenus[item.key!] ? "rotate-180" : "-rotate-90")} />
                    </button>
                    {openMenus[item.key!] && (
                      <ul className="mt-1 mb-2 ml-10 border-l border-gray-100 pl-4 space-y-1 py-1">
                        {item.children.map(child => (
                          <li key={child.title}>
                            <Link 
                              href={child.href} 
                              className={cn(
                                "block py-2 text-sm font-semibold transition-colors px-3 -ml-3 rounded-md",
                                pathname === child.href ? "text-[#1c5ffb] bg-[#f0f4ff]" : "text-gray-500 hover:text-gray-900"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {pathname === child.href && <item.icon className="h-3.5 w-3.5 opacity-80" />}
                                {child.title}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href!}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                      pathname === item.href ? "bg-[#f0f4ff] text-[#1c5ffb]" : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-1.5 rounded-md", pathname === item.href ? "bg-[#1c5ffb] text-white shadow-sm" : "bg-gray-50 text-gray-500")}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      {item.title}
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 shrink-0 space-y-2">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
          <Settings className="h-4 w-4 text-gray-400" />
          Profil Toko
        </Link>
        <div 
          onClick={handleLogout}
          className="flex items-center justify-between p-3 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1c5ffb] text-white flex items-center justify-center font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 capitalize">{role || 'Owner'}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{role || 'Owner'}</p>
            </div>
          </div>
          <LogOut className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </aside>
  );
}
