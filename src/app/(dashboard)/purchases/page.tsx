"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplier: string;
  invoice: string;
  date: string;
  status: "LUNAS" | "UTANG" | "PENDING";
  paymentMethod: string;
  totalCost: number;
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [invoice, setInvoice] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [status, setStatus] = useState<"LUNAS" | "UTANG" | "PENDING">("LUNAS");
  const [paymentMethod, setPaymentMethod] = useState("Transfer Bank");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          id,
          po_number,
          total_amount,
          debt_amount,
          payment_status,
          created_at,
          supplier:suppliers(name)
        `)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: PurchaseOrder[] = data.map((item: any) => ({
          id: item.id,
          poNumber: item.po_number || `PO-${item.id.slice(0, 8)}`,
          supplier: item.supplier?.name || "Supplier Mitra",
          invoice: item.po_number || "-",
          date: new Date(item.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          status: item.debt_amount > 0 ? "UTANG" : "LUNAS",
          paymentMethod: "Transfer Bank",
          totalCost: Number(item.total_amount) || 0,
        }));
        setPurchases(mapped);
      } else {
        // Fallback demo data jika belum ada transaksi di DB
        setPurchases([
          {
            id: "1",
            poNumber: "PO-2026-001",
            supplier: "PT Optik Sentosa Abadi",
            invoice: "INV-9921",
            date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
            status: "LUNAS",
            paymentMethod: "Transfer Bank",
            totalCost: 12500000,
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleOpenAdd = () => {
    setSupplier("");
    setInvoice("");
    setTotalCost("");
    setStatus("LUNAS");
    setPaymentMethod("Transfer Bank");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim() || !totalCost.trim()) return;

    setIsSubmitting(true);
    try {
      const parsedCost = parseFloat(totalCost) || 0;
      const poNum = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // Cari atau buat supplier
      let supplierId = null;
      const { data: existingSup } = await supabase
        .from("suppliers")
        .select("id")
        .ilike("name", supplier.trim())
        .limit(1)
        .maybeSingle();

      if (existingSup) {
        supplierId = existingSup.id;
      } else {
        const { data: newSup } = await supabase
          .from("suppliers")
          .insert({
            code: `SUP-${Date.now().toString().slice(-4)}`,
            name: supplier.trim(),
            is_active: true,
          })
          .select("id")
          .single();
        if (newSup) supplierId = newSup.id;
      }

      if (supplierId) {
        await supabase.from("purchases").insert({
          po_number: poNum,
          supplier_id: supplierId,
          total_amount: parsedCost,
          paid_amount: status === "LUNAS" ? parsedCost : 0,
          debt_amount: status === "UTANG" ? parsedCost : 0,
          payment_status: status === "LUNAS" ? "PAID" : "UNPAID",
          status: "ORDERED",
        });
      }

      setIsModalOpen(false);
      fetchPurchases();
    } catch (err: any) {
      console.error(err);
      alert(`Gagal menyimpan PO: ${err.message || "Error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pembelian Barang (PO)</h1>
          <p className="text-gray-500 mt-1">Catat belanja stok dari supplier pabrik secara lengkap.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchPurchases}
            variant="outline"
            className="rounded-xl h-11 px-3 border-gray-200"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button 
            onClick={handleOpenAdd}
            className="bg-[#00a84e] hover:bg-green-600 text-white rounded-xl px-5 font-semibold shadow-sm h-11 flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Tambah Pembelian Baru
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden p-1 mt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">No. Internal</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Supplier & Inv</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Tanggal</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Status / Metode</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Total Biaya</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <TableCell className="px-6 py-4 font-bold text-blue-600 font-mono text-sm">{p.poNumber}</TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <p className="font-bold text-gray-900 text-sm">{p.supplier}</p>
                  <p className="text-xs text-gray-400">Inv: {p.invoice}</p>
                </TableCell>
                <TableCell className="px-6 py-4 text-center text-xs text-gray-600 font-medium">{p.date}</TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    p.status === "LUNAS" ? "bg-green-100 text-green-700" : p.status === "UTANG" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {p.status}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-1">{p.paymentMethod}</p>
                </TableCell>
                <TableCell className="px-6 py-4 text-right font-black text-gray-900 text-base">
                  Rp {p.totalCost.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal Tambah PO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Catat Pembelian Stok (PO)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Supplier / Pabrik</label>
              <input
                type="text"
                placeholder="Contoh: PT Optik Sentosa Abadi"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">No. Faktur / Invoice Supplier</label>
              <input
                type="text"
                placeholder="Contoh: INV-9921"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Total Biaya Belanja (Rp)</label>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 5000000"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Status Pembayaran</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="LUNAS">LUNAS</option>
                  <option value="UTANG">UTANG / TEMPO</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Metode Bayar</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="Tunai (Kas)">Tunai (Kas)</option>
                  <option value="Giro / Cek">Giro / Cek</option>
                </select>
              </div>
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#00a84e] hover:bg-green-600 text-white font-bold">
                {isSubmitting ? "Menyimpan..." : "Simpan Pembelian"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
