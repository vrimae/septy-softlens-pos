"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Check, Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Reward = {
  id: string;
  name: string;
  points: number;
};

export default function RewardsPage() {
  const [pointMultiple, setPointMultiple] = useState("10000");
  const [pointExpiry, setPointExpiry] = useState("12");
  const [rewards, setRewards] = useState<Reward[]>([
    { id: "1", name: "Cairan Pembersih Softlens 60ml", points: 50 },
    { id: "2", name: "Kotak Softlens Karakter Lucu", points: 25 },
    { id: "3", name: "Voucher Diskon Rp 25.000", points: 100 },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rewardName, setRewardName] = useState("");
  const [pointsRequired, setPointsRequired] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCreateReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardName.trim() || !pointsRequired) return;

    const newRew: Reward = {
      id: Date.now().toString(),
      name: rewardName.trim(),
      points: parseInt(pointsRequired) || 0,
    };

    setRewards([...rewards, newRew]);
    setRewardName("");
    setPointsRequired("");
    setIsModalOpen(false);
  };

  const handleDeleteReward = (id: string) => {
    if (confirm("Hapus reward ini?")) {
      setRewards(rewards.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Master Reward & Poin</h1>
        <p className="text-gray-500 mt-1">Kelola hadiah dan konfigurasi poin transaksi.</p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" /> Pengaturan poin transaksi berhasil disimpan!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Konfigurasi */}
        <Card className="rounded-3xl border-gray-200 shadow-sm overflow-hidden border">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Konfigurasi Poin Transaksi</h2>
          </div>
          <CardContent className="p-6 space-y-6">
            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Setiap Transaksi Kelipatan Rp</label>
                <input 
                  type="number" 
                  value={pointMultiple}
                  onChange={(e) => setPointMultiple(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1c5ffb] focus:ring-1 focus:ring-[#1c5ffb] font-bold"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Sistem akan memberi 1 Poin setiap kelipatan nominal di atas.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Umur Poin (Bulan)</label>
                <input 
                  type="number" 
                  value={pointExpiry}
                  onChange={(e) => setPointExpiry(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1c5ffb] focus:ring-1 focus:ring-[#1c5ffb] font-bold"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Poin akan hangus secara bertahap jika melewati umur ini sejak tanggal perolehan.
                </p>
              </div>

              <Button type="submit" className="w-full bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold rounded-xl h-12 shadow-sm">
                Simpan Pengaturan
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Daftar Reward */}
        <Card className="rounded-3xl border-gray-200 shadow-sm overflow-hidden border">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Daftar Reward / Hadiah</h2>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#00a84e] hover:bg-green-600 text-white rounded-xl px-4 font-semibold shadow-sm h-10 text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Reward
            </Button>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-100">
                  <TableHead className="font-bold text-gray-700 py-3.5 px-6">Nama Reward</TableHead>
                  <TableHead className="font-bold text-gray-700 py-3.5 px-6 text-center">Poin Dibutuhkan</TableHead>
                  <TableHead className="font-bold text-gray-700 py-3.5 px-6 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-16 text-gray-500 font-medium border-b-0">
                      Belum ada reward terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  rewards.map((r) => (
                    <TableRow key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <TableCell className="px-6 py-4 font-bold text-gray-900 text-sm">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-pink-500" />
                          <span>{r.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center font-black text-blue-600 text-sm">
                        {r.points} Poin
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteReward(r.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 transition-colors"
                          title="Hapus Reward"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal Tambah Reward */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Tambah Hadiah / Reward Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateReward} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Hadiah</label>
              <input
                type="text"
                placeholder="Contoh: Dompet Softlens Travel"
                value={rewardName}
                onChange={(e) => setRewardName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Poin yang Dibutuhkan</label>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 30"
                value={pointsRequired}
                onChange={(e) => setPointsRequired(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                required
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-[#00a84e] hover:bg-green-600 text-white font-bold">
                Simpan Reward
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
