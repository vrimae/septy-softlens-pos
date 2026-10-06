"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { returnsService } from "@/lib/services";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type ReturnItem = {
  id: string;
  date: string;
  originalTrx: string;
  item: string;
  qty: number;
  reason: string;
  destination: string;
  exchangeWith: string;
  difference: number;
  handler: string;
};

export default function ReturnsPage() {
  const [returnsList, setReturnsList] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originalTrx, setOriginalTrx] = useState("");
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("Salah Minus / Warna");
  const [destination, setDestination] = useState("Gudang Baik (Bisa Dijual Lagi)");
  const [exchangeWith, setExchangeWith] = useState("");
  const [difference, setDifference] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("returns")
        .select(`
          id,
          return_number,
          return_type,
          price_difference,
          created_at,
          sale:sales(invoice_number, receipt_number)
        `)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: ReturnItem[] = data.map((r: any) => ({
          id: r.return_number || `RET-${r.id.slice(0, 6)}`,
          date: new Date(r.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          originalTrx: r.sale?.invoice_number || r.sale?.receipt_number || "TRX-POS",
          item: "Lensa Kontak Softlens",
          qty: 1,
          reason: "Tukar Varian / Minus",
          destination: "Gudang Baik",
          exchangeWith: "Varian Sesuai Resep",
          difference: Number(r.price_difference) || 0,
          handler: "Kasir & Owner",
        }));
        setReturnsList(mapped);
      } else {
        setReturnsList([
          {
            id: "RET-101",
            date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
            originalTrx: "INV-20261006-0001",
            item: "X2 Sanso Color Hazel Plano",
            qty: 1,
            reason: "Minus Salah Beli",
            destination: "Gudang Baik",
            exchangeWith: "X2 Sanso Color Hazel -2.00",
            difference: 0,
            handler: "Kasir Utama",
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching returns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleOpenAdd = () => {
    setOriginalTrx("");
    setItem("");
    setQty("1");
    setReason("Salah Minus / Warna");
    setDestination("Gudang Baik (Bisa Dijual Lagi)");
    setExchangeWith("");
    setDifference("0");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !originalTrx.trim()) return;

    setIsSubmitting(true);
    try {
      const returnNumber = `RTN-${Date.now().toString().slice(-6)}`;
      const diffAmount = parseFloat(difference) || 0;

      // Cek sale id
      const { data: saleData } = await supabase
        .from("sales")
        .select("id")
        .or(`invoice_number.eq.${originalTrx.trim()},receipt_number.eq.${originalTrx.trim()}`)
        .limit(1)
        .maybeSingle();

      await supabase.from("returns").insert({
        return_number: returnNumber,
        sale_id: saleData?.id || null,
        return_type: diffAmount > 0 ? "REFUND" : "EXCHANGE",
        price_difference: diffAmount,
        status: "COMPLETED",
      });

      setIsModalOpen(false);
      fetchReturns();
    } catch (err: any) {
      console.error(err);
      alert(`Gagal memproses retur: ${err.message || "Error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Retur / Tukar Barang</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kebijakan retur fleksibel. Hanya melayani tukar barang.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchReturns}
            variant="outline"
            className="rounded-xl h-11 px-3 border-gray-200 dark:border-gray-800"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button 
            onClick={handleOpenAdd}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 font-semibold shadow-sm h-11 flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Proses Retur / Tukar
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-1 mt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-white dark:bg-[#13151a] hover:bg-white dark:bg-[#13151a] border-b-0 border-t border-gray-100 dark:border-gray-800/50">
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6">ID Retur</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6">Tanggal</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Trx Asal</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Item Retur & Alasan</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Tukar Dengan</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-right">Selisih Biaya</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returnsList.map((r) => (
              <TableRow key={r.id} className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329]/50">
                <TableCell className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">{r.id}</TableCell>
                <TableCell className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-400">{r.date}</TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-[#2a303c] px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                    {r.originalTrx}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-xs">{r.item} ({r.qty} pcs)</p>
                  <p className="text-[11px] text-red-500 font-medium mt-0.5">{r.reason}</p>
                </TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <p className="font-bold text-emerald-600 text-xs">{r.exchangeWith}</p>
                  <p className="text-[10px] text-gray-400">Menuju: {r.destination}</p>
                </TableCell>
                <TableCell className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {r.difference === 0 ? "Rp 0 (Pas)" : `Rp ${r.difference.toLocaleString()}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal Tambah Retur */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Formulir Retur / Tukar Barang</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">No. Invoice / Resi Transaksi Asal</label>
              <input
                type="text"
                placeholder="Contoh: INV-20261006-0001"
                value={originalTrx}
                onChange={(e) => setOriginalTrx(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Barang Yang Diretur</label>
              <input
                type="text"
                placeholder="Contoh: Softlens Gray 14.5mm"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Jumlah (Pcs)</label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Alasan Retur</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="Salah Minus / Warna">Salah Minus / Warna</option>
                  <option value="Barang Cacat Pabrik">Barang Cacat Pabrik</option>
                  <option value="Kemasan Rusak">Kemasan Rusak</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Ditukar Dengan (Item Baru)</label>
              <input
                type="text"
                placeholder="Contoh: Softlens Brown 14.5mm Minus -2.00"
                value={exchangeWith}
                onChange={(e) => setExchangeWith(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Tujuan Fisik Barang Retur</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="Gudang Baik (Bisa Dijual Lagi)">Gudang Baik</option>
                  <option value="Gudang Rusak (Klaim Pabrik)">Gudang Rusak</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Selisih Harga (Rp)</label>
                <input
                  type="number"
                  placeholder="0 jika harga sama"
                  value={difference}
                  onChange={(e) => setDifference(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                />
              </div>
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
                {isSubmitting ? "Menyimpan..." : "Simpan Retur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
