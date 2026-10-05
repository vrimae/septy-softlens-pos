"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SlowMovingPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan Stok Mengendap</h1>
          <p className="text-gray-500 mt-1">Temukan uang yang tertahan dalam stok yang tidak bergerak.</p>
        </div>
        <div className="bg-[#fff7ed] border border-[#ffedd5] px-6 py-3 rounded-xl shadow-sm text-right">
          <p className="text-xs font-bold text-[#ea580c] uppercase tracking-wider mb-1">Total Modal Tertahan</p>
          <p className="text-2xl font-black text-[#ea580c]">Rp 0</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex gap-6 items-center">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Filter Tidak Laku:</label>
          <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option>≥ 1 Bulan</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Urutkan Berdasarkan:</label>
          <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option>Paling Lama Tidak Laku</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Produk</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Stok</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Umur Barang</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Terakhir Laku</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Modal Tertahan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi Cepat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-16 text-gray-500 font-medium border-b-0">
                <div className="text-lg font-bold text-gray-600 mb-2">Stok Sehat!</div>
                Tidak ada stok mengendap yang sesuai filter.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
