"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { unwrap, scopeBranch, withBranch, friendlyError } from "@/lib/supabase/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Promo = {
  id: string;
  name: string;
  type: string;
  target: string;
  period: string;
  status: "AKTIF" | "BERAKHIR";
};

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([
    {
      id: "1",
      name: "Promo Opening Diskon 15%",
      type: "Persentase (%)",
      target: "Semua Softlens",
      period: "01 Okt - 31 Okt 2026",
      status: "AKTIF",
    },
    {
      id: "2",
      name: "Beli 2 Gratis Cairan Pembersih",
      type: "Buy X Get Y",
      target: "Softlens VIP",
      period: "Selamanya",
      status: "AKTIF",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("PERCENT");
  const [target, setTarget] = useState("Semua Softlens");
  const [period, setPeriod] = useState("30 Hari Kedepan");

  const fetchPromos = async () => {
    try {
      const rows = unwrap(await scopeBranch(
        supabase.from("promos").select("*").order("created_at", { ascending: false })
      ));
      const mapped: Promo[] = (rows || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.promo_type === "PERCENT" ? "Persentase (%)" :
              r.promo_type === "FLAT" ? "Nominal Potongan (Rp)" :
              r.promo_type === "BUY_X_GET_Y" ? "Beli X Gratis Y" :
              r.promo_type === "GROSIR" ? "Harga Grosir" : r.promo_type,
        target: r.target || "Semua Barang",
        period: r.period || "Selamanya",
        status: r.status || "AKTIF",
      }));
      setPromos(mapped);
    } catch (err) {
      alert(friendlyError(err));
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleOpenAdd = () => {
    setName("");
    setType("PERCENT");
    setTarget("Semua Softlens");
    setPeriod("30 Hari Kedepan");
    setIsModalOpen(true);
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      unwrap(await supabase.from("promos").insert(withBranch({
        name: name.trim(),
        promo_type: type,
        target: target,
        period: period,
        status: "AKTIF",
        is_active: true
      })));
      setIsModalOpen(false);
      fetchPromos();
    } catch (err) {
      alert(friendlyError(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus promo ini?")) {
      try {
        unwrap(await supabase.from("promos").delete().eq("id", id));
        fetchPromos();
      } catch (err) {
        alert(friendlyError(err));
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Master Promo</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola daftar promo diskon, harga khusus, dan Beli X Gratis Y.</p>
        </div>
        <Button 
          onClick={handleOpenAdd}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Tambah Promo
        </Button>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white dark:bg-[#13151a] hover:bg-white dark:bg-[#13151a] border-b border-gray-100 dark:border-gray-800/50">
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6">Status</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Nama Promo</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Jenis</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Target</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Periode</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-500 dark:text-gray-400 font-medium">
                  Belum ada promo yang ditambahkan.
                </TableCell>
              </TableRow>
            ) : (
              promos.map((p) => (
                <TableRow key={p.id} className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329]/50">
                  <TableCell className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full">
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-bold text-gray-900 dark:text-gray-100 text-sm">
                    {p.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {p.type}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-xs text-slate-900 dark:text-slate-100 font-bold">
                    {p.target}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {p.period}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 transition-colors"
                      title="Hapus Promo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Tambah Promo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Tambah Promo Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePromo} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Promo</label>
              <input
                type="text"
                placeholder="Contoh: Diskon Pelanggan Baru 10%"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Jenis Promo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="PERCENT">Diskon Persentase (%)</option>
                <option value="FLAT">Nominal Potongan (Rp)</option>
                <option value="BUY_X_GET_Y">Beli X Gratis Y</option>
                <option value="GROSIR">Harga Khusus Grosir</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Target Produk</label>
              <input
                type="text"
                placeholder="Contoh: Semua Produk / Kategori Minus"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Periode Berlaku</label>
              <input
                type="text"
                placeholder="Contoh: Selama Bulan Ini"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
                Simpan Promo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
