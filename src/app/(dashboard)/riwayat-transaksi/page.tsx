"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, Eye, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type SaleTransaction = {
  id: string;
  receipt_number: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  status: string;
  customers?: { name: string } | null;
  sale_items?: {
    id: string;
    qty: number;
    price_at_sale: number;
    subtotal: number;
    products?: { name: string; product_code: string } | null;
  }[];
};

export default function RiwayatTransaksiPage() {
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTrx, setSelectedTrx] = useState<SaleTransaction | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*, customers(name), sale_items(*, products(name, product_code))")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTransactions(data as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handlePrint = (trx: SaleTransaction) => {
    setSelectedTrx(trx);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const filtered = transactions.filter(
    (t) =>
      t.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.payment_method?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Riwayat Transaksi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Pantau seluruh riwayat penjualan dan cetak ulang struk.</p>
        </div>
        <button
          onClick={fetchTransactions}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329] transition-colors shadow-sm self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang Data
        </button>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-1">
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID Struk, Pelanggan, atau Metode..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Menampilkan {filtered.length} transaksi
          </span>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-[#1e2329]/50 hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329]/50 border-b-0 border-t border-gray-100 dark:border-gray-800/50">
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6">No. Struk & Waktu</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Cabang</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Pelanggan</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Metode Bayar</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-right">Total Pembayaran</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Status</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-600" />
                  Memuat riwayat transaksi...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-gray-500 dark:text-gray-400 font-medium border-b-0">
                  Tidak ada riwayat transaksi ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id} className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329]/50">
                  <TableCell className="px-6 py-4">
                    <p className="font-bold text-gray-900 dark:text-gray-100">{t.receipt_number}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-medium text-gray-700 dark:text-gray-300">Pusat</TableCell>
                  <TableCell className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200">
                    {t.customers?.name || "Umum / Regular"}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span className="bg-slate-100 dark:bg-[#2a303c] text-blue-700 font-bold text-xs px-2.5 py-1 rounded-md">
                      {t.payment_method}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                    Rp {t.total_amount?.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span className="bg-green-100 text-green-700 font-bold text-xs px-2.5 py-1 rounded-full">
                      {t.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedTrx(t)}
                        className="p-1.5 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#2a303c] dark:bg-[#2a303c] rounded-lg transition-colors"
                        title="Lihat Detail Struk"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePrint(t)}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a303c] dark:bg-[#2a303c] rounded-lg transition-colors"
                        title="Cetak Ulang Struk"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Detail & Cetak Struk */}
      <Dialog open={!!selectedTrx} onOpenChange={(open) => !open && setSelectedTrx(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-center">Detail Struk Transaksi</DialogTitle>
          </DialogHeader>
          {selectedTrx && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="border-b pb-3 text-center">
                <h3 className="font-semibold text-base">Septy Softlens</h3>
                <p className="text-xs text-gray-400">Jl. Contoh Alamat No 123</p>
                <p className="text-xs font-mono font-bold mt-1 text-gray-700 dark:text-gray-300">{selectedTrx.receipt_number}</p>
                <p className="text-[11px] text-gray-400">
                  {new Date(selectedTrx.created_at).toLocaleString("id-ID")}
                </p>
              </div>

              <div className="space-y-2 border-b pb-3">
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
                  <span>Pelanggan:</span>
                  <span>{selectedTrx.customers?.name || "Umum"}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
                  <span>Metode:</span>
                  <span>{selectedTrx.payment_method}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 border-b pb-3 max-h-48 overflow-y-auto">
                {selectedTrx.sale_items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200">{item.products?.name || "Produk"}</p>
                      <p className="text-gray-400">{item.qty} x Rp {item.price_at_sale?.toLocaleString()}</p>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-gray-100">Rp {item.subtotal?.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-semibold text-base pt-1">
                <span>Total Akhir:</span>
                <span className="text-slate-900 dark:text-slate-100">Rp {selectedTrx.total_amount?.toLocaleString()}</span>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setSelectedTrx(null)}>
                  Tutup
                </Button>
                <Button 
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" /> Cetak Struk
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
