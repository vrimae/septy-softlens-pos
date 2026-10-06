"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LaporanLamaPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-normal">Laporan & Kontrol Bisnis (ERP)</h1>
        <p className="text-gray-500 mt-1">Pusat komando analisis data toko Anda.</p>
      </div>

      {/* Kontrol Profit (Blue) */}
      <div className="bg-[#4145fe] rounded-xl shadow-sm overflow-hidden text-white">
        <div className="px-6 py-4 border-b border-blue-500/30">
          <h2 className="text-xl font-bold">Kontrol Profit</h2>
        </div>
        <div className="bg-white text-gray-900 p-6">
          <div className="flex flex-col md:flex-row gap-6 mb-4">
            <div className="flex-1 border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-bold text-gray-400 mb-1">Total Pendapatan (Kotor)</p>
              <div className="text-2xl font-semibold text-gray-900">Rp 0</div>
            </div>
            <div className="flex-1 border border-green-200 bg-green-50/30 rounded-xl p-5">
              <p className="text-xs font-bold text-green-600 mb-1">Profit Bersih (Margin)</p>
              <div className="text-2xl font-semibold text-green-600">Rp 0</div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 font-medium">
            Profit dihitung dari: (Harga Jual - Harga Modal) x Qty per transaksi. Transaksi VOID/CANCEL otomatis dikeluarkan.
          </p>
        </div>
      </div>

      {/* Laporan Sales Person (Red) */}
      <div className="bg-[#fe3929] rounded-xl shadow-sm overflow-hidden text-white mt-6">
        <div className="px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Laporan Sales Person (SP) & Insentif</h2>
          <div className="bg-white text-red-500 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
            Insentif Aktif
          </div>
        </div>
        <div className="bg-white">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-white border-b border-gray-100">
                <TableHead className="font-bold text-gray-700 py-3 px-6">Rank</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Nama SP</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Omzet</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Laba Kotor</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Transaksi</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Total Pcs</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Upselling</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Target</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-right">Insentif Estimasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-gray-500 font-medium border-b-0">
                  Belum ada data SP.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Kontrol Expired (Pink) */}
        <div className="bg-[#e4006c] rounded-xl shadow-sm overflow-hidden text-white">
          <div className="px-6 py-4">
            <h2 className="text-xl font-bold">Kontrol Expired (&lt; 3 Bulan)</h2>
          </div>
          <div className="bg-white p-10 flex items-center justify-center min-h-[120px]">
            <p className="text-gray-400 font-medium">Tidak ada barang yang mendekati masa expired.</p>
          </div>
        </div>

        {/* Kontrol Barang Mengendap (Dark/Yellowish) */}
        <div className="bg-[#566072] rounded-xl shadow-sm overflow-hidden text-white flex flex-col">
          <div className="px-6 py-4">
            <h2 className="text-xl font-bold">Kontrol Barang Mengendap</h2>
          </div>
          <div className="bg-white flex-1 flex flex-col">
            <div className="bg-[#fff9e6] p-4 text-center text-[#9c6a0c] text-xs font-bold border-b border-[#fde8a3]">
              Daftar barang yang belum laku terjual selama lebih dari 30 hari. Disarankan membuat diskon promo!
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-gray-400 font-medium text-center">Perputaran stok lancar, tidak ada barang mengendap.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Laporan Penggunaan Level Harga (Green) */}
      <div className="bg-[#0eb27e] rounded-xl shadow-sm overflow-hidden text-white mt-6">
        <div className="px-6 py-4">
          <h2 className="text-xl font-bold">Laporan Penggunaan Level Harga</h2>
        </div>
        <div className="bg-white p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-xl p-6 text-center">
            <p className="font-bold text-slate-900 mb-2">Harga 1 (Reguler)</p>
            <div className="text-2xl font-semibold text-slate-900 mb-1">0</div>
            <p className="text-xs font-medium text-gray-400">Item Terjual</p>
          </div>
          <div className="border border-[#fde8a3] bg-[#fff9e6] rounded-xl p-6 text-center">
            <p className="font-bold text-[#9c6a0c] mb-2">Harga 2 (Gold)</p>
            <div className="text-2xl font-semibold text-[#9c6a0c] mb-1">0</div>
            <p className="text-xs font-medium text-[#9c6a0c]/60">Item Terjual</p>
          </div>
          <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-6 text-center">
            <p className="font-bold text-purple-600 mb-2">Harga 3 (VIP)</p>
            <div className="text-2xl font-semibold text-purple-600 mb-1">0</div>
            <p className="text-xs font-medium text-purple-400">Item Terjual</p>
          </div>
        </div>
      </div>

      {/* Audit Trail (Dark Red) */}
      <div className="bg-[#bb081e] rounded-xl shadow-sm overflow-hidden text-white mt-6">
        <div className="px-6 py-4">
          <h2 className="text-xl font-bold">Audit Trail (VOID / CANCEL & Perubahan Harga)</h2>
        </div>
        <div className="bg-white p-10 flex items-center justify-center">
          <p className="text-gray-400 font-medium">Belum ada catatan audit.</p>
        </div>
      </div>

      {/* Laporan Koreksi Stok (Orange) */}
      <div className="bg-[#ff7b02] rounded-xl shadow-sm overflow-hidden text-white mt-6">
        <div className="px-6 py-4">
          <h2 className="text-xl font-bold">Laporan Koreksi Stok</h2>
        </div>
        <div className="bg-white">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-white border-b border-gray-100">
                <TableHead className="font-bold text-gray-700 py-4 px-6">Tanggal & Waktu</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Barang</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Stok Sblm</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Koreksi</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Stok Stlh</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Alasan</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-gray-500 font-medium border-b-0">
                  Belum ada riwayat koreksi stok.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Laporan Kas & Rekonsiliasi (Teal) */}
      <div className="bg-[#0fb082] rounded-xl shadow-sm overflow-hidden text-white mt-6">
        <div className="px-6 py-4">
          <h2 className="text-xl font-bold">Laporan Kas & Rekonsiliasi</h2>
        </div>
        <div className="bg-white text-gray-900">
          <div className="px-6 py-4 font-bold border-b border-gray-100 text-gray-700">
            Ringkasan Saldo per Kantong Kas
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-white border-b border-gray-100">
                <TableHead className="font-bold text-gray-700 py-3 px-6">Kantong Kas</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Saldo Awal</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Kas Masuk</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Kas Keluar</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Mutasi Masuk</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 px-6 text-center">Mutasi Keluar</TableHead>
                <TableHead className="font-bold text-slate-900 py-3 px-6 text-right">Saldo Akhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-b border-gray-50">
                <TableCell className="font-bold px-6">Kas Penjualan (Toko)</TableCell>
                <TableCell className="text-center text-gray-500">Rp 0</TableCell>
                <TableCell className="text-center text-green-500">Rp 0</TableCell>
                <TableCell className="text-center text-red-500">Rp 0</TableCell>
                <TableCell className="text-center text-slate-900">Rp 0</TableCell>
                <TableCell className="text-center text-orange-500">Rp 0</TableCell>
                <TableCell className="text-right font-bold text-slate-900 px-6">Rp 0</TableCell>
              </TableRow>
              <TableRow className="border-b border-gray-100">
                <TableCell className="font-bold px-6">Kas Toko (Utama)</TableCell>
                <TableCell className="text-center text-gray-500">Rp 0</TableCell>
                <TableCell className="text-center text-green-500">Rp 0</TableCell>
                <TableCell className="text-center text-red-500">Rp 0</TableCell>
                <TableCell className="text-center text-slate-900">Rp 0</TableCell>
                <TableCell className="text-center text-orange-500">Rp 0</TableCell>
                <TableCell className="text-right font-bold text-slate-900 px-6">Rp 0</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="px-6 py-4 font-bold border-b border-gray-100 text-gray-700 mt-4">
            Riwayat Rekonsiliasi & Selisih Kas (Tutup Kas)
          </div>
          <div className="p-10 flex items-center justify-center">
            <p className="text-gray-400 font-medium">Belum ada riwayat tutup kas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
