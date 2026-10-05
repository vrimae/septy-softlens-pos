"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, PackageSearch, Wallet, AlertTriangle, Truck, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function OwnerDashboardPage() {
  const [totalOmzet, setTotalOmzet] = useState(0);
  const [totalLaba, setTotalLaba] = useState(0);
  const [asetStok, setAsetStok] = useState(0);
  const [saldoKas, setSaldoKas] = useState(0);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Omzet
      const { data: salesData } = await supabase.from('sales').select('total_amount');
      if (salesData) {
        setTotalOmzet(salesData.reduce((acc, curr) => acc + (curr.total_amount || 0), 0));
      }

      // HPP Stok
      const { data: productsData } = await supabase.from('products').select('cost_price, stock_global');
      if (productsData) {
        setAsetStok(productsData.reduce((acc, curr) => acc + ((curr.cost_price || 0) * (curr.stock_global || 0)), 0));
      }

      // Saldo Kas Utama
      const { data: kasData } = await supabase.from('cash_registers').select('balance');
      if (kasData) {
        setSaldoKas(kasData.reduce((acc, curr) => acc + (curr.balance || 0), 0));
      }

      // Laba = Omzet - HPP barang terjual
      const { data: saleItemsData } = await supabase.from('sale_items').select('price_at_sale, cost_at_sale, qty');
      if (saleItemsData) {
        const laba = saleItemsData.reduce((acc, curr) => {
          const revenue = (curr.price_at_sale || 0) * (curr.qty || 0);
          const hpp = (curr.cost_at_sale || 0) * (curr.qty || 0);
          return acc + (revenue - hpp);
        }, 0);
        setTotalLaba(laba);
      }

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Banner */}
      <div className="bg-[#2b3ff0] rounded-2xl p-8 text-white relative overflow-hidden shadow-md">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Executive Dashboard (Owner)</h1>
          <p className="text-blue-100 font-medium mb-6">Pusat kendali komprehensif aset, arus kas, dan performa cabang.</p>
          <button className="bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-bold px-4 py-2.5 rounded-lg backdrop-blur-sm">
            Menampilkan Data: Semua Cabang (REAL TIME)
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Total Omzet Keseluruhan</p>
          <h3 className="text-3xl font-black text-gray-900">Rp {totalOmzet.toLocaleString()}</h3>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center mb-4">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Total Laba Kotor</p>
          <h3 className="text-3xl font-black text-gray-900">Rp {totalLaba.toLocaleString()}</h3>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-4">
            <PackageSearch className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Nilai Aset Stok (HPP)</p>
          <h3 className="text-3xl font-black text-gray-900">Rp {asetStok.toLocaleString()}</h3>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center mb-4">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Saldo Kas Toko Utama</p>
          <h3 className="text-3xl font-black text-gray-900">Rp {saldoKas.toLocaleString()}</h3>
        </Card>
      </div>

      {/* Charts section placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-gray-100 shadow-sm p-6 lg:col-span-2 flex items-center justify-center h-64 text-gray-400 font-bold">
          [ Area Grafik Tren Omzet Live ]
        </Card>
        <Card className="rounded-2xl border-gray-100 shadow-sm p-6 flex items-center justify-center h-64 text-gray-400 font-bold">
          [ Top 5 Kategori ]
        </Card>
      </div>
    </div>
  );
}
