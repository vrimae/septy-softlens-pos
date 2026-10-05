"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, PackageSearch, Wallet, AlertTriangle, Truck, ArrowUpRight } from "lucide-react";

export default function OwnerDashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Banner */}
      <div className="bg-[#2b3ff0] rounded-2xl p-8 text-white relative overflow-hidden shadow-md">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Executive Dashboard (Owner)</h1>
          <p className="text-blue-100 font-medium mb-6">Pusat kendali komprehensif aset, arus kas, dan performa cabang.</p>
          <button className="bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-bold px-4 py-2.5 rounded-lg backdrop-blur-sm">
            Menampilkan Data: Semua Cabang
          </button>
        </div>
        {/* Decorative shield background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-8 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-48 h-48">
            <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Total Omzet Keseluruhan</p>
          <h3 className="text-3xl font-black text-gray-900">Rp 0</h3>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center mb-4">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Total Laba Kotor</p>
          <h3 className="text-3xl font-black text-gray-900">Rp 0</h3>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-4">
            <PackageSearch className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Nilai Aset Stok (HPP)</p>
          <h3 className="text-3xl font-black text-gray-900">Rp 0</h3>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center mb-4">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">Saldo Kas Toko Utama</p>
          <h3 className="text-3xl font-black text-gray-900">Rp 0</h3>
        </Card>
      </div>

      {/* Warning/Alert KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-l-4 border-l-red-500 border-t-gray-100 border-r-gray-100 border-b-gray-100 shadow-sm p-5 flex justify-between items-start">
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-1">Stok Mengendap (&gt;30 Hari)</h4>
            <h3 className="text-2xl font-black text-gray-900 mb-1">Rp 0</h3>
            <p className="text-xs text-gray-400">Terdiri dari 0 jenis barang</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-orange-500 border-t-gray-100 border-r-gray-100 border-b-gray-100 shadow-sm p-5 flex justify-between items-start">
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-1">Total Utang Supplier (Jatuh Tempo)</h4>
            <h3 className="text-2xl font-black text-gray-900 mb-1">Rp 0</h3>
            <p className="text-xs text-gray-400">Belum Lunas: 0 Faktur</p>
          </div>
          <Truck className="h-5 w-5 text-orange-500" />
        </Card>

        <Card className="rounded-2xl border-l-4 border-l-yellow-400 border-t-gray-100 border-r-gray-100 border-b-gray-100 shadow-sm p-5 flex justify-between items-start">
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-1">Piutang Internal (Kasir/Selisih)</h4>
            <h3 className="text-2xl font-black text-gray-900 mb-1">Rp 0</h3>
            <p className="text-xs text-gray-400">Uang fisik yang ditalangi Kas Toko</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-yellow-500 rotate-45" />
        </Card>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-gray-100 shadow-sm p-6 lg:col-span-2">
          <h3 className="font-bold text-gray-900 mb-6">Tren Omzet (7 Hari Terakhir)</h3>
          <div className="h-[250px] w-full flex items-end relative border-l border-b border-gray-200 p-2">
            {/* Chart Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 -ml-10 flex flex-col justify-between text-[10px] text-gray-400 h-full py-2">
              <span>0.004k</span>
              <span>0.003k</span>
              <span>0.002k</span>
              <span>0.001k</span>
              <span>0k</span>
            </div>
            
            {/* Chart line placeholder */}
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <polyline points="0,100 16,100 33,100 50,100 66,100 83,100 100,100" fill="none" stroke="#1c5ffb" strokeWidth="1.5" />
              <circle cx="0" cy="100" r="2" fill="white" stroke="#1c5ffb" strokeWidth="1.5" />
              <circle cx="16" cy="100" r="2" fill="white" stroke="#1c5ffb" strokeWidth="1.5" />
              <circle cx="33" cy="100" r="2" fill="white" stroke="#1c5ffb" strokeWidth="1.5" />
              <circle cx="50" cy="100" r="2" fill="white" stroke="#1c5ffb" strokeWidth="1.5" />
              <circle cx="66" cy="100" r="2" fill="white" stroke="#1c5ffb" strokeWidth="1.5" />
              <circle cx="83" cy="100" r="2" fill="white" stroke="#1c5ffb" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="2" fill="white" stroke="#1c5ffb" strokeWidth="1.5" />
            </svg>
            
            {/* Chart X-axis labels */}
            <div className="absolute left-0 right-0 -bottom-6 flex justify-between text-[10px] text-gray-400 px-2">
              <span>Rab, 30</span>
              <span>Kam, 1</span>
              <span>Jum, 2</span>
              <span>Sab, 3</span>
              <span>Min, 4</span>
              <span>Sen, 5</span>
              <span>Sel, 6</span>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-6">Kategori Terlaris (Top 5)</h3>
          <div className="h-[250px] w-full flex items-center justify-center">
            {/* Pie chart placeholder */}
            <div className="w-40 h-40 rounded-full border-8 border-gray-100 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-gray-400">Data belum cukup</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-6">Perbandingan Omzet Antar Cabang</h3>
        <div className="h-[300px] w-full border-l border-b border-gray-200"></div>
      </Card>

    </div>
  );
}
