"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ReturnsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Retur / Tukar Barang</h1>
          <p className="text-gray-500 mt-1">Kebijakan retur fleksibel. Hanya melayani tukar barang.</p>
        </div>
        <Button className="bg-[#1c5ffb] hover:bg-blue-700 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
          + Proses Retur / Tukar
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1 mt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0">
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">ID</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Tanggal</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Transaksi Asal</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Barang</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Qty</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Alasan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Tujuan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Tukar Dengan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Selisih</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Pelaku</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={10} className="text-center py-16 text-gray-500 font-medium border-b-0">
                Belum ada catatan retur.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
