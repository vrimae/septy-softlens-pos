"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PromosPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Master Promo</h1>
          <p className="text-gray-500 mt-1">Kelola daftar promo diskon, harga khusus, dan Beli X Gratis Y.</p>
        </div>
        <Button className="bg-[#1c5ffb] hover:bg-blue-700 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
          + Tambah Promo
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Status</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Nama Promo</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Jenis</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Target</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Periode</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-16 text-gray-500 font-medium">
                Belum ada promo yang ditambahkan.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
