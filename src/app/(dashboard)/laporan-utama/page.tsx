"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter, RefreshCw, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function LaporanUtamaPage() {
  const [omzet, setOmzet] = useState(0);
  const [labaKotor, setLabaKotor] = useState(0);
  const [jmlTransaksi, setJmlTransaksi] = useState(0);
  const [jmlPcs, setJmlPcs] = useState(0);
  const [saldoKas, setSaldoKas] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter Modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterBranch, setFilterBranch] = useState("Semua Cabang");

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [salesRes, itemsRes, kasRes] = await Promise.all([
        supabase.from("sales").select("total_amount"),
        supabase.from("sale_items").select("qty, price_at_sale, cost_at_sale"),
        supabase.from("cash_registers").select("balance"),
      ]);

      if (salesRes.data) {
        setJmlTransaksi(salesRes.data.length);
        setOmzet(salesRes.data.reduce((acc, curr) => acc + (curr.total_amount || 0), 0));
      }

      if (itemsRes.data) {
        const totalQty = itemsRes.data.reduce((acc, curr) => acc + (curr.qty || 0), 0);
        setJmlPcs(totalQty);

        const totalProfit = itemsRes.data.reduce((acc, curr) => {
          const revenue = (curr.price_at_sale || 0) * (curr.qty || 0);
          const hpp = (curr.cost_at_sale || 0) * (curr.qty || 0);
          return acc + (revenue - hpp);
        }, 0);
        setLabaKotor(totalProfit);
      }

      if (kasRes.data) {
        setSaldoKas(kasRes.data.reduce((acc, curr) => acc + (curr.balance || 0), 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Laporan Utama Septy Softlens\n" +
      `Tanggal Cetak,${new Date().toLocaleDateString("id-ID")}\n` +
      `Cabang,${filterBranch}\n\n` +
      "Ringkasan Penjualan\n" +
      `Total Omzet,Rp ${omzet}\n` +
      `Total Laba Kotor,Rp ${labaKotor}\n` +
      `Jumlah Transaksi,${jmlTransaksi} struk\n` +
      `Jumlah Pcs Terjual,${jmlPcs} pcs\n` +
      `Total Saldo Kas Toko,Rp ${saldoKas}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-septy-softlens-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyFilter = () => {
    setIsFilterModalOpen(false);
    fetchReportData();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan Utama</h1>
          <p className="text-gray-500 mt-1">Ringkasan komprehensif bisnis Anda.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => setIsFilterModalOpen(true)}
            variant="outline" 
            className="bg-white hover:bg-gray-50 font-bold shadow-sm h-11 px-5 border-gray-200 rounded-xl flex items-center gap-2"
          >
            <Filter className="h-4 w-4" /> Filter Lanjut
          </Button>
          <Button 
            onClick={handleExportCSV}
            className="bg-[#00a84e] hover:bg-green-600 text-white font-bold shadow-sm h-11 px-5 rounded-xl flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Penjualan */}
        <section className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">1. Penjualan</h2>
            <button onClick={fetchReportData} className="text-gray-400 hover:text-gray-600 p-1">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#f0f4ff] rounded-2xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#1c5ffb] mb-1">Omzet</p>
              <div className="text-3xl font-black text-[#1c5ffb]">Rp {omzet.toLocaleString()}</div>
            </div>
            <div className="bg-green-50 rounded-2xl p-5 border border-transparent">
              <p className="text-sm font-bold text-green-600 mb-1">Laba Kotor</p>
              <div className="text-3xl font-black text-green-600">Rp {labaKotor.toLocaleString()}</div>
            </div>
            <div className="bg-[#f0f4ff] rounded-2xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#1c5ffb] mb-1">Jml Transaksi</p>
              <div className="text-3xl font-black text-[#1c5ffb]">{jmlTransaksi} <span className="text-base font-bold">struk</span></div>
            </div>
            <div className="bg-[#fff7ed] rounded-2xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#ea580c] mb-1">Jml Pcs Terjual</p>
              <div className="text-3xl font-black text-[#ea580c]">{jmlPcs} <span className="text-base font-bold">pcs</span></div>
            </div>
          </div>
        </section>

        {/* 2. Kas & Keuangan */}
        <section className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">2. Kas & Keuangan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Kas Masuk (Penjualan)</p>
              <div className="text-2xl font-black text-green-600">Rp {omzet.toLocaleString()}</div>
            </div>
            <div className="border border-gray-200 rounded-2xl p-5 bg-[#f0f4ff]">
              <p className="text-xs font-bold text-[#1c5ffb] mb-1 uppercase tracking-wider">Total Saldo Kas (Realtime)</p>
              <div className="text-2xl font-black text-[#1c5ffb]">Rp {saldoKas.toLocaleString()}</div>
            </div>
            <div className="border border-gray-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Laba Bersih Toko</p>
              <div className="text-2xl font-black text-emerald-700">Rp {labaKotor.toLocaleString()}</div>
            </div>
          </div>
        </section>
      </div>

      {/* Modal Filter Lanjut */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Filter Lanjut Laporan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Cabang Toko</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="Semua Cabang">Semua Cabang (Global)</option>
                <option value="Pusat">Pusat</option>
                <option value="Cabang 1">Cabang 1</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFilterModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleApplyFilter} className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold">
                Terapkan Filter
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
