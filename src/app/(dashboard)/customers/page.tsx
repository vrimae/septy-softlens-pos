"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Customer = {
  id: string;
  name: string;
  phone: string;
  customer_level: string;
  points: number;
  created_at: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Field
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerLevel, setCustomerLevel] = useState("REGULER");
  const [points, setPoints] = useState("0");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setCustomerLevel("REGULER");
    setPoints("0");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone || "");
    setCustomerLevel(c.customer_level || "REGULER");
    setPoints((c.points || 0).toString());
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pelanggan ini?")) return;
    try {
      await supabase.from('customers').delete().eq('id', id);
      fetchCustomers();
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    
    try {
      const payload = {
        name,
        phone,
        customer_level: customerLevel,
        points: parseInt(points) || 0
      };

      if (editingId) {
        await supabase.from('customers').update(payload).eq('id', editingId);
      } else {
        await supabase.from('customers').insert(payload);
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      alert("Gagal menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Database Pelanggan</h1>
          <p className="text-gray-500 mt-1">Kelola data member dan reward poin loyalitas.</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-[#1c5ffb] hover:bg-blue-700 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
          <Plus className="h-4 w-4 mr-2" /> Daftarkan Member Baru
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Nama Member</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Level</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Nomor WhatsApp</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Total Poin</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Memuat...</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-16 text-gray-500">Belum ada data member terdaftar.</TableCell></TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id} className="border-b border-gray-50">
                  <TableCell className="px-6 font-bold text-gray-900 py-4">{c.name}</TableCell>
                  <TableCell className="px-6 text-center py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      c.customer_level === 'VIP' ? 'bg-purple-100 text-purple-700' : 
                      c.customer_level === 'GOLD' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.customer_level}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 text-center text-gray-600 py-4">{c.phone || '-'}</TableCell>
                  <TableCell className="px-6 text-center font-bold text-blue-600 py-4">{c.points}</TableCell>
                  <TableCell className="px-6 text-right py-4 space-x-2">
                    <button onClick={() => handleOpenEdit(c)} className="text-blue-500 hover:text-blue-700"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Pelanggan' : 'Pelanggan Baru'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">No. WhatsApp</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Level</label>
                <select value={customerLevel} onChange={e => setCustomerLevel(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="REGULER">Reguler</option>
                  <option value="GOLD">Gold</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Poin Loyalitas</label>
                <input type="number" value={points} onChange={e => setPoints(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
