"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

export default function SuppliersPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan & Utang Supplier</h1>
        <p className="text-gray-500 mt-1">Kelola data pembelian, riwayat harga, dan cicilan utang.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-red-100 shadow-sm bg-red-50/50">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-red-500 mb-2">Total Utang Berjalan</h3>
            <div className="text-3xl font-black text-red-500">Rp 0</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 shadow-sm bg-white">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-gray-500 mb-2">Filter Supplier</h3>
            <div className="relative">
              <select className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-700 font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>Semua Supplier</option>
              </select>
              <ChevronDown className="absolute right-4 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 px-4">
          <button className="px-6 py-4 text-sm font-bold text-red-500 border-b-2 border-red-500 bg-red-50/30">
            Tagihan & Utang
          </button>
          <button className="px-6 py-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
            Laporan Riwayat Pembelian
          </button>
        </div>
        
        <div className="p-1">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white border-b-0">
                <TableHead className="font-bold text-gray-700 py-4 px-6">PO / Supplier</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Tanggal & Jatuh Tempo</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Total Utang</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Sisa Utang</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Status</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-400 font-medium border-b-0">
                  Tidak ada data tagihan / utang.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
