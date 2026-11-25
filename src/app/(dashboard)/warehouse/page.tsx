"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { unwrap, scopeBranch, withBranch, friendlyError } from "@/lib/supabase/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type DamagedProduct = {
  id: string;
  code: string;
  name: string;
  category: string;
  qty: number;
  costPrice: number;
  issue: string;
};

export default function WarehousePage() {
  const [items, setItems] = useState<DamagedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Softlens Warna");
  const [qty, setQty] = useState("1");
  const [costPrice, setCostPrice] = useState("");
  const [issue, setIssue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDamagedGoods = async () => {
    setLoading(true);
    try {
      const rows = unwrap(await scopeBranch(
        supabase.from("damaged_goods").select(`
          id, code, name, category, qty, unit_cost, issue_description,
          product:products(name)
        `).eq("status", "PENDING") as any
      ).order("created_at", { ascending: false }) as any);

      const mapped: DamagedProduct[] = ((rows as any[]) || []).map((d: any) => ({
        id: d.id,
        code: d.code || "BRG-RUSAK",
        name: d.name || d.product?.name || "Barang Rusak",
        category: d.category || "Lain-lain",
        qty: Number(d.qty) || 0,
        costPrice: Number(d.unit_cost) || 0,
        issue: d.issue_description || "Kerusakan fisik",
      }));
      setItems(mapped);
    } catch (err) {
      alert(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDamagedGoods();
  }, []);

  const totalPcs = items.reduce((acc, curr) => acc + curr.qty, 0);
  const totalModal = items.reduce((acc, curr) => acc + curr.qty * curr.costPrice, 0);

  const handleOpenAdd = () => {
    setCode("");
    setName("");
    setCategory("Softlens Warna");
    setQty("1");
    setCostPrice("");
    setIssue("");
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setIsSubmitting(true);
    try {
      const parsedQty = parseInt(qty) || 1;
      const parsedCost = parseFloat(costPrice) || 0;

      // Cari product
      const { data: prod } = await scopeBranch(
        supabase.from("products").select("id, stock_global").or(`product_code.eq.${code.trim()},name.ilike.%${name.trim()}%`)
      ).limit(1).maybeSingle();

      unwrap(await supabase.from("damaged_goods").insert(withBranch({
        product_id: prod?.id || null,
        code: code.trim(),
        name: name.trim(),
        category: category,
        qty: parsedQty,
        unit_cost: parsedCost,
        issue_description: issue.trim(),
        status: "PENDING",
      })));

      // If product exists, reduce global stock and log movement
      if (prod?.id) {
        const qtyAfter = Math.max(0, (prod.stock_global || 0) - parsedQty);
        unwrap(await supabase.from("products").update({ stock_global: qtyAfter }).eq("id", prod.id));
        
        const activeProfile = JSON.parse(localStorage.getItem('activeProfile') || '{}');
        unwrap(await supabase.from('stock_movements').insert(withBranch({
          product_id: prod.id, 
          movement_type: 'OUT', 
          qty_change: -parsedQty, 
          qty_after: qtyAfter,
          reference_table: 'damaged_goods', 
          notes: `Masuk gudang bermasalah: ${issue.trim()}`, 
          created_by: activeProfile?.id,
        })));
      }

      setIsModalOpen(false);
      fetchDamagedGoods();
    } catch (err: any) {
      alert(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (id: string, actionName: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (confirm(`Ajukan aksi "${actionName}" ke Owner untuk barang ini?`)) {
      try {
        const activeProfile = JSON.parse(localStorage.getItem('activeProfile') || '{}');
        
        unwrap(await supabase.from("damaged_goods").update({
          status: "WAITING_APPROVAL",
        }).eq("id", id));

        unwrap(await supabase.from("approvals").insert(withBranch({
          category: 'DAMAGED_WRITE_OFF',
          title: `Pengajuan ${actionName}: ${item.name}`,
          requester_id: activeProfile?.id || null,
          details: {
             damaged_goods_id: id,
             action_name: actionName,
             qty: item.qty,
             cost_price: item.costPrice,
             issue: item.issue
          }
        })));

        fetchDamagedGoods();
        alert("Pengajuan berhasil dikirim ke Pusat Approval Owner.");
      } catch (err) {
        alert(friendlyError(err));
      }
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Produk Gudang Barang Bermasalah</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Status dan tempat untuk barang rusak, retur, expired, dll yang menunggu keputusan.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchDamagedGoods}
            variant="outline"
            className="border-gray-200 dark:border-gray-800"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button 
            onClick={handleOpenAdd}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Catat Barang Bermasalah
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-xl border-gray-200 dark:border-gray-800 shadow-sm border p-6 flex items-center gap-4 bg-white dark:bg-[#13151a]">
          <div className="w-14 h-14 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-semibold text-2xl">
            {totalPcs}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pcs di Gudang</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Menunggu Keputusan Owner</p>
          </div>
        </Card>

        <Card className="rounded-xl border-gray-200 dark:border-gray-800 shadow-sm border p-6 flex items-center gap-4 bg-white dark:bg-[#13151a]">
          <div className="w-14 h-14 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center font-semibold text-xl">
            Rp
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nilai Modal Tertahan</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Rp {totalModal.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-1">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/50">
          <div className="relative max-w-md">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode atau nama barang bermasalah..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-white dark:bg-[#13151a] hover:bg-white dark:bg-[#13151a] border-b-0 border-t border-gray-100 dark:border-gray-800/50">
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6">Kode</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6">Nama Barang & Masalah</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Kategori</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Qty Gudang</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-right">Nilai Modal (Total)</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Aksi Keputusan Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-500 dark:text-gray-400 font-medium border-b-0">
                  Tidak ada barang bermasalah di Gudang.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329]/50">
                  <TableCell className="px-6 py-4 font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{item.code}</TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{item.name}</p>
                    <p className="text-xs text-red-500 font-medium mt-0.5">{item.issue}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span className="bg-gray-100 dark:bg-[#2a303c] text-gray-600 dark:text-gray-400 text-xs font-bold px-2.5 py-1 rounded-md">
                      {item.category}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.qty} pcs</TableCell>
                  <TableCell className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    Rp {(item.qty * item.costPrice).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleResolve(item.id, "Klaim Retur Pabrik")}
                        className="bg-blue-600 hover:bg-slate-800 text-white font-bold text-xs h-7 px-2.5 rounded-lg"
                      >
                        Klaim Pabrik
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(item.id, "Pemusnahan Barang")}
                        className="border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs h-7 px-2.5 rounded-lg"
                      >
                        Pemusnahan
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Catat Barang Bermasalah */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Catat Barang Bermasalah ke Gudang</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Kode Barang</label>
              <input
                type="text"
                placeholder="Contoh: SFT-GR-050"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Produk</label>
              <input
                type="text"
                placeholder="Contoh: Softlens Gray Minus -0.50"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Harga Modal / Pcs</label>
                <input
                  type="number"
                  placeholder="28000"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Detail Kerusakan / Masalah</label>
              <input
                type="text"
                placeholder="Contoh: Kemasan blister sobek saat proses ekspedisi"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                {isSubmitting ? "Menyimpan..." : "Simpan ke Gudang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
