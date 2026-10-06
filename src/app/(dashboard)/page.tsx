"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2 } from "lucide-react";

export default function DashboardPage() {
  const { role } = useAuth();
  
  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-normal">Halo, {role === 'owner' ? 'Owner' : 'Kasir'}!</h1>
          <p className="text-gray-500 mt-1">Ringkasan aktivitas dan performa sistem.</p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm font-semibold text-gray-700">Sistem POS Aktif & Tersinkronisasi</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 font-medium text-xs rounded-lg">Omzet</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL OMZET BULAN INI</p>
              <div className="text-2xl font-semibold text-gray-900">Rp 0</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <span className="inline-block px-3 py-1 bg-green-50 text-green-500 font-medium text-xs rounded-lg">Laba</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">LABA KOTOR BULAN INI</p>
              <div className="text-2xl font-semibold text-gray-900">Rp 0</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <span className="inline-block px-3 py-1 bg-purple-50 text-purple-500 font-medium text-xs rounded-lg">Transaksi</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL TRANSAKSI</p>
              <div className="text-2xl font-semibold text-gray-900">0 <span className="text-xl">Trx</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-gray-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <span className="inline-block px-3 py-1 bg-orange-50 text-orange-500 font-medium text-xs rounded-lg">Upselling</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL UPSELLING</p>
              <div className="text-2xl font-semibold text-gray-900">0 <span className="text-xl">Transaksi</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart Placeholder */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Grafik Laba Kotor Harian (Bulan Ini)</h3>
        <div className="h-64 border-l border-b border-gray-300 relative w-full flex items-end">
          {/* Y Axis labels */}
          <div className="absolute -left-6 top-0 h-full flex flex-col justify-between text-xs text-gray-400 py-2">
            <span>4</span>
            <span>3</span>
            <span>2</span>
            <span>1</span>
            <span>0</span>
          </div>
          
          {/* X Axis labels */}
          <div className="absolute -bottom-6 left-0 w-full flex justify-between text-xs text-gray-400 px-4">
            <span>1</span>
            <span>3</span>
            <span>5</span>
            <span>7</span>
            <span>9</span>
            <span>11</span>
            <span>13</span>
            <span>15</span>
            <span>17</span>
            <span>19</span>
            <span>21</span>
            <span>23</span>
            <span>25</span>
            <span>27</span>
            <span>29</span>
            <span>31</span>
          </div>
        </div>
      </div>

      {/* SP Ranking Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#ff4f20] px-6 py-4 text-white font-bold text-lg">
          Papan Peringkat SP (Bulan Ini)
        </div>
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="border-b-0 hover:bg-white">
              <TableHead className="font-bold text-gray-900 py-5">Peringkat</TableHead>
              <TableHead className="font-bold text-gray-900 py-5">Nama SP</TableHead>
              <TableHead className="font-bold text-gray-900 py-5">Total Transaksi</TableHead>
              <TableHead className="font-bold text-gray-900 py-5">Upselling</TableHead>
              <TableHead className="font-bold text-gray-900 py-5 text-right">Target Barang Tercapai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                Belum ada data peringkat.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
