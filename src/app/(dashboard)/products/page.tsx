"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, UploadCloud } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Master Barang</h1>
          <p className="text-gray-500 mt-1">Kelola data stok dan harga produk softlens.</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-[#00a84e] hover:bg-green-600 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
            <Plus className="h-4 w-4 mr-2" /> Tambah Produk Baru
          </Button>
          <Button className="bg-[#2662fa] hover:bg-blue-700 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
            <UploadCloud className="h-4 w-4 mr-2" /> Upload Excel
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <input 
              type="text"
              placeholder="Cari nama barang atau kode..."
              className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0">
              <TableHead className="font-bold text-gray-600 py-4 px-6">Kode</TableHead>
              <TableHead className="font-bold text-gray-600 py-4 px-6">Nama Produk</TableHead>
              <TableHead className="font-bold text-gray-600 py-4 px-6">Kategori</TableHead>
              <TableHead className="font-bold text-gray-600 py-4 px-6">Harga (Reguler/VIP/VIP)</TableHead>
              <TableHead className="font-bold text-gray-600 py-4 px-6 text-right">Stok</TableHead>
              <TableHead className="font-bold text-gray-600 py-4 px-6 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-16 text-gray-500">
                Belum ada data barang.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
