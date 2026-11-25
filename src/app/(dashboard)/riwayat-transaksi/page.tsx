"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Printer, Eye, RefreshCw, Copy, Check, Trash2, Calendar, UserCheck, Filter, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import useSWR from "swr";
import { printReceipt, printReceiptViaBluetooth, printReceiptViaWebSerial, ReceiptData, PaperWidth } from "@/lib/receipt";

type SaleTransaction = {
  id: string;
  receipt_number: string;
  created_at: string;
  total_amount: number;
  discount_amount?: number | null;
  payment_method: string;
  status: string;
  notes?: string | null;
  cashier_id?: string | null;
  cashier?: {
    id?: string;
    full_name?: string;
    role?: string;
    email?: string;
  } | null;
  customers?: { name: string } | null;
  sale_items?: {
    id: string;
    qty: number;
    price_at_sale: number;
    subtotal: number;
    products?: { name: string; product_code: string } | null;
  }[];
  sale_payments?: {
    payment_method: string;
    amount: number;
  }[];
};

export default function RiwayatTransaksiPage() {
  const { role } = useAuth();
  const isOwner = role === "owner";
  const isAdmin = role === "admin" || role === "owner";

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterUpselling, setFilterUpselling] = useState<string>("ALL");

  // Helper cek apakah transaksi merupakan hasil upselling yang diaktifkan kasir
  const isUpsellingTrx = (t: SaleTransaction) => {
    return Boolean(t.notes?.includes("[UPSELLING]"));
  };

  const getUpsellingItemCount = (t: SaleTransaction) => {
    return t.sale_items?.reduce((sum, it) => sum + (Number(it.qty) || 1), 0) || t.sale_items?.length || 0;
  };

  const [selectedTrx, setSelectedTrx] = useState<SaleTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SaleTransaction | null>(null);
  const [restoreStock, setRestoreStock] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperWidth>(58);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [isSerialPrinting, setIsSerialPrinting] = useState(false);

  const { data: storeInfo = {} as any } = useSWR("store_info_history", async () => {
    const { data } = await supabase
      .from("store_settings")
      .select("store_name, address, phone, receipt_footer")
      .limit(1)
      .maybeSingle();
    return (data || {}) as any;
  });

  const copyReceipt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*, customers(name), sale_items(*, products(name, product_code)), sale_payments(*), cashier:profiles(id, full_name, role, email)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data || []) as any[]).map((s) => ({
      ...s,
      receipt_number: s.receipt_number || s.invoice_number,
    })) as SaleTransaction[];
  };

  const { data: transactions = [], isValidating, mutate } = useSWR("sales_history", fetchTransactions);
  const loading = !transactions.length && isValidating;

  const handleDeleteTransaction = async () => {
    if (!isOwner) {
      alert("Hanya akun Owner yang berhak menghapus transaksi!");
      return;
    }
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_sale", {
        p_sale_id: deleteTarget.id,
        p_restore_stock: restoreStock,
      });

      if (error) throw error;

      await mutate();
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Gagal menghapus transaksi:", err);
      alert(`Gagal menghapus transaksi: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toReceiptData = (trx: SaleTransaction): ReceiptData => {
    const totalPaid = (trx.sale_payments || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
    const calculatedChange = Math.max(0, totalPaid - Number(trx.total_amount || 0));

    return {
      storeName: storeInfo.store_name || "Septy Softlens",
      address: storeInfo.address || "",
      phone: storeInfo.phone || "",
      footer: storeInfo.receipt_footer || "Terima kasih atas kunjungan Anda!",
      branchName: "Pusat",
      cashier: trx.cashier?.full_name || "Kasir",
      customer: trx.customers?.name || "Umum",
      invoice: trx.receipt_number,
      date: new Date(trx.created_at).toLocaleString("id-ID"),
      items: (trx.sale_items || []).map((it) => ({
        name: it.products?.name || "Produk",
        qty: it.qty,
        price: it.price_at_sale,
      })),
      subtotal: Number(trx.total_amount || 0) + Number(trx.discount_amount || 0),
      discount: Number(trx.discount_amount || 0),
      total: Number(trx.total_amount || 0),
      payments:
        trx.sale_payments && trx.sale_payments.length > 0
          ? trx.sale_payments.map((p: any) => ({
              label: p.payment_method || "PEMBAYARAN",
              amount: Number(p.amount || 0),
            }))
          : [{ label: trx.payment_method || "TUNAI", amount: totalPaid || trx.total_amount }],
      change: calculatedChange,
    };
  };

  const handlePrint = (trx: SaleTransaction) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setSelectedTrx(trx);
    printReceipt(toReceiptData(trx), paper);
    setTimeout(() => setIsPrinting(false), 2000);
  };

  const handlePrintSerial = async (trx: SaleTransaction) => {
    if (isSerialPrinting) return;
    setIsSerialPrinting(true);
    try {
      const res = await printReceiptViaWebSerial(toReceiptData(trx), paper);
      if (!res.success) {
        alert(res.message);
      }
    } catch (e: any) {
      alert(`Error USB Langsung: ${e.message}`);
    } finally {
      setIsSerialPrinting(false);
    }
  };

  const handlePrintBluetooth = async (trx: SaleTransaction) => {
    if (isBluetoothPrinting) return;
    setIsBluetoothPrinting(true);
    try {
      const res = await printReceiptViaBluetooth(toReceiptData(trx), paper);
      if (!res.success) {
        alert(res.message);
      }
    } catch (e: any) {
      alert(`Error Bluetooth: ${e.message}`);
    } finally {
      setIsBluetoothPrinting(false);
    }
  };

  // Helper untuk set filter ke Hari Ini
  const handleSetToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setFilterDate(`${yyyy}-${mm}-${dd}`);
  };

  // Filter gabungan: Pencarian, Role, dan Tanggal
  const filtered = transactions.filter((t) => {
    // 1. Filter Pencarian Text
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      t.receipt_number?.toLowerCase().includes(q) ||
      t.customers?.name?.toLowerCase().includes(q) ||
      t.payment_method?.toLowerCase().includes(q) ||
      t.cashier?.full_name?.toLowerCase().includes(q);

    // 2. Filter Role
    let matchesRole = true;
    const trxRole = (t.cashier?.role || "kasir").toLowerCase();
    if (isAdmin) {
      if (filterRole !== "ALL") {
        matchesRole = trxRole === filterRole.toLowerCase();
      }
    } else {
      // Non-admin (misal Kasir biasa) hanya melihat transaksi kasir
      matchesRole = trxRole === (role || "kasir").toLowerCase();
    }

    // 3. Filter Tanggal per Hari
    let matchesDate = true;
    if (filterDate) {
      const trxDate = new Date(t.created_at);
      const yyyy = trxDate.getFullYear();
      const mm = String(trxDate.getMonth() + 1).padStart(2, "0");
      const dd = String(trxDate.getDate()).padStart(2, "0");
      const trxDateStr = `${yyyy}-${mm}-${dd}`;
      matchesDate = trxDateStr === filterDate;
    }

        // 4. Filter Upselling
    let matchesUpselling = true;
    if (filterUpselling === "UPSELLING") {
      matchesUpselling = isUpsellingTrx(t);
    } else if (filterUpselling === "REGULAR") {
      matchesUpselling = !isUpsellingTrx(t);
    }

    return matchesSearch && matchesRole && matchesDate && matchesUpselling;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Riwayat Transaksi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Pantau riwayat penjualan per role, per tanggal, dan cetak ulang struk.</p>
        </div>
        <button
          onClick={fetchTransactions}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a303c] transition-colors shadow-sm self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang Data
        </button>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-1">
        {/* Panel Kontrol Filter (Role, Tanggal, & Pencarian) */}
        <div className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari ID Struk, Pelanggan, Kasir..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-xl text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter Role (Khusus Admin & Owner bisa lihat dan pilih semua role) */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#1a1f26] border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 py-1">
                <UserCheck className="h-4 w-4 text-gray-400 shrink-0" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-700 dark:text-gray-300 py-1.5 pr-2 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Role</option>
                  <option value="owner">Role: Owner</option>
                  <option value="admin">Role: Admin</option>
                  <option value="kasir">Role: Kasir</option>
                  <option value="warehouse">Role: Warehouse</option>
                </select>
              </div>
            )}

            {/* Filter Tanggal (Per Hari) */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#1a1f26] border border-gray-200 dark:border-gray-800 rounded-xl px-2.5 py-1">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 dark:text-gray-300 py-1 focus:outline-none cursor-pointer"
              />
              {filterDate ? (
                <button
                  type="button"
                  onClick={() => setFilterDate("")}
                  className="text-[11px] text-red-500 hover:text-red-700 font-bold ml-1 px-1"
                  title="Hapus filter tanggal"
                >
                  ✕
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 font-bold ml-1 hover:underline whitespace-nowrap"
                >
                  Hari Ini
                </button>
              )}
            </div>
          </div>

          {/* Info Jumlah Transaksi & Upselling */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="bg-gray-100 dark:bg-[#1e2329] px-3 py-1.5 rounded-lg">
              Total: <strong>{filtered.length}</strong> transaksi
            </span>
            <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
              Upselling: <strong>{filtered.filter(isUpsellingTrx).length}</strong> transaksi
            </span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-[#1e2329]/50 hover:bg-gray-50 dark:hover:bg-[#2a303c] border-b-0 border-t border-gray-100 dark:border-gray-800/50">
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6">No. Struk & Waktu</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Petugas & Role</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Pelanggan</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Metode Bayar</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-right">Total Pembayaran</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Upselling</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Status</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-600" />
                  Memuat riwayat transaksi...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-gray-500 dark:text-gray-400 font-medium border-b-0">
                  Tidak ada riwayat transaksi yang cocok dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => {
                const roleName = (t.cashier?.role || "KASIR").toUpperCase();
                const badgeColor =
                  roleName === "OWNER"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                    : roleName === "ADMIN"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";

                return (
                  <TableRow key={t.id} className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329]/50">
                    <TableCell className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <span className="select-all">{t.receipt_number}</span>
                        <button
                          onClick={() => copyReceipt(t.receipt_number)}
                          title="Salin No. Struk"
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#2a303c]"
                        >
                          {copiedId === t.receipt_number ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </button>
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(t.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                        {t.cashier?.full_name || "Kasir Toko"}
                      </p>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${badgeColor}`}>
                        {roleName}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center font-semibold text-gray-800 dark:text-gray-200">
                      {t.customers?.name || "Umum / Regular"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className="bg-slate-100 dark:bg-[#2a303c] text-blue-700 dark:text-blue-400 font-bold text-xs px-2.5 py-1 rounded-md">
                        {t.payment_method}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                      Rp {t.total_amount?.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {isUpsellingTrx(t) ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500/15 to-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shadow-xs">
                            <Sparkles className="h-3 w-3 text-amber-500 fill-amber-400" />
                            Upselling
                          </span>
                          <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                            {getUpsellingItemCount(t)} produk
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-medium">
                          Reguler
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-bold text-xs px-2.5 py-1 rounded-full">
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedTrx(t)}
                          className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2a303c] rounded-lg transition-colors"
                          title="Lihat Detail Struk"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(t)}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a303c] rounded-lg transition-colors"
                          title="Cetak Ulang Struk"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => {
                              setDeleteTarget(t);
                              setRestoreStock(true);
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                            title="Hapus Transaksi (Khusus Owner)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Detail & Cetak Struk */}
      <Dialog open={!!selectedTrx} onOpenChange={(open) => !open && setSelectedTrx(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[460px] max-h-[92vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-center">Detail Struk Transaksi</DialogTitle>
          </DialogHeader>
          {selectedTrx && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="border-b pb-3 text-center">
                <h3 className="font-semibold text-base">{storeInfo.store_name || "Septy Softlens"}</h3>
                <p className="text-xs text-gray-400">{storeInfo.address || "Jl. Contoh Alamat No 123"}</p>
                <p className="text-xs font-mono font-bold mt-1 text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1.5">
                  {selectedTrx.receipt_number}
                  <button
                    onClick={() => copyReceipt(selectedTrx.receipt_number)}
                    title="Salin No. Struk"
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#2a303c]"
                  >
                    {copiedId === selectedTrx.receipt_number ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-gray-500" />
                    )}
                  </button>
                </p>
                <p className="text-[11px] text-gray-400">
                  {new Date(selectedTrx.created_at).toLocaleString("id-ID")}
                </p>
              </div>

              {isUpsellingTrx(selectedTrx) && (
                <div className="w-full max-w-full overflow-hidden flex items-center gap-2 p-2.5 bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-bold shadow-xs">
                  <Sparkles className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
                  <span className="flex-1 min-w-0 break-words leading-snug">
                    Transaksi ini Berhasil Upselling ({getUpsellingItemCount(selectedTrx)} produk terjual)!
                  </span>
                </div>
              )}

              <div className="space-y-2 border-b pb-3">
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
                  <span>Petugas / Kasir:</span>
                  <span>{selectedTrx.cashier?.full_name || "Kasir"} ({selectedTrx.cashier?.role || "KASIR"})</span>
                </div>
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
                      <p className="text-gray-400">{item.qty} x Rp {item.price_at_sale?.toLocaleString("id-ID")}</p>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-gray-100">Rp {item.subtotal?.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              {Number(selectedTrx.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <span>Potongan Harga:</span>
                  <span>- Rp {Number(selectedTrx.discount_amount).toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-1">
                <span>Total Akhir:</span>
                <span className="text-slate-900 dark:text-slate-100">Rp {selectedTrx.total_amount?.toLocaleString("id-ID")}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold pt-2 border-t">
                <span className="text-gray-500">Ukuran Kertas:</span>
                <div className="flex gap-1.5">
                  {([58, 80] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setPaper(w)}
                      className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${
                        paper === w
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white dark:bg-[#1e2329] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      {w} mm
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips Anti Panjang di Device Baru */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-200">
                <p className="font-bold">💡 Tips Device Baru:</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Gunakan <strong>Cetak Bluetooth</strong> atau <strong>Cetak USB Langsung</strong> agar kertas tidak keluar panjang di device baru!
                </p>
              </div>

              <DialogFooter className="pt-2 flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <Button
                    disabled={isBluetoothPrinting}
                    variant="outline"
                    onClick={() => {
                      if (isBluetoothPrinting || !selectedTrx) return;
                      handlePrintBluetooth(selectedTrx);
                    }}
                    className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-bold text-xs"
                  >
                    <Printer className="h-4 w-4 mr-1.5 text-blue-600" /> {isBluetoothPrinting ? "Menghubungkan..." : "1. Cetak Bluetooth"}
                  </Button>
                  <Button
                    disabled={isSerialPrinting}
                    variant="outline"
                    onClick={() => {
                      if (isSerialPrinting || !selectedTrx) return;
                      handlePrintSerial(selectedTrx);
                    }}
                    className="border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold text-xs"
                  >
                    <Printer className="h-4 w-4 mr-1.5 text-emerald-600" /> {isSerialPrinting ? "Mencetak..." : "2. Cetak USB Langsung"}
                  </Button>
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" className="w-24 text-xs font-semibold" onClick={() => setSelectedTrx(null)}>
                    Tutup
                  </Button>
                  <Button
                    disabled={isPrinting}
                    onClick={() => {
                      if (isPrinting || !selectedTrx) return;
                      setIsPrinting(true);
                      printReceipt(toReceiptData(selectedTrx), paper);
                      setTimeout(() => setIsPrinting(false), 2000);
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                  >
                    <Printer className="h-4 w-4 mr-1.5" /> {isPrinting ? "Membuka..." : "3. Cetak Dialog Chrome (USB)"}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Transaksi (Khusus Owner) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Hapus Transaksi Penjualan
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4 pt-2 text-sm">
              <p className="text-gray-600 dark:text-gray-300">
                Apakah Anda yakin ingin menghapus transaksi ini secara permanen dari sistem?
              </p>

              <div className="p-3 bg-gray-50 dark:bg-[#1a1f26] border border-gray-200 dark:border-gray-800 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">No. Struk:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{deleteTarget.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Waktu:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {new Date(deleteTarget.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pelanggan:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{deleteTarget.customers?.name || "Umum / Regular"}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1.5">
                  <span className="font-bold text-gray-700 dark:text-gray-300">Total Pembayaran:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Rp {deleteTarget.total_amount?.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-amber-50/50 dark:bg-amber-950/20">
                <input
                  type="checkbox"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Kembalikan stok produk (Restock)</span>
                  <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                    Jumlah barang pada transaksi ini akan dikembalikan secara otomatis ke stok toko.
                  </p>
                </div>
              </label>

              <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                ⚠️ <strong>Peringatan:</strong> Data transaksi yang dihapus tidak dapat dipulihkan kembali. Tindakan ini hanya boleh dilakukan oleh Owner.
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                  Batal
                </Button>
                <Button
                  onClick={handleDeleteTransaction}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus Permanen"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
