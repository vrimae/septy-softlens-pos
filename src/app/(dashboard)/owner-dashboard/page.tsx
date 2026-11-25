"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, PackageSearch, Wallet, AlertTriangle, Truck, ArrowUpRight, ArrowDownRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { reportsService } from "@/lib/services";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OwnerDashboardPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role && role !== "owner") router.push("/pos");
  }, [role, loading, router]);

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

      const { data: productsData } = await supabase.from('products').select('cost_price, stock_global');
      if (productsData) {
        setAsetStok(productsData.reduce((acc, curr) => acc + ((curr.cost_price || 0) * (curr.stock_global || 0)), 0));
      }

      const { data: kasData } = await supabase.from('cash_registers').select('balance');
      if (kasData) {
        setSaldoKas(kasData.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (role !== "owner") return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Banner */}
      <div className="bg-[#2539c3] rounded-2xl p-8 text-white relative overflow-hidden shadow-sm">
        <div className="absolute -right-10 -top-10 opacity-10">
          <ShieldCheck className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2 tracking-normal">Executive Dashboard (Owner)</h1>
          <p className="text-blue-100 font-medium mb-6 text-sm">Pusat kendali komprehensif aset, arus kas, dan performa cabang.</p>
          <button 
            onClick={() => alert("Menampilkan data Real Time dari semua cabang aktif...")}
            className="bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-bold px-4 py-2.5 rounded-lg backdrop-blur-sm"
          >
            Menampilkan Data: Semua Cabang
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-gray-100 dark:border-gray-800/50 shadow-sm overflow-hidden p-6 hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Total Omzet Keseluruhan</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rp {totalOmzet.toLocaleString('id-ID')}</h3>
        </Card>

        <Card className="rounded-2xl border-gray-100 dark:border-gray-800/50 shadow-sm overflow-hidden p-6 hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-lg flex items-center justify-center mb-4">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Total Laba Kotor</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rp {totalLaba.toLocaleString('id-ID')}</h3>
        </Card>

        <Card className="rounded-2xl border-gray-100 dark:border-gray-800/50 shadow-sm overflow-hidden p-6 hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center mb-4">
            <PackageSearch className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nilai Aset Stok (HPP)</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rp {asetStok.toLocaleString('id-ID')}</h3>
        </Card>

        <Card className="rounded-2xl border-gray-100 dark:border-gray-800/50 shadow-sm overflow-hidden p-6 hover:shadow-sm transition-shadow">
          <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center mb-4">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Saldo Kas Toko Utama</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rp {saldoKas.toLocaleString('id-ID')}</h3>
        </Card>
      </div>

      {/* Warning Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-l-4 border-l-red-500 border-gray-100 shadow-sm p-6 relative">
          <AlertTriangle className="absolute top-6 right-6 h-5 w-5 text-red-500" />
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Stok Mengendap {`>`}30 Hari</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Rp 0</h3>
          <p className="text-xs text-gray-400">Terdiri dari 0 jenis barang</p>
        </Card>
        
        <Card className="rounded-2xl border-l-4 border-l-orange-500 border-gray-100 shadow-sm p-6 relative">
          <Truck className="absolute top-6 right-6 h-5 w-5 text-orange-500" />
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Total Utang Supplier (Jatuh Tempo)</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Rp 0</h3>
          <p className="text-xs text-gray-400">Belum Lunas: 0 Faktur</p>
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-yellow-500 border-gray-100 shadow-sm p-6 relative">
          <ArrowDownRight className="absolute top-6 right-6 h-5 w-5 text-yellow-500" />
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Piutang Internal (Kasir/Selisih)</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Rp 0</h3>
          <p className="text-xs text-gray-400">Uang fisik yang ditalangi Kas Toko</p>
        </Card>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm p-6 lg:col-span-2 h-[350px] flex flex-col">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-6">Tren Omzet (7 Hari Terakhir)</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={Array.from({ length: 7 }, (_, i) => ({
                  name: ['Kam, 1', 'Jum, 2', 'Sab, 3', 'Min, 4', 'Sen, 5', 'Sel, 6', 'Rab, 7'][i],
                  omzet: 0
                }))} 
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  axisLine={{ stroke: '#9ca3af' }} 
                  tickLine={{ stroke: '#9ca3af' }}
                  tickMargin={12}
                />
                <YAxis 
                  tickFormatter={(val) => val === 0 ? "0k" : (val > 1000 ? (val/1000) + 'k' : val)}
                  tick={{ fontSize: 11, fill: '#6b7280' }} 
                  axisLine={{ stroke: '#9ca3af' }} 
                  tickLine={{ stroke: '#9ca3af' }}
                  width={50}
                  domain={[0, 'auto']}
                  allowDecimals={false}
                />
                <Tooltip 
                  formatter={(value: any) => ['Rp ' + Number(value).toLocaleString('id-ID'), 'Omzet']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                />
                <Area type="monotone" dataKey="omzet" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.1} fill="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm p-6 h-[350px]">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-6">Kategori Terlaris (Top 5)</h3>
          <div className="flex items-center justify-center h-full text-gray-400 pb-10">
            Belum ada data.
          </div>
        </Card>
      </div>
    </div>
  );
}
