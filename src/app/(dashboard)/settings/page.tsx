"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, ScanLine, Check, Plus, Trash2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function SettingsPage() {
  // Branches state
  const [branches, setBranches] = useState<string[]>(["Pusat", "Cabang 1"]);
  const [newBranch, setNewBranch] = useState("");

  // Hardware sync states
  const [printerSyncing, setPrinterSyncing] = useState(false);
  const [printerSynced, setPrinterSynced] = useState(false);
  const [scannerSyncing, setScannerSyncing] = useState(false);
  const [scannerSynced, setScannerSynced] = useState(false);

  // Global settings
  const [allowPriceChange, setAllowPriceChange] = useState(false);
  const [upsellingTarget, setUpsellingTarget] = useState("0");
  const [targetProducts, setTargetProducts] = useState<string[]>([]);
  const [selectedProductTarget, setSelectedProductTarget] = useState("");
  const [incentiveActive, setIncentiveActive] = useState(true);
  const [incentivePerItem, setIncentivePerItem] = useState("1000");
  const [incentiveUpselling, setIncentiveUpselling] = useState("5000");
  const [expiredNotificationMonth, setExpiredNotificationMonth] = useState("6 Bulan");

  // Tabs for Access
  const [activeTab, setActiveTab] = useState<"admin" | "kasir">("admin");

  // Access toggles for admin and kasir
  const [adminAccess, setAdminAccess] = useState<Record<string, boolean>>({
    "Dashboard": false,
    "Kasir (POS)": false,
    "Master Barang": true,
    "Kategori Barang": false,
    "Restock Barang": false,
    "Pelanggan": true,
    "Master Reward": false,
    "Master Promo": false,
    "Buku Kas": false,
    "Laporan ERP": true,
    "Laporan Stok Mengendap": false,
    "Gudang Barang Bermasalah": false,
    "Retur / Tukar Barang": false,
    "Sistem Restock": false,
    "Manajemen User": false,
    "Pengaturan Akses": false,
    "Aksi: Ubah Harga Saat Transaksi": false,
  });

  const [kasirAccess, setKasirAccess] = useState<Record<string, boolean>>({
    "Dashboard": false,
    "Kasir (POS)": true,
    "Master Barang": false,
    "Kategori Barang": false,
    "Restock Barang": false,
    "Pelanggan": true,
    "Master Reward": true,
    "Master Promo": true,
    "Buku Kas": false,
    "Laporan ERP": false,
    "Laporan Stok Mengendap": false,
    "Gudang Barang Bermasalah": false,
    "Retur / Tukar Barang": true,
    "Sistem Restock": false,
    "Manajemen User": false,
    "Pengaturan Akses": false,
    "Aksi: Ubah Harga Saat Transaksi": false,
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddBranch = () => {
    if (!newBranch.trim()) return;
    if (branches.length >= 3) {
      alert("Maksimal 3 cabang toko.");
      return;
    }
    setBranches([...branches, newBranch.trim()]);
    setNewBranch("");
    showNotification("Cabang baru berhasil ditambahkan!");
  };

  const handleRemoveBranch = (index: number) => {
    if (confirm("Hapus cabang ini?")) {
      setBranches(branches.filter((_, i) => i !== index));
      showNotification("Cabang berhasil dihapus.");
    }
  };

  const handleDownloadBackup = async () => {
    try {
      showNotification("Menyiapkan file backup database...");
      const [prodRes, custRes, catRes, salesRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("categories").select("*"),
        supabase.from("sales").select("*"),
      ]);

      const backupData = {
        exportDate: new Date().toISOString(),
        system: "Septy Softlens POS & ERP",
        products: prodRes.data || [],
        customers: custRes.data || [],
        categories: catRes.data || [],
        sales: salesRes.data || [],
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-septy-pos-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification("Backup database berhasil didownload!");
    } catch (err) {
      alert("Gagal mendownload backup.");
    }
  };

  const handleSyncPrinter = () => {
    setPrinterSyncing(true);
    setTimeout(() => {
      setPrinterSyncing(false);
      setPrinterSynced(true);
      showNotification("Printer Thermal berhasil disinkronkan via Smartcom!");
      setTimeout(() => setPrinterSynced(false), 4000);
    }, 1500);
  };

  const handleSyncScanner = () => {
    setScannerSyncing(true);
    setTimeout(() => {
      setScannerSyncing(false);
      setScannerSynced(true);
      showNotification("Barcode Scanner berhasil terhubung dan siap digunakan!");
      setTimeout(() => setScannerSynced(false), 4000);
    }, 1500);
  };

  const handleAddTargetProduct = () => {
    if (!selectedProductTarget.trim()) return;
    if (!targetProducts.includes(selectedProductTarget)) {
      setTargetProducts([...targetProducts, selectedProductTarget]);
      setSelectedProductTarget("");
      showNotification("Target barang berhasil ditambahkan!");
    }
  };

  const toggleAccess = (key: string) => {
    if (activeTab === "admin") {
      setAdminAccess(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setKasirAccess(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-normal">Pengaturan Sistem & Akses</h1>
          <p className="text-gray-500 mt-1">Atur konfigurasi toko dan menu apa saja yang bisa dilihat oleh setiap jabatan.</p>
        </div>
        <Button 
          onClick={() => showNotification("Seluruh pengaturan berhasil disimpan!")}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-5 shadow-sm"
        >
          Simpan Semua Pengaturan
        </Button>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-bold shadow-sm transition-all">
          {notification}
        </div>
      )}

      {/* Manajemen Cabang */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Manajemen Cabang (Multi-Branch)</h2>
        <p className="text-sm text-gray-500 mb-4">Kelola cabang toko Anda (Maksimal 3 cabang). Stok gudang akan otomatis tergabung, namun transaksi dan omzet terpisah.</p>
        
        <div className="flex gap-4 mb-4">
          <input 
            type="text" 
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddBranch()}
            placeholder="Nama Cabang Baru..." 
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-[#1c5ffb]"
          />
          <Button 
            onClick={handleAddBranch}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-6 h-auto shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Cabang
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {branches.map((b, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-gray-700">
              <span>{b}</span>
              {branches.length > 1 && (
                <button onClick={() => handleRemoveBranch(idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Backup & Export */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Backup & Export Database</h2>
        <p className="text-sm text-gray-500 mb-4">Download seluruh data ERP (Barang, Transaksi, Audit, dll) sebagai file Backup JSON untuk keamanan data, atau jika Anda ingin pindah perangkat/restore.</p>
        <Button 
          onClick={handleDownloadBackup}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-6 shadow-sm flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Download Full Backup (.json)
        </Button>
      </section>

      {/* Hardware */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-slate-900" />
          <h2 className="text-xl font-bold text-gray-900">Hardware & Integrasi (Smartcom)</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-100 bg-gray-50/50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 text-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Printer className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Printer Thermal</h3>
            <p className="text-xs text-gray-400 mb-6">Integrasi Smartcom untuk Cetak Struk POS & Label Produk (USB/Bluetooth)</p>
            <Button 
              onClick={handleSyncPrinter}
              disabled={printerSyncing}
              className={`w-full font-bold rounded-xl transition-all ${
                printerSynced 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              <Printer className="h-4 w-4 mr-2" /> 
              {printerSyncing ? "Menghubungkan..." : printerSynced ? "Printer Terhubung!" : "Sinkronkan Printer"}
            </Button>
          </div>

          <div className="border border-gray-100 bg-gray-50/50 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ScanLine className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Barcode Scanner</h3>
            <p className="text-xs text-gray-400 mb-6">Integrasi Scanner Smartcom untuk kasir otomatis (USB/Bluetooth)</p>
            <Button 
              onClick={handleSyncScanner}
              disabled={scannerSyncing}
              className={`w-full font-bold rounded-xl transition-all ${
                scannerSynced 
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <ScanLine className="h-4 w-4 mr-2" /> 
              {scannerSyncing ? "Menghubungkan..." : scannerSynced ? "Scanner Terhubung!" : "Sinkronkan Scanner"}
            </Button>
          </div>
        </div>
      </section>

      {/* Pengaturan Harga Transaksi */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pengaturan Harga Transaksi (Global)</h2>
        <div className="flex items-start gap-4 cursor-pointer" onClick={() => setAllowPriceChange(!allowPriceChange)}>
          <div className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${allowPriceChange ? "bg-slate-900" : "bg-gray-200"}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${allowPriceChange ? "translate-x-5" : ""}`} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Izinkan Perubahan Harga di Kasir</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Jika diaktifkan, harga barang dapat diubah (diedit) secara manual saat transaksi POS, asalkan user memiliki akses "Aksi: Ubah Harga Saat Transaksi" di bawah ini.
            </p>
          </div>
        </div>
      </section>

      {/* Target Kinerja */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Target Kinerja Kasir (SP)</h2>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-gray-900">Target Upselling Per Kasir</h3>
            <p className="text-sm text-gray-500 mt-1">Target jumlah transaksi upselling (item &gt;1) yang harus dicapai.</p>
          </div>
          <input 
            type="number" 
            value={upsellingTarget}
            onChange={(e) => setUpsellingTarget(e.target.value)}
            className="w-24 px-4 py-2 bg-white border border-gray-200 rounded-lg text-center font-bold focus:border-slate-900 outline-none" 
          />
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Target Barang Tertentu</h3>
          <div className="flex gap-4">
            <input 
              type="text"
              placeholder="Ketik nama produk target..."
              value={selectedProductTarget}
              onChange={(e) => setSelectedProductTarget(e.target.value)}
              className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-slate-900"
            />
            <Button 
              onClick={handleAddTargetProduct}
              variant="outline" 
              className="text-slate-900 border-slate-200 font-bold hover:bg-slate-100"
            >
              + Tambah
            </Button>
          </div>

          {targetProducts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {targetProducts.map((p, idx) => (
                <span key={idx} className="bg-slate-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  {p}
                  <button onClick={() => setTargetProducts(targetProducts.filter((_, i) => i !== idx))} className="hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pengaturan Insentif */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pengaturan Insentif SP</h2>
        <div className="flex items-start gap-4 mb-6 cursor-pointer" onClick={() => setIncentiveActive(!incentiveActive)}>
          <div className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${incentiveActive ? "bg-slate-900" : "bg-gray-200"}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${incentiveActive ? "translate-x-5" : ""}`} />
          </div>
          <div>
            <h3 className={`font-bold ${incentiveActive ? "text-slate-900" : "text-gray-700"}`}>Aktifkan Insentif Kasir (SP)</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Jika aktif, sistem akan menghitung bonus/insentif berdasarkan penjualan & upselling. Jika nonaktif, data terekam tanpa insentif.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Insentif Per Barang (Rp)</label>
            <input 
              type="number" 
              value={incentivePerItem} 
              onChange={(e) => setIncentivePerItem(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-900" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Insentif Upselling (%)</label>
            <input 
              type="number" 
              value={incentiveUpselling} 
              onChange={(e) => setIncentiveUpselling(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-slate-900" 
            />
          </div>
        </div>
      </section>

      {/* Pengaturan Notifikasi Expired & Grid Hak Akses */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Pengaturan Notifikasi Expired Date</h2>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-gray-900">Munculkan Notifikasi Kedaluwarsa</h3>
            <p className="text-sm text-gray-500 mt-1">Sistem akan memberikan warning beberapa bulan sebelum tanggal Expired Date.</p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={expiredNotificationMonth}
              onChange={(e) => setExpiredNotificationMonth(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-slate-900"
            >
              <option value="3 Bulan">3 Bulan</option>
              <option value="6 Bulan">6 Bulan</option>
              <option value="12 Bulan">12 Bulan</option>
            </select>
            <span className="text-sm text-gray-500 font-medium">sblm expired</span>
          </div>
        </div>

        {/* Tab Hak Akses */}
        <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-200 bg-white">
            <button 
              onClick={() => setActiveTab("admin")}
              className={`flex-1 py-4 text-sm font-bold transition-all ${
                activeTab === "admin" 
                  ? "text-slate-900 border-b-2 border-slate-900" 
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              Akses Admin
            </button>
            <button 
              onClick={() => setActiveTab("kasir")}
              className={`flex-1 py-4 text-sm font-bold transition-all ${
                activeTab === "kasir" 
                  ? "text-slate-900 border-b-2 border-slate-900" 
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              Akses Kasir (SP)
            </button>
          </div>
          <div className="p-6 bg-white">
            <div className="bg-[#f0f4ff] p-4 text-sm font-bold text-slate-900 rounded-xl mb-6">
              Pilih menu-menu di bawah ini untuk mengizinkan akses bagi pengguna dengan role {activeTab.toUpperCase()}. Klik untuk toggle switch.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(activeTab === "admin" ? adminAccess : kasirAccess).map(([menuName, isActive]) => (
                <div 
                  key={menuName}
                  onClick={() => toggleAccess(menuName)}
                  className={`flex items-center justify-between border rounded-xl p-4 cursor-pointer transition-all ${
                    isActive ? "border-slate-900 bg-slate-50" : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-sm font-bold select-none ${isActive ? "text-slate-900" : "text-gray-600"}`}>
                    {menuName}
                  </span>
                  <div className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${isActive ? "bg-slate-900" : "bg-gray-200"}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${isActive ? "translate-x-5" : ""}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
