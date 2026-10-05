"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

type Category = {
  id: string;
  name: string;
  target_margin: number;
  use_expired: boolean;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [targetMargin, setTargetMargin] = useState("0");
  const [useExpired, setUseExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        // Fallback for when table doesn't exist yet, we don't want to crash the UI
        console.error("Error fetching categories:", error);
        return;
      }
      
      if (data) {
        // Map to our UI type (assuming target_margin and use_expired are added to schema later, 
        // or we just use defaults for now if they don't exist in the basic schema)
        const mappedData = data.map(item => ({
          id: item.id,
          name: item.name,
          target_margin: item.target_margin || 0,
          use_expired: item.use_expired || false,
        }));
        setCategories(mappedData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName("");
    setTargetMargin("0");
    setUseExpired(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setTargetMargin(cat.target_margin.toString());
    setUseExpired(cat.use_expired);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kategori ini?")) return;
    
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (err) {
      console.error("Failed to delete", err);
      alert("Gagal menghapus data. Kategori ini mungkin sedang digunakan oleh Master Barang.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        name,
        target_margin: parseFloat(targetMargin) || 0,
        use_expired: useExpired
      };
      
      if (editingId) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manajemen Kategori</h1>
          <p className="text-gray-500 mt-1">Atur kategori barang dan target margin profit Anda.</p>
        </div>
        <Button 
          onClick={handleOpenAddModal}
          className="bg-[#1f5ffe] hover:bg-blue-700 text-white rounded-lg px-5 font-semibold shadow-sm h-11"
        >
          <Plus className="h-4 w-4 mr-2" /> Tambah Kategori
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Nama Kategori</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Target Margin Profit (%)</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Gunakan Expired</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16 text-gray-500">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16 text-gray-500">
                  Belum ada kategori.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="font-bold text-gray-900 px-6 py-4">{cat.name}</TableCell>
                  <TableCell className="text-center text-gray-600 px-6 py-4">{cat.target_margin}%</TableCell>
                  <TableCell className="text-center px-6 py-4">
                    {cat.use_expired ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold">YA</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-md text-xs font-bold">TIDAK</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right px-6 py-4">
                    <button 
                      onClick={() => handleOpenEditModal(cat)}
                      className="text-[#1c5ffb] hover:text-blue-700 transition-colors p-2"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id)}
                      className="text-red-500 hover:text-red-700 transition-colors p-2"
                      title="Hapus"
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nama Kategori</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Softlens Minus"
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Target Margin Profit (%)</label>
              <input 
                type="number" 
                value={targetMargin}
                onChange={(e) => setTargetMargin(e.target.value)}
                placeholder="Contoh: 15"
                min="0"
                step="0.1"
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox"
                id="use-expired" 
                checked={useExpired}
                onChange={(e) => setUseExpired(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="use-expired" className="text-sm font-bold text-gray-700 cursor-pointer">
                Lacak Tanggal Kadaluwarsa (Expired Date)
              </label>
            </div>
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="bg-[#1c5ffb] hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Kategori"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
