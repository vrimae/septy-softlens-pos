"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";

export default function CashflowPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Buku Kas & Kantong Kas</h1>
          <p className="text-gray-500 mt-1">Pantau pergerakan uang antar rekening dan laci kasir.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white hover:bg-gray-50 font-semibold shadow-sm h-11 px-5 border-gray-200">
            + Kantong Baru
          </Button>
          <Button className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-semibold shadow-sm h-11 px-5">
            Mutasi Antar Kas
          </Button>
          <Button className="bg-[#9333ea] hover:bg-purple-700 text-white font-semibold shadow-sm h-11 px-5">
            + Catat Arus Kas
          </Button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-2">
        {/* Kas Penjualan */}
        <Card className="min-w-[300px] rounded-2xl border border-green-200 shadow-sm overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-gray-900">Kas Penjualan (Toko)</h3>
              <button className="text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-6">Rp 0</div>
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Masuk</p>
                <p className="text-sm font-bold text-green-500">Rp 0</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Keluar</p>
                <p className="text-sm font-bold text-red-500">Rp 0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kas Toko (Utama) */}
        <Card className="min-w-[300px] rounded-2xl border border-green-500 shadow-sm overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-gray-900">Kas Toko (Utama)</h3>
              <button className="text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-6">Rp 0</div>
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Masuk</p>
                <p className="text-sm font-bold text-green-500">Rp 0</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Keluar</p>
                <p className="text-sm font-bold text-red-500">Rp 0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Histori Transaksi Kas</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Waktu</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Kantong Kas</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Kategori</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Keterangan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Nominal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center py-16 text-gray-500 font-medium border-b-0">
                Belum ada catatan arus kas.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
