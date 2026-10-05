"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

export default function RiwayatTransaksiPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Riwayat Transaksi</h1>
        <p className="text-gray-500 mt-1">Pantau seluruh riwayat penjualan dan cetak ulang struk.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <div className="p-4 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari ID, Nama Pelanggan, atau Kasir..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-sm text-gray-500">Menampilkan 0 transaksi terakhir</span>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">ID & Waktu</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Cabang</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Kasir</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Pelanggan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Total Pembayaran</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Status</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-16 text-gray-500 font-medium border-b-0">
                Tidak ada riwayat transaksi ditemukan.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
