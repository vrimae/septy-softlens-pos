"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LaporanUtamaPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan Utama</h1>
          <p className="text-gray-500 mt-1">Ringkasan komprehensif bisnis Anda.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white hover:bg-gray-50 font-semibold shadow-sm h-11 px-5 border-gray-200">
            Filter Lanjut
          </Button>
          <Button className="bg-[#00a84e] hover:bg-green-600 text-white font-semibold shadow-sm h-11 px-5">
            Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Penjualan */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">1. Penjualan</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#f0f4ff] rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#1c5ffb] mb-1">Omzet</p>
              <div className="text-3xl font-black text-[#1c5ffb]">Rp 0</div>
            </div>
            <div className="bg-green-50 rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-green-500 mb-1">Laba Kotor</p>
              <div className="text-3xl font-black text-green-500">Rp 0</div>
            </div>
            <div className="bg-[#f0f4ff] rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#1c5ffb] mb-1">Jml Transaksi</p>
              <div className="text-3xl font-black text-[#1c5ffb]">0 <span className="text-base font-bold">struk</span></div>
            </div>
            <div className="bg-[#fff7ed] rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#ea580c] mb-1">Jml Pcs Terjual</p>
              <div className="text-3xl font-black text-[#ea580c]">0 <span className="text-base font-bold">pcs</span></div>
            </div>
          </div>
        </section>

        {/* 2. Kinerja SP */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">2. Kinerja SP</h2>
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white border-b border-gray-100">
                <TableHead className="font-bold text-gray-700 py-3">Rank</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">SP / Kasir</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Omzet</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Laba</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Transaksi</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Pcs</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Upselling</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Target (Barang)</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-right">Insentif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-gray-500 font-medium border-b-0">
                  Tidak ada data kinerja SP.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        {/* 3. Analisis Produk */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">3. Analisis Produk</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#f0f4ff] rounded-xl p-4 flex items-center min-h-[50px]">
              <span className="font-bold text-[#1c5ffb] text-sm">Top 5 Barang Terlaris (Pcs)</span>
            </div>
            <div className="bg-red-50 rounded-xl p-4 flex items-center min-h-[50px]">
              <span className="font-bold text-red-500 text-sm">Top 5 Barang Paling Tidak Laris</span>
            </div>
            <div className="bg-green-50 rounded-xl p-4 flex items-center min-h-[50px]">
              <span className="font-bold text-green-500 text-sm">Top 5 Laba Rupiah Terbesar</span>
            </div>
            <div className="bg-[#f0f4ff] rounded-xl p-4 flex items-center min-h-[50px]">
              <span className="font-bold text-[#1c5ffb] text-sm">Top 5 Margin Profit (%) Terbesar</span>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-6 flex items-center gap-4">
            <h3 className="font-bold text-gray-900 text-lg">Barang Mengendap (Dead Stock &gt;30 hari)</h3>
            <span className="bg-gray-100 text-gray-500 font-bold px-3 py-1 rounded-full text-sm">0</span>
          </div>
        </section>

        {/* 4. Stok & Gudang */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">4. Stok & Gudang</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-bold text-gray-400 mb-1">Total Stok Tersedia</p>
              <div className="text-2xl font-black text-gray-900">0 <span className="text-sm font-bold">pcs</span></div>
            </div>
            <div className="border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-bold text-gray-400 mb-1">Nilai Stok (HPP)</p>
              <div className="text-2xl font-black text-[#1c5ffb]">Rp 0</div>
            </div>
            <div className="border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-bold text-gray-400 mb-1">Stok di Gudang</p>
              <div className="text-2xl font-black text-red-500">0 <span className="text-sm font-bold">pcs</span></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Stok Tipis / Minimum</h3>
              <div className="border border-gray-300 rounded-lg h-[200px]"></div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Barang Expired (3 Bln)</h3>
              <div className="border border-gray-300 rounded-lg h-[200px]"></div>
            </div>
          </div>
        </section>

        {/* 5. Pembelian & Supplier */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">5. Pembelian & Supplier</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#fdf4ff] rounded-xl p-5 border border-transparent">
              <p className="text-xs font-bold text-purple-600 mb-1">Total Pembelian Periode Ini</p>
              <div className="text-3xl font-black text-purple-700">Rp 0</div>
            </div>
            <div className="bg-red-50/50 rounded-xl p-5 border border-transparent">
              <p className="text-xs font-bold text-red-700 mb-1">Total Utang Supplier (Periode Ini)</p>
              <div className="text-3xl font-black text-red-800">Rp 0</div>
            </div>
          </div>
          <h3 className="font-bold text-gray-900">Pembelian per Supplier</h3>
        </section>

        {/* 6. Analisis Customer */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">6. Analisis Customer</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 font-medium">Filter Tidak Kembali:</span>
              <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>&gt; 30 Hari</option>
              </select>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white border-b border-gray-100">
                <TableHead className="font-bold text-gray-700 py-3">Rank</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Pelanggan</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Total Belanja</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Frekuensi</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Produk Favorit</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-center">Terakhir Transaksi</TableHead>
                <TableHead className="font-bold text-gray-700 py-3 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-gray-500 font-medium border-b-0">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        {/* 7. Kas & Keuangan */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">7. Kas & Keuangan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Kas Masuk</p>
              <div className="text-xl font-black text-green-500">Rp 0</div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Kas Keluar</p>
              <div className="text-xl font-black text-red-500">Rp 0</div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Arus Kas (Net)</p>
              <div className="text-xl font-black text-[#1c5ffb]">Rp 0</div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Mutasi Internal</p>
              <div className="text-xl font-black text-orange-500">Rp 0</div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4 bg-[#f0f4ff]">
              <p className="text-[10px] font-bold text-[#1c5ffb] mb-1 uppercase tracking-wider">Total Saldo Kas (Realtime)</p>
              <div className="text-xl font-black text-[#1c5ffb]">Rp 0</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
