"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  onSuccess: () => void;
};

export function ProductFormDialog({ isOpen, onClose, product, onSuccess }: ProductFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    type: "",
    color: "",
    sku: "",
    sell_price: 0,
    cost_price: 0,
    is_active: true
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        brand: product.brand || "",
        type: product.type || "",
        color: product.color || "",
        sku: product.sku || "",
        sell_price: product.sell_price || 0,
        cost_price: product.cost_price || 0,
        is_active: product.is_active ?? true
      });
    } else {
      setFormData({
        name: "", brand: "", type: "", color: "", sku: "", sell_price: 0, cost_price: 0, is_active: true
      });
    }
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (product?.id) {
        // Update
        const { error } = await supabase.from("products").update(formData).eq("id", product.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from("products").insert([formData]);
        if (error) throw error;
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{product ? "Ubah Produk" : "Tambah Produk"}</DialogTitle>
            <DialogDescription>
              Isi detail produk softlens.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Produk *</Label>
                <Input id="name" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU/Kode</Label>
                <Input id="sku" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Merek</Label>
                <Input id="brand" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipe</Label>
                <Input id="type" placeholder="Color/Clear" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Warna</Label>
                <Input id="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Harga Beli</Label>
                <Input id="cost_price" type="number" required value={formData.cost_price} onChange={(e) => setFormData({...formData, cost_price: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sell_price">Harga Jual *</Label>
                <Input id="sell_price" type="number" required value={formData.sell_price} onChange={(e) => setFormData({...formData, sell_price: Number(e.target.value)})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Batal</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
