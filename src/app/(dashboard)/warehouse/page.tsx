"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default function WarehousePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Produk Gudang Barang Bermasalah</h1>
        <p className="text-gray-500 mt-1">Status dan tempat untuk barang rusak, retur, expired, dll yang menunggu keputusan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-gray-200 shadow-sm border p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-xl">0</div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pcs di Gudang</p>
            <p className="text-2xl font-black text-gray-900">Menunggu Keputusan</p>
          </div>
        </Card>

        <Card className="rounded-2xl border-gray-200 shadow-sm border p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-xl">Rp</div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nilai Modal Tertahan</p>
            <p className="text-2xl font-black text-gray-900">Rp 0</p>
          </div>
        </Card>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <div className="p-4 border-b border-gray-100">
          <input 
            type="text"
            placeholder="Cari barang..."
            className="w-full max-w-md px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Kode</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Nama Barang</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Kategori</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Qty Gudang</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Nilai Modal (Total)</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-16 text-gray-500 font-medium border-b-0">
                Tidak ada barang bermasalah di Gudang.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
