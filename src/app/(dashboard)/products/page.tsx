"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, UploadCloud, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Product = {
  id: string;
  product_code: string;
  name: string;
  category_id: string | null;
  cost_price: number;
  price_regular: number;
  price_gold: number;
  price_vip: number;
  stock_global: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [productCode, setProductCode] = useState("");
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [priceRegular, setPriceRegular] = useState("0");
  const [priceGold, setPriceGold] = useState("0");
  const [priceVip, setPriceVip] = useState("0");
  const [stock, setStock] = useState("0");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching:", error);
        return;
      }
      if (data) setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setProductCode("");
    setName("");
    setCostPrice("0");
    setPriceRegular("0");
    setPriceGold("0");
    setPriceVip("0");
    setStock("0");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingId(p.id);
    setProductCode(p.product_code || "");
    setName(p.name);
    setCostPrice((p.cost_price || 0).toString());
    setPriceRegular((p.price_regular || 0).toString());
    setPriceGold((p.price_gold || 0).toString());
    setPriceVip((p.price_vip || 0).toString());
    setStock((p.stock_global || 0).toString());
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus barang ini?")) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !productCode.trim()) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        product_code: productCode,
        name,
        cost_price: parseFloat(costPrice) || 0,
        price_regular: parseFloat(priceRegular) || 0,
        price_gold: parseFloat(priceGold) || 0,
        price_vip: parseFloat(priceVip) || 0,
        stock_global: parseInt(stock) || 0,
      };

      if (editingId) {
        await supabase.from('products').update(payload).eq('id', editingId);
      } else {
        await supabase.from('products').insert(payload);
      }
      
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Master Barang</h1>
          <p className="text-gray-500 mt-1">Kelola data stok dan harga produk softlens.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleOpenAddModal} className="bg-[#00a84e] hover:bg-green-600 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
            <Plus className="h-4 w-4 mr-2" /> Tambah Produk Baru
          </Button>
          <Button className="bg-[#2662fa] hover:bg-blue-700 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
            <UploadCloud className="h-4 w-4 mr-2" /> Upload Excel
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <input 
              type="text"
              placeholder="Cari nama barang atau kode..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0">
              <TableHead className="font-bold text-gray-600 py-4 px-6">Kode</TableHead>
              <TableHead className="font-bold text-gray-600 py-4 px-6">Nama Produk</TableHead>
              <TableHead className="font-bold text-gray-600 py-4 px-6">Harga (Reguler/Gold/VIP)</TableHead>
              <TableHead className="font-bold text-gray-600 py-4 px-6 text-right">Stok</TableHead>
              <TableHead className="font-bold text-gray-600 py-4 px-6 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Memuat...</TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-16 text-gray-500">Belum ada data barang.</TableCell></TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="px-6 font-bold text-gray-700">{p.product_code}</TableCell>
                  <TableCell className="px-6 font-bold text-gray-900">{p.name}</TableCell>
                  <TableCell className="px-6">
                    <div className="text-xs space-y-1">
                      <div>R: <span className="font-semibold text-gray-900">Rp {p.price_regular.toLocaleString()}</span></div>
                      <div>G: <span className="font-semibold text-gray-900">Rp {p.price_gold.toLocaleString()}</span></div>
                      <div>V: <span className="font-semibold text-gray-900">Rp {p.price_vip.toLocaleString()}</span></div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 text-right font-black text-gray-900">{p.stock_global}</TableCell>
                  <TableCell className="px-6 text-center space-x-2">
                    <button onClick={() => handleOpenEditModal(p)} className="text-[#1c5ffb] hover:bg-blue-50 p-2 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Kode Barang</label>
                <input required type="text" value={productCode} onChange={(e) => setProductCode(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Stok Awal</label>
                <input required type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nama Barang</label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Harga Pokok (HPP) / Modal</label>
              <input required type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga Reguler</label>
                <input required type="number" value={priceRegular} onChange={(e) => setPriceRegular(e.target.value)} className="w-full px-3 py-2 border rounded-lg border-blue-200" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga Gold</label>
                <input required type="number" value={priceGold} onChange={(e) => setPriceGold(e.target.value)} className="w-full px-3 py-2 border rounded-lg border-yellow-200" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga VIP</label>
                <input required type="number" value={priceVip} onChange={(e) => setPriceVip(e.target.value)} className="w-full px-3 py-2 border rounded-lg border-purple-200" />
              </div>
            </div>
            
            <DialogFooter className="pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-[#1c5ffb] hover:bg-blue-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Barang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
