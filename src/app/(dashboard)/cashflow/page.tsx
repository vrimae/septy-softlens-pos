"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type CashRegister = {
  id: string;
  name: string;
  balance: number;
};

type CashFlow = {
  id: string;
  flow_type: string;
  category: string;
  description: string;
  amount: number;
  created_at: string;
  cash_registers: { name: string };
};

export default function CashflowPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [flows, setFlows] = useState<CashFlow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form
  const [registerName, setRegisterName] = useState("");

  // Flow Form
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [flowType, setFlowType] = useState("IN");
  const [flowCategory, setFlowCategory] = useState("PENJUALAN");
  const [flowAmount, setFlowAmount] = useState("");
  const [flowDescription, setFlowDescription] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regRes, flowRes] = await Promise.all([
        supabase.from('cash_registers').select('*').order('created_at'),
        supabase.from('cash_flows').select('*, cash_registers(name)').order('created_at', { ascending: false })
      ]);
      if (regRes.data) setRegisters(regRes.data);
      if (flowRes.data) setFlows(flowRes.data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim()) return;
    setIsSubmitting(true);
    try {
      await supabase.from('cash_registers').insert({ name: registerName, balance: 0 });
      setIsRegisterModalOpen(false);
      setRegisterName("");
      fetchData();
    } catch (err) {
      alert("Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegisterId || !flowAmount) return;
    setIsSubmitting(true);
    try {
      const amount = parseFloat(flowAmount);
      
      // 1. Insert flow
      const { error } = await supabase.from('cash_flows').insert({
        register_id: selectedRegisterId,
        flow_type: flowType,
        category: flowCategory,
        amount,
        description: flowDescription
      });
      if (error) throw error;

      // 2. Update balance directly 
      // Fetch current balance
      const currentReg = registers.find(r => r.id === selectedRegisterId);
      if (currentReg) {
        const newBalance = flowType === 'IN' ? currentReg.balance + amount : currentReg.balance - amount;
        await supabase.from('cash_registers').update({ balance: newBalance }).eq('id', selectedRegisterId);
      }

      setIsFlowModalOpen(false);
      setFlowAmount("");
      setFlowDescription("");
      fetchData();
    } catch (err) {
      alert("Gagal mencatat arus kas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRegister = async (id: string) => {
    if (!confirm("Hapus kantong kas ini? Semua riwayat yang terkait mungkin hilang atau memunculkan error.")) return;
    try {
      await supabase.from('cash_registers').delete().eq('id', id);
      fetchData();
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Buku Kas & Kantong Kas</h1>
          <p className="text-gray-500 mt-1">Pantau pergerakan uang antar rekening dan laci kasir.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsRegisterModalOpen(true)} variant="outline" className="bg-white hover:bg-gray-50 font-semibold shadow-sm h-11 px-5 border-gray-200">
            + Kantong Baru
          </Button>
          <Button onClick={() => setIsFlowModalOpen(true)} className="bg-[#9333ea] hover:bg-purple-700 text-white font-semibold shadow-sm h-11 px-5">
            + Catat Arus Kas
          </Button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-2">
        {registers.length === 0 && !loading && (
          <div className="text-gray-400 py-10 w-full text-center border-2 border-dashed border-gray-200 rounded-2xl">
            Belum ada kantong kas. Buat kantong baru terlebih dahulu.
          </div>
        )}
        
        {registers.map(reg => (
          <Card key={reg.id} className="min-w-[300px] rounded-2xl border border-green-200 shadow-sm overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-900">{reg.name}</h3>
                <button onClick={() => handleDeleteRegister(reg.id)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="text-3xl font-black text-gray-900 mb-6">Rp {reg.balance.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Histori Transaksi Kas</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Waktu</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Kantong Kas</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Kategori</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Keterangan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Nominal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Memuat...</TableCell></TableRow>
            ) : flows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-16 text-gray-500 font-medium border-b-0">Belum ada catatan arus kas.</TableCell></TableRow>
            ) : (
              flows.map(f => (
                <TableRow key={f.id} className="border-b border-gray-50">
                  <TableCell className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(f.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-bold text-gray-700">{f.cash_registers?.name || '-'}</TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">{f.category}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-gray-600">{f.description}</TableCell>
                  <TableCell className={`px-6 py-4 text-right font-black ${f.flow_type === 'IN' ? 'text-green-500' : 'text-red-500'}`}>
                    {f.flow_type === 'IN' ? '+' : '-'} Rp {f.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Kantong Baru */}
      <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Kantong Kas Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRegister} className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nama Kantong Kas</label>
              <input required type="text" placeholder="Cth: Laci Kasir 1" value={registerName} onChange={e => setRegisterName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRegisterModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-blue-600 text-white" disabled={isSubmitting}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Catat Arus Kas */}
      <Dialog open={isFlowModalOpen} onOpenChange={setIsFlowModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Catat Arus Kas Manual</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateFlow} className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Kantong Kas</label>
              <select required value={selectedRegisterId} onChange={e => setSelectedRegisterId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">-- Pilih --</option>
                {registers.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Saldo: Rp {r.balance.toLocaleString()})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Jenis</label>
                <select value={flowType} onChange={e => setFlowType(e.target.value)} className="w-full px-3 py-2 border rounded-lg font-bold">
                  <option value="IN">Uang Masuk (+)</option>
                  <option value="OUT">Uang Keluar (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Kategori</label>
                <input required type="text" value={flowCategory} onChange={e => setFlowCategory(e.target.value)} placeholder="Cth: BIAYA LISTRIK" className="w-full px-3 py-2 border rounded-lg uppercase" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nominal (Rp)</label>
              <input required type="number" min="1" value={flowAmount} onChange={e => setFlowAmount(e.target.value)} className="w-full px-3 py-2 border rounded-lg font-black text-lg text-blue-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Keterangan Tambahan</label>
              <input required type="text" value={flowDescription} onChange={e => setFlowDescription(e.target.value)} placeholder="Cth: Beli pulsa listrik bulan agustus" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFlowModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-[#9333ea] text-white hover:bg-purple-700" disabled={isSubmitting}>Simpan Arus Kas</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
