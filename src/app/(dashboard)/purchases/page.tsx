"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PurchasesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pembelian Barang (PO)</h1>
          <p className="text-gray-500 mt-1">Catat belanja stok dari supplier pabrik secara lengkap.</p>
        </div>
        <Button className="bg-[#00a84e] hover:bg-green-600 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
          + Tambah Pembelian Baru
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">No. Internal</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Supplier & Inv</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Tanggal</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Status / Metode</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Total Biaya</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center py-16 text-gray-500 font-medium border-b-0">
                Belum ada riwayat pembelian.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
