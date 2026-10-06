"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, PackageSearch, Wallet, AlertTriangle, Truck, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { reportsService } from "@/lib/services";

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
      const metrics = await reportsService.getDashboardMetrics();
      if (metrics) {
        setTotalOmzet(metrics.gross_sales || 0);
        setTotalLaba(metrics.gross_profit || 0);
      }

      // HPP Stok
      const { data: productsData } = await supabase.from('products').select('cost_price, stock_global');
      if (productsData) {
        setAsetStok(productsData.reduce((acc, curr) => acc + ((curr.cost_price || 0) * (curr.stock_global || 0)), 0));
      }

      // Saldo Kas Utama
      const { data: kasData } = await supabase.from('cash_registers').select('balance');
      if (kasData) {
        setSaldoKas(kasData.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Banner */}
      <div className="bg-slate-900 rounded-xl p-8 text-white relative overflow-hidden shadow-sm">
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold mb-2 tracking-normal">Executive Dashboard (Owner)</h1>
          <p className="text-slate-300 font-medium mb-6">Pusat kendali komprehensif aset, arus kas, dan performa cabang.</p>
          <button 
            onClick={() => alert("Menampilkan data Real Time dari semua cabang aktif...")}
            className="bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-bold px-4 py-2.5 rounded-lg backdrop-blur-sm"
          >
            Menampilkan Data: Semua Cabang (REAL TIME)
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Total Omzet Keseluruhan</p>
          <h3 className="text-2xl font-semibold text-gray-900">Rp {totalOmzet.toLocaleString()}</h3>
        </Card>

        <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center mb-4">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Total Laba Kotor</p>
          <h3 className="text-2xl font-semibold text-gray-900">Rp {totalLaba.toLocaleString()}</h3>
        </Card>

        <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-4">
            <PackageSearch className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Nilai Aset Stok (HPP)</p>
          <h3 className="text-2xl font-semibold text-gray-900">Rp {asetStok.toLocaleString()}</h3>
        </Card>

        <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center mb-4">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Saldo Kas Toko Utama</p>
          <h3 className="text-2xl font-semibold text-gray-900">Rp {saldoKas.toLocaleString()}</h3>
        </Card>
      </div>

      {/* Charts section placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-xl border-gray-100 shadow-sm p-6 lg:col-span-2 flex items-center justify-center h-64 text-gray-400 font-bold">
          [ Area Grafik Tren Omzet Live ]
        </Card>
        <Card className="rounded-xl border-gray-100 shadow-sm p-6 flex items-center justify-center h-64 text-gray-400 font-bold">
          [ Top 5 Kategori ]
        </Card>
      </div>
    </div>
  );
}
