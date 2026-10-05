"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default function RewardsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Master Reward & Poin</h1>
        <p className="text-gray-500 mt-1">Kelola hadiah dan konfigurasi poin transaksi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Konfigurasi */}
        <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden border">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Konfigurasi Poin Transaksi (Model B)</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Setiap Transaksi Kelipatan Rp</label>
              <input 
                type="text" 
                defaultValue="10000"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1c5ffb] focus:ring-1 focus:ring-[#1c5ffb]"
              />
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Sistem akan memberi 1 Poin setiap kelipatan nominal di atas. Isi 0 jika tidak ingin memberi poin dari transaksi.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Umur Poin (Bulan)</label>
              <input 
                type="text" 
                defaultValue="12"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1c5ffb] focus:ring-1 focus:ring-[#1c5ffb]"
              />
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Poin akan hangus secara bertahap jika melewati umur (bulan) ini sejak tanggal perolehan.
              </p>
            </div>

            <Button className="w-full bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold rounded-xl h-12">
              Simpan Pengaturan
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Daftar Reward */}
        <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden border">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Daftar Reward / Hadiah</h2>
            <Button className="bg-[#00a84e] hover:bg-green-600 text-white rounded-lg px-4 font-semibold shadow-sm h-10 text-sm">
              + Tambah Reward
            </Button>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-100">
                  <TableHead className="font-bold text-gray-700 py-3 px-6">Nama Reward</TableHead>
                  <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Poin Dibutuhkan</TableHead>
                  <TableHead className="font-bold text-gray-700 py-3 px-6 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-16 text-gray-500 font-medium border-b-0">
                    Belum ada reward terdaftar.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
