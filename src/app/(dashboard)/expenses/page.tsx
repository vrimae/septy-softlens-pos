"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type Expense = {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    description: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
    if (!error && data) setExpenses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from("expenses").insert([formData]);
      if (error) throw error;
      setIsFormOpen(false);
      setFormData({ category: "", amount: 0, expense_date: new Date().toISOString().split('T')[0], description: "" });
      fetchExpenses();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pengeluaran</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pencatatan biaya operasional toko.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" /> Tambah Pengeluaran
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Jumlah (Rp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Memuat...</TableCell></TableRow>
              ) : expenses.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-gray-500 dark:text-gray-400">Tidak ada data</TableCell></TableRow>
              ) : (
                expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{format(new Date(e.expense_date), "dd MMM yyyy", { locale: id })}</TableCell>
                    <TableCell className="font-medium">{e.category}</TableCell>
                    <TableCell>{e.description || "-"}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {e.amount.toLocaleString("id-ID")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Tambah Pengeluaran</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal</Label>
                <Input id="date" type="date" required value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori (Contoh: Listrik, Gaji, ATK)</Label>
                <Input id="category" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input id="amount" type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Keterangan</Label>
                <Input id="desc" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-teal-600" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
