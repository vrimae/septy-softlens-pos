"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { unwrap, scopeBranch, withBranch, friendlyError } from "@/lib/supabase/db";
import { auditService } from "@/lib/services/audit.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";
import useSWR from "swr";

type Customer = {
  id: string;
  name: string;
  phone: string;
  customer_level: string;
  points: number;
  created_at: string;
};

export default function CustomersPage() {
  const { role } = useAuth();
  const isOwner = role === "owner";

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Field
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerLevel, setCustomerLevel] = useState("REGULER");
  const [points, setPoints] = useState("0");

  const { data: customers = [], mutate, isValidating } = useSWR('customers_list', async () => {
    return (unwrap(await scopeBranch(
      supabase.from('customers').select('*').is('deleted_at', null)
    ).order('created_at', { ascending: false })) as Customer[]) || [];
  });
  const loading = !customers.length && isValidating;

  const fetchCustomers = async () => {
    await mutate();
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
      unwrap(await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id));
      auditService.log("HAPUS_PELANGGAN", { tableName: "customers", recordId: id });
      fetchCustomers();
    } catch (err) {
      alert(friendlyError(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    try {
      // Member baru otomatis menjadi Reguler. Perubahan level member hanya bisa dilakukan oleh Owner.
      const resolvedLevel = !editingId ? "REGULER" : (isOwner ? customerLevel : (customers.find(c => c.id === editingId)?.customer_level || "REGULER"));

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        customer_level: resolvedLevel,
        points: Math.max(0, parseInt(points) || 0)
      };

      if (editingId) {
        unwrap(await supabase.from('customers').update(payload).eq('id', editingId));
        auditService.log("UBAH_PELANGGAN", { tableName: "customers", recordId: editingId, after: payload });
      } else {
        const created = unwrap(await supabase.from('customers').insert(withBranch(payload)).select('id').single());
        if (created?.id) auditService.log("TAMBAH_PELANGGAN", { tableName: "customers", recordId: created.id, after: payload });
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Database Pelanggan</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola data member dan reward poin loyalitas.</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm h-11">
          <Plus className="h-4 w-4 mr-2" /> Daftarkan Member Baru
        </Button>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white dark:bg-[#13151a] hover:bg-white dark:bg-[#13151a] border-b border-gray-100 dark:border-gray-800/50">
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6">Nama Member</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Level</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Nomor WhatsApp</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-center">Total Poin</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-4 px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Memuat...</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-16 text-gray-500 dark:text-gray-400">Belum ada data member terdaftar.</TableCell></TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id} className="border-b border-gray-50">
                  <TableCell className="px-6 font-bold text-gray-900 dark:text-gray-100 py-4">{c.name}</TableCell>
                  <TableCell className="px-6 text-center py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      c.customer_level === 'VIP' ? 'bg-purple-100 text-purple-700' : 
                      c.customer_level === 'GOLD' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 dark:bg-[#2a303c] text-gray-600 dark:text-gray-400'
                    }`}>
                      {c.customer_level}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 text-center text-gray-600 dark:text-gray-400 py-4">{c.phone || '-'}</TableCell>
                  <TableCell className="px-6 text-center font-bold text-slate-900 dark:text-slate-100 py-4">{c.points}</TableCell>
                  <TableCell className="px-6 text-right py-4 space-x-2">
                    <button onClick={() => handleOpenEdit(c)} className="text-slate-600 hover:text-slate-700"><Edit2 className="h-4 w-4" /></button>
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
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">No. WhatsApp</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Level Member {!isOwner && <span className="text-[11px] text-amber-600 font-normal">(Khusus Owner)</span>}
                </label>
                {!editingId ? (
                  <div>
                    <input
                      disabled
                      type="text"
                      value="REGULER (Otomatis Member Baru)"
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Member baru otomatis terdaftar sebagai Reguler.</p>
                  </div>
                ) : isOwner ? (
                  <select
                    value={customerLevel}
                    onChange={e => setCustomerLevel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-semibold"
                  >
                    <option value="REGULER">Reguler</option>
                    <option value="GOLD">Gold (Harga Reseller/Grosir)</option>
                    <option value="VIP">VIP (Harga Khusus)</option>
                  </select>
                ) : (
                  <div>
                    <input
                      disabled
                      type="text"
                      value={customerLevel}
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold text-xs"
                    />
                    <p className="text-[11px] text-amber-600 font-medium mt-1">Perubahan level member hanya dapat dilakukan oleh Owner.</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Poin Loyalitas</label>
                <input type="number" value={points} onChange={e => setPoints(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300">
              ℹ️ Membership Septy Softlens tidak memiliki masa berlaku (Aktif Permanen).
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-slate-800 text-white" disabled={isSubmitting}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
