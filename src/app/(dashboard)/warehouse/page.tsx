"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
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
  const [items, setItems] = useState<DamagedProduct[]>([
    {
      id: "1",
      code: "SFT-GR-050",
      name: "Softlens Gray Minus -0.50 (Kemasan Robek)",
      category: "Softlens Warna",
      qty: 3,
      costPrice: 28000,
      issue: "Kemasan blister bocor saat ekspedisi",
    },
    {
      id: "2",
      code: "CLN-60ML",
      name: "Cairan Pembersih 60ml (Expired 1 Bulan)",
      category: "Aksesoris",
      qty: 5,
      costPrice: 12000,
      issue: "Melewati tanggal kedaluwarsa",
    },
  ]);

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Softlens Warna");
  const [qty, setQty] = useState("1");
  const [costPrice, setCostPrice] = useState("");
  const [issue, setIssue] = useState("");

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const newItem: DamagedProduct = {
      id: Date.now().toString(),
      code: code.trim(),
      name: name.trim(),
      category,
      qty: parseInt(qty) || 1,
      costPrice: parseFloat(costPrice) || 0,
      issue: issue.trim() || "Kerusakan fisik",
    };

    setItems([...items, newItem]);
    setIsModalOpen(false);
  };

  const handleResolve = (id: string, actionName: string) => {
    if (confirm(`Apakah Anda yakin ingin memproses aksi "${actionName}" untuk barang ini?`)) {
      setItems(items.filter((item) => item.id !== id));
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Produk Gudang Barang Bermasalah</h1>
          <p className="text-gray-500 mt-1">Status dan tempat untuk barang rusak, retur, expired, dll yang menunggu keputusan.</p>
        </div>
        <Button 
          onClick={handleOpenAdd}
          className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 font-semibold shadow-sm h-11 flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Catat Barang Bermasalah
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-gray-200 shadow-sm border p-6 flex items-center gap-4 bg-white">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center font-black text-2xl">
            {totalPcs}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pcs di Gudang</p>
            <p className="text-2xl font-black text-gray-900">Menunggu Keputusan Owner</p>
          </div>
        </Card>

        <Card className="rounded-3xl border-gray-200 shadow-sm border p-6 flex items-center gap-4 bg-white">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center font-black text-xl">
            Rp
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nilai Modal Tertahan</p>
            <p className="text-2xl font-black text-gray-900">Rp {totalModal.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden p-1">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode atau nama barang bermasalah..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Kode</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6">Nama Barang & Masalah</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Kategori</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Qty Gudang</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Nilai Modal (Total)</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Aksi Keputusan Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-500 font-medium border-b-0">
                  Tidak ada barang bermasalah di Gudang.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4 font-mono font-bold text-xs text-blue-600">{item.code}</TableCell>
                  <TableCell className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-red-500 font-medium mt-0.5">{item.issue}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md">
                      {item.category}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-black text-gray-900 text-sm">{item.qty} pcs</TableCell>
                  <TableCell className="px-6 py-4 text-right font-black text-gray-900 text-sm">
                    Rp {(item.qty * item.costPrice).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleResolve(item.id, "Klaim Retur Pabrik")}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg"
                      >
                        Klaim Pabrik
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(item.id, "Pemusnahan Barang")}
                        className="border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs h-7 px-2.5 rounded-lg"
                      >
                        Musnahkan
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
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Catat Barang Bermasalah / Rusak</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kode Barang</label>
                <input
                  type="text"
                  placeholder="Contoh: SFT-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Jumlah (Pcs)</label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Barang</label>
              <input
                type="text"
                placeholder="Nama produk softlens..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="Softlens Warna">Softlens Warna</option>
                  <option value="Softlens Bening">Softlens Bening</option>
                  <option value="Aksesoris & Cairan">Aksesoris & Cairan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">HPP / Modal Satuan (Rp)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="25000"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan Masalah / Kerusakan</label>
              <input
                type="text"
                placeholder="Contoh: Kemasan sobek / segel rusak"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Simpan ke Gudang
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
