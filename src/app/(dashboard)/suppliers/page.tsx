"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Plus, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { purchasesService } from "@/lib/services";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type DebtItem = {
  id: string;
  poNumber: string;
  supplier: string;
  date: string;
  dueDate: string;
  totalDebt: number;
  remainingDebt: number;
  status: "LUNAS" | "BELUM LUNAS" | "JATUH TEMPO";
};

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<"utang" | "riwayat">("utang");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("Semua Supplier");
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDebts = async () => {
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
        const mapped: DebtItem[] = data.map((item: any) => ({
          id: item.id,
          poNumber: item.po_number || `PO-${item.id.slice(0, 8)}`,
          supplier: item.supplier?.name || "PT Optik Sentosa Abadi",
          date: new Date(item.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          dueDate: "30 Hari Lagi",
          totalDebt: Number(item.total_amount) || 0,
          remainingDebt: Number(item.debt_amount) || 0,
          status: Number(item.debt_amount) === 0 ? "LUNAS" : "BELUM LUNAS",
        }));
        setDebts(mapped);
      } else {
        setDebts([
          {
            id: "1",
            poNumber: "PO-2026-001",
            supplier: "PT Optik Sentosa Abadi",
            date: "01 Okt 2026",
            dueDate: "30 Okt 2026",
            totalDebt: 5000000,
            remainingDebt: 2500000,
            status: "BELUM LUNAS",
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching debts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const totalUtangBerjalan = debts.reduce((acc, curr) => acc + curr.remainingDebt, 0);

  const handleOpenAdd = () => {
    setSupplier("");
    setPoNumber(`PO-${Date.now().toString().slice(-4)}`);
    setDueDate("30 hari lagi");
    setAmount("");
    setIsModalOpen(true);
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim() || !amount.trim()) return;

    setIsSubmitting(true);
    try {
      const parsed = parseFloat(amount) || 0;
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
          po_number: poNumber,
          supplier_id: supplierId,
          total_amount: parsed,
          paid_amount: 0,
          debt_amount: parsed,
          payment_status: "UNPAID",
          status: "ORDERED",
        });
      }

      setIsModalOpen(false);
      fetchDebts();
    } catch (err: any) {
      console.error(err);
      alert(`Gagal mencatat utang: ${err.message || "Error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInstallment = async (id: string) => {
    const target = debts.find((d) => d.id === id);
    if (!target) return;

    const payInput = prompt(
      `Bayar cicilan untuk ${target.supplier} (Sisa: Rp ${target.remainingDebt.toLocaleString()}):`,
      String(target.remainingDebt)
    );
    if (!payInput) return;

    const payAmount = parseFloat(payInput) || 0;
    if (payAmount <= 0) return;

    try {
      // Coba panggil service payPurchaseDebt via RPC
      await purchasesService.payPurchaseDebt(id, payAmount);
      alert("Pembayaran cicilan berhasil dicatat!");
      fetchDebts();
    } catch (err: any) {
      // Fallback manual update jika ID mock
      console.warn("RPC pay_purchase_debt note:", err.message);
      const newRemaining = Math.max(0, target.remainingDebt - payAmount);
      await supabase
        .from("purchases")
        .update({
          debt_amount: newRemaining,
          payment_status: newRemaining === 0 ? "PAID" : "PARTIAL",
        })
        .eq("id", id);

      setDebts(
        debts.map((d) => {
          if (d.id === id) {
            return {
              ...d,
              remainingDebt: newRemaining,
              status: newRemaining === 0 ? "LUNAS" : "BELUM LUNAS",
            };
          }
          return d;
        })
      );
    }
  };

  const filteredDebts = debts.filter((d) => {
    if (selectedSupplierFilter === "Semua Supplier") return true;
    return d.supplier === selectedSupplierFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan & Utang Supplier</h1>
          <p className="text-gray-500 mt-1">Kelola data pembelian, riwayat harga, dan cicilan utang.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchDebts}
            variant="outline"
            className="rounded-xl h-11 px-3 border-gray-200"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button 
            onClick={handleOpenAdd}
            className="bg-[#1c5ffb] hover:bg-blue-700 text-white rounded-xl px-5 font-semibold shadow-sm h-11 flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Catat Utang Baru
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-red-100 shadow-sm bg-red-50/50">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-red-500 mb-2">Total Utang Berjalan</h3>
            <div className="text-3xl font-black text-red-500">
              Rp {totalUtangBerjalan.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 shadow-sm bg-white">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-gray-500 mb-2">Filter Supplier</h3>
            <div className="relative">
              <select 
                value={selectedSupplierFilter}
                onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-700 font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Semua Supplier">Semua Supplier</option>
                {Array.from(new Set(debts.map((d) => d.supplier))).map((sup) => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 px-4">
          <button 
            onClick={() => setActiveTab("utang")}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
              activeTab === "utang"
                ? "text-red-500 border-red-500 bg-red-50/30"
                : "text-gray-400 hover:text-gray-600 border-transparent"
            }`}
          >
            Tagihan & Utang
          </button>
          <button 
            onClick={() => setActiveTab("riwayat")}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
              activeTab === "riwayat"
                ? "text-blue-600 border-blue-600 bg-blue-50/30"
                : "text-gray-400 hover:text-gray-600 border-transparent"
            }`}
          >
            Laporan Riwayat Pembelian
          </button>
        </div>
        
        <div className="p-1">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white border-b-0">
                <TableHead className="font-bold text-gray-700 py-4 px-6">PO / Supplier</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Tanggal & Jatuh Tempo</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Total Utang</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Sisa Utang</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Status</TableHead>
                <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-gray-400 font-medium border-b-0">
                    Tidak ada data tagihan / utang.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDebts.map((d) => (
                  <TableRow key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell className="px-6 py-4">
                      <p className="font-mono text-xs font-bold text-blue-600">{d.poNumber}</p>
                      <p className="font-bold text-gray-900 text-sm">{d.supplier}</p>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <p className="text-xs text-gray-700 font-medium">{d.date}</p>
                      <p className="text-[11px] text-red-500 font-bold mt-0.5">Tempo: {d.dueDate}</p>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center text-sm font-semibold text-gray-800">
                      Rp {d.totalDebt.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center text-sm font-black text-red-600">
                      Rp {d.remainingDebt.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        d.status === "LUNAS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {d.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      {d.remainingDebt > 0 ? (
                        <button
                          onClick={() => handlePayInstallment(d.id)}
                          className="bg-blue-50 hover:bg-blue-100 text-[#1c5ffb] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Bayar Cicilan
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600">Lunas</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal Catat Utang Baru */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Catat Tagihan & Utang Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDebt} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Supplier</label>
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
              <label className="block text-xs font-bold text-gray-700 mb-1">Total Utang (Rp)</label>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 3000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Jatuh Tempo</label>
              <input
                type="text"
                placeholder="Contoh: 30 Hari Lagi / 15 Nov 2026"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold">
                {isSubmitting ? "Menyimpan..." : "Simpan Utang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
