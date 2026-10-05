"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, ScanLine } from "lucide-react";
// Instead of depending on ui/switch, I'll use a styled native checkbox for simplicity in this artifact.

function CustomSwitch({ checked, label, blue }: { checked: boolean, label?: string, blue?: boolean }) {
  return (
    <div className="flex items-center">
      <div className={`w-11 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${checked ? (blue ? 'bg-[#1c5ffb]' : 'bg-[#1c5ffb]') : 'bg-gray-200'}`}>
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : ''}`}></div>
      </div>
      {label && <span className="ml-3 text-sm font-bold text-gray-700">{label}</span>}
    </div>
  );
}

function AccessToggle({ label, active, blue }: { label: string, active: boolean, blue?: boolean }) {
  return (
    <div className={`flex items-center justify-between border ${active ? (blue ? 'border-[#1c5ffb]' : 'border-gray-200') : 'border-gray-200'} rounded-xl p-4 transition-colors ${active ? 'bg-white' : 'bg-white'}`}>
      <span className={`text-sm font-bold ${active ? (blue ? 'text-[#1c5ffb]' : 'text-gray-900') : 'text-gray-500'}`}>{label}</span>
      <CustomSwitch checked={active} blue={blue} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pengaturan Sistem & Akses</h1>
        <p className="text-gray-500 mt-1">Atur konfigurasi toko dan menu apa saja yang bisa dilihat oleh setiap jabatan.</p>
      </div>

      {/* Manajemen Cabang */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Manajemen Cabang (Multi-Branch)</h2>
        <p className="text-sm text-gray-500 mb-4">Kelola cabang toko Anda (Maksimal 3 cabang). Stok gudang akan otomatis tergabung, namun transaksi dan omzet terpisah.</p>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Nama Cabang Baru..." 
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1c5ffb]"
          />
          <Button className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold rounded-xl px-6 h-auto">
            Tambah Cabang
          </Button>
        </div>
      </section>

      {/* Backup & Export */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Backup & Export Database</h2>
        <p className="text-sm text-gray-500 mb-4">Download seluruh data ERP (Barang, Transaksi, Audit, dll) sebagai file Backup JSON untuk keamanan data, atau jika Anda ingin pindah perangkat/restore.</p>
        <Button className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold rounded-xl px-6">
          Download Full Backup (.json)
        </Button>
      </section>

      {/* Hardware */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <input type="checkbox" className="w-4 h-4 rounded text-[#1c5ffb]" />
          <h2 className="text-xl font-bold text-gray-900">Hardware & Integrasi (Smartcom)</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-100 bg-gray-50/50 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 text-[#1c5ffb] rounded-full flex items-center justify-center mx-auto mb-4">
              <Printer className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Printer Thermal</h3>
            <p className="text-xs text-gray-400 mb-6">Integrasi Smartcom untuk Cetak Struk POS & Label Produk (USB/Bluetooth)</p>
            <Button className="w-full bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold rounded-xl">
              <Printer className="h-4 w-4 mr-2" /> Sinkronkan Printer
            </Button>
          </div>

          <div className="border border-gray-100 bg-gray-50/50 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ScanLine className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Barcode Scanner</h3>
            <p className="text-xs text-gray-400 mb-6">Integrasi Scanner Smartcom untuk kasir otomatis (USB/Bluetooth)</p>
            <Button className="w-full bg-[#00a84e] hover:bg-green-600 text-white font-bold rounded-xl">
              <ScanLine className="h-4 w-4 mr-2" /> Sinkronkan Scanner
            </Button>
          </div>
        </div>
      </section>

      {/* Pengaturan Harga Transaksi */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pengaturan Harga Transaksi (Global)</h2>
        <div className="flex items-start gap-4">
          <CustomSwitch checked={false} />
          <div>
            <h3 className="font-bold text-gray-900">Izinkan Perubahan Harga di Kasir</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Jika diaktifkan, harga barang dapat diubah (diedit) secara manual saat transaksi POS, asalkan user memiliki akses "Aksi: Ubah Harga Saat Transaksi" di bawah ini.
            </p>
          </div>
        </div>
      </section>

      {/* Target Kinerja */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Target Kinerja Kasir (SP)</h2>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-gray-900">Target Upselling Per Kasir</h3>
            <p className="text-sm text-gray-500 mt-1">Target jumlah transaksi upselling (item &gt;1) yang harus dicapai.</p>
          </div>
          <input type="text" defaultValue="0" className="w-24 px-4 py-2 bg-white border border-gray-200 rounded-lg text-center font-bold focus:border-[#1c5ffb] outline-none" />
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Target Barang Tertentu</h3>
          <div className="flex gap-4">
            <select className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-500 focus:outline-none focus:border-[#1c5ffb]">
              <option>-- Pilih Barang --</option>
            </select>
            <Button variant="outline" className="text-[#1c5ffb] border-transparent font-bold hover:bg-blue-50">
              + Tambah
            </Button>
          </div>
        </div>
      </section>

      {/* Pengaturan Insentif */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pengaturan Insentif SP</h2>
        <div className="flex items-start gap-4 mb-6">
          <CustomSwitch checked={true} blue={true} />
          <div>
            <h3 className="font-bold text-[#1c5ffb]">Aktifkan Insentif Kasir (SP)</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Jika aktif, sistem akan menghitung bonus/insentif berdasarkan penjualan & upselling. Jika nonaktif, data terekam tanpa insentif.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Insentif Per Barang (Rp)</label>
            <input type="text" defaultValue="1000" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1c5ffb]" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Insentif Upselling (%)</label>
            <input type="text" defaultValue="5000" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1c5ffb]" />
          </div>
        </div>
      </section>

      {/* Pengaturan Notifikasi Expired */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pengaturan Notifikasi Expired Date</h2>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-gray-900">Munculkan Notifikasi Kedaluwarsa</h3>
            <p className="text-sm text-gray-500 mt-1">Sistem akan memberikan warning beberapa bulan sebelum tanggal Expired Date.</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-[#1c5ffb]">
              <option>6 Bulan</option>
            </select>
            <span className="text-sm text-gray-500 font-medium">sblm expired</span>
          </div>
        </div>

        <div className="mt-8 border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex border-b border-gray-200 bg-white">
            <button className="flex-1 py-4 text-sm font-bold text-[#1c5ffb] border-b-2 border-[#1c5ffb]">Akses Admin</button>
            <button className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">Akses Kasir (SP)</button>
          </div>
          <div className="p-6 bg-white">
            <div className="bg-[#f0f4ff] p-4 text-sm font-bold text-[#1c5ffb] rounded-xl mb-6">
              Pilih menu-menu di bawah ini untuk mengizinkan akses bagi pengguna dengan role ADMIN.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AccessToggle label="Dashboard" active={false} />
              <AccessToggle label="Kasir (POS)" active={false} />
              <AccessToggle label="Master Barang" active={true} blue={true} />
              
              <AccessToggle label="Kategori Barang" active={false} />
              <AccessToggle label="Restock Barang" active={false} />
              <AccessToggle label="Pelanggan" active={true} blue={true} />

              <AccessToggle label="Master Reward" active={false} />
              <AccessToggle label="Master Promo" active={false} />
              <AccessToggle label="Buku Kas" active={false} />

              <AccessToggle label="Laporan ERP" active={true} blue={true} />
              <AccessToggle label="Laporan Stok Mengendap" active={false} />
              <AccessToggle label="Gudang Barang Bermasalah" active={false} />

              <AccessToggle label="Retur / Tukar Barang" active={false} />
              <AccessToggle label="AI Restock" active={false} />
              <AccessToggle label="Manajemen User" active={false} />

              <AccessToggle label="Pengaturan Akses" active={false} />
              <AccessToggle label="Aksi: Ubah Harga Saat Transaksi" active={false} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
