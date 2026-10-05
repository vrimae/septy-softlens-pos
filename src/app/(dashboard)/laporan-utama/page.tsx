"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LaporanUtamaPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan Utama</h1>
          <p className="text-gray-500 mt-1">Ringkasan komprehensif bisnis Anda.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white hover:bg-gray-50 font-semibold shadow-sm h-11 px-5 border-gray-200">
            Filter Lanjut
          </Button>
          <Button className="bg-[#00a84e] hover:bg-green-600 text-white font-semibold shadow-sm h-11 px-5">
            Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Penjualan */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">1. Penjualan</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#f0f4ff] rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#1c5ffb] mb-1">Omzet</p>
              <div className="text-3xl font-black text-[#1c5ffb]">Rp 0</div>
            </div>
            <div className="bg-green-50 rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-green-500 mb-1">Laba Kotor</p>
              <div className="text-3xl font-black text-green-500">Rp 0</div>
            </div>
            <div className="bg-[#f0f4ff] rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#1c5ffb] mb-1">Jml Transaksi</p>
              <div className="text-3xl font-black text-[#1c5ffb]">0 <span className="text-base font-bold">struk</span></div>
            </div>
            <div className="bg-[#fff7ed] rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#ea580c] mb-1">Jml Pcs Terjual</p>
              <div className="text-3xl font-black text-[#ea580c]">0 <span className="text-base font-bold">pcs</span></div>
            </div>
          </div>
        </section>

        {/* 2. Kinerja SP */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">2. Kinerja SP</h2>
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white border-b border-gray-100">
                <TableHead className="font-bold text-gray-700 py-3">Rank</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">SP / Kasir</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Omzet</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Laba</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Transaksi</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Pcs</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Upselling</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Target (Barang)</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-right">Insentif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-gray-500 font-medium border-b-0">
                  Tidak ada data kinerja SP.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        {/* 3. Analisis Produk */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">3. Analisis Produk</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#f0f4ff] rounded-xl p-4 flex items-center justify-center min-h-[100px] border border-transparent">
              <span className="font-bold text-[#1c5ffb]">Top 5 Barang Terlaris (Pcs)</span>
            </div>
            <div className="bg-red-50 rounded-xl p-4 flex items-center justify-center min-h-[100px] border border-transparent">
              <span className="font-bold text-red-500">Top 5 Barang Paling Tidak Laris</span>
            </div>
            <div className="bg-green-50 rounded-xl p-4 flex items-center justify-center min-h-[100px] border border-transparent">
              <span className="font-bold text-green-500">Top 5 Laba Rupiah Terbesar</span>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-center min-h-[100px] border border-transparent">
              <span className="font-bold text-blue-600">Top 5 Margin Profit (%) Terbesar</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
