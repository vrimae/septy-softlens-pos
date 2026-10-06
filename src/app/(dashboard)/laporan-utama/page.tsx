"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter, RefreshCw, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { reportsService } from "@/lib/services";
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
      const metrics = await reportsService.getDashboardMetrics();
      if (metrics) {
        setOmzet(metrics.gross_sales || 0);
        setLabaKotor(metrics.gross_profit || 0);
        setJmlTransaksi(metrics.total_transactions || 0);
        setJmlPcs(metrics.total_items_sold || 0);
      }

      const { data: kasRes } = await supabase.from("cash_registers").select("balance");
      if (kasRes) {
        setSaldoKas(kasRes.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0));
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Laporan Utama</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Ringkasan komprehensif bisnis Anda.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => setIsFilterModalOpen(true)}
            variant="outline" 
            className="bg-white dark:bg-[#13151a] hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329] font-bold shadow-sm h-11 px-5 border-gray-200 dark:border-gray-800 rounded-xl flex items-center gap-2"
          >
            <Filter className="h-4 w-4" /> Filter Lanjut
          </Button>
          <Button 
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm h-11 px-5 rounded-xl flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Penjualan */}
        <section className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">1. Penjualan</h2>
            <button onClick={fetchReportData} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 p-1">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#f0f4ff] dark:bg-blue-900/20 rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Omzet</p>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Rp {omzet.toLocaleString()}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-green-600 mb-1">Laba Kotor</p>
              <div className="text-2xl font-semibold text-green-600">Rp {labaKotor.toLocaleString()}</div>
            </div>
            <div className="bg-[#f0f4ff] dark:bg-blue-900/20 rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Jml Transaksi</p>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{jmlTransaksi} <span className="text-base font-bold">struk</span></div>
            </div>
            <div className="bg-[#fff7ed] rounded-xl p-5 border border-transparent">
              <p className="text-sm font-bold text-[#ea580c] mb-1">Jml Pcs Terjual</p>
              <div className="text-2xl font-semibold text-[#ea580c]">{jmlPcs} <span className="text-base font-bold">pcs</span></div>
            </div>
          </div>
        </section>

        {/* 2. Kas & Keuangan */}
        <section className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">2. Kas & Keuangan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Kas Masuk (Penjualan)</p>
              <div className="text-2xl font-semibold text-green-600">Rp {omzet.toLocaleString()}</div>
            </div>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-[#f0f4ff] dark:bg-blue-900/20">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 uppercase tracking-wider">Total Saldo Kas (Realtime)</p>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Rp {saldoKas.toLocaleString()}</div>
            </div>
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Laba Bersih Toko</p>
              <div className="text-2xl font-semibold text-emerald-700">Rp {labaKotor.toLocaleString()}</div>
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
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Cabang Toko</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="Semua Cabang">Semua Cabang (Global)</option>
                <option value="Pusat">Pusat</option>
                <option value="Cabang 1">Cabang 1</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFilterModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleApplyFilter} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
                Terapkan Filter
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
