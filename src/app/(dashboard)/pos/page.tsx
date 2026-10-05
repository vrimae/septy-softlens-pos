"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PosPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-full">
      {/* Left Area (Product List) */}
      <div className="flex-1 space-y-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Mesin Kasir (POS)</h1>
            <p className="text-gray-500 text-sm mt-1">Klik produk untuk menambah ke keranjang belanja.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 font-semibold h-11 px-6 rounded-xl">
              + Catat Pengeluaran
            </Button>
            <input 
              type="text" 
              placeholder="Scan Barcode / Ketik Kode..." 
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[240px]"
            />
          </div>
        </div>
        
        {/* Placeholder for products grid */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 min-h-[500px] flex items-center justify-center">
          <p className="text-gray-400">Area Daftar Produk</p>
        </div>
      </div>

      {/* Right Area (Cart) */}
      <div className="w-full lg:w-[400px] shrink-0">
        <div className="bg-[#f8fafc] rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          {/* Cart Header */}
          <div className="px-5 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <h2 className="font-bold text-gray-900 text-lg">Keranjang Belanja</h2>
            <div className="bg-[#1c5ffb] text-white text-xs font-bold px-3 py-1 rounded-full">
              0 item
            </div>
          </div>
          
          {/* Cart Items Area */}
          <div className="flex-1 overflow-y-auto p-5 bg-white">
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 font-medium text-sm">Belum ada barang di keranjang</p>
            </div>
          </div>

          {/* Cart Summary & Actions */}
          <div className="bg-[#f8fafc] border-t border-gray-200 p-5 space-y-4">
            <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
              <span>Subtotal</span>
              <span>Rp 0</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
              <span>Diskon (Rp)</span>
              <input type="text" className="w-24 px-3 py-1.5 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" defaultValue="0" />
            </div>
            <div className="flex justify-between items-center text-lg font-black text-[#1c5ffb] pt-2 border-t border-gray-200">
              <span>Total Akhir</span>
              <span>Rp 0</span>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-2">Pelanggan (Wajib Diisi)</label>
              <input 
                type="text" 
                placeholder="Cari nama / WA pelanggan lama..." 
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-t-xl text-sm focus:outline-none focus:border-blue-500"
              />
              <button className="w-full bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-bold py-2.5 rounded-b-xl border-x border-b border-gray-200 transition-colors">
                + Pelanggan Baru
              </button>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-2">Channel Penjualan</label>
              <div className="flex bg-gray-200 rounded-xl p-1 gap-1">
                <button className="flex-1 bg-[#1c5ffb] text-white text-xs font-bold py-2 rounded-lg shadow-sm">Toko</button>
                <button className="flex-1 bg-transparent text-gray-600 hover:bg-white hover:shadow-sm text-xs font-bold py-2 rounded-lg transition-all">WhatsApp</button>
                <button className="flex-1 bg-transparent text-gray-600 hover:bg-white hover:shadow-sm text-xs font-bold py-2 rounded-lg transition-all">Marketplace</button>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-3">Metode Pembayaran (Split Payment)</label>
              <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-16">Tunai</span>
                  <div className="relative flex-1">
                    <input type="text" className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">Rp</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-16">Transfer</span>
                  <div className="relative flex-1">
                    <input type="text" className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">Rp</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-16">QRIS</span>
                  <div className="relative flex-1">
                    <input type="text" className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">Rp</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-600">Total Bayar:</span>
                  <span className="text-sm font-black text-[#00a84e]">Rp 0</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
