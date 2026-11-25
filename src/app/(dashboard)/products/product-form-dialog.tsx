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
    price_gold: 0,
    price_vip: 0,
    cost_price: 0,
    is_active: true
  });
  const [isManualGold, setIsManualGold] = useState(false);
  const [isManualVip, setIsManualVip] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        brand: product.brand || "",
        type: product.type || "",
        color: product.color || "",
        sku: product.sku || "",
        sell_price: product.sell_price || product.price_regular || 0,
        price_gold: product.price_gold || 0,
        price_vip: product.price_vip || 0,
        cost_price: product.cost_price || 0,
        is_active: product.is_active ?? true
      });
      setIsManualGold(true);
      setIsManualVip(true);
    } else {
      setFormData({
        name: "", brand: "", type: "", color: "", sku: "", sell_price: 0, price_gold: 0, price_vip: 0, cost_price: 0, is_active: true
      });
      setIsManualGold(false);
      setIsManualVip(false);
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
                <Input 
                  id="sell_price" 
                  type="number" 
                  required 
                  value={formData.sell_price} 
                  onChange={(e) => {
                    const sp = Number(e.target.value) || 0;
                    setFormData({
                      ...formData, 
                      sell_price: sp,
                      price_gold: !isManualGold ? (sp > 0 ? Math.max(0, sp - 3000) : 0) : formData.price_gold,
                      price_vip: !isManualVip ? (sp > 0 ? Math.max(0, sp - 5000) : 0) : formData.price_vip,
                    });
                  }} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price_gold">Harga Gold</Label>
                  <span className="text-[10px] text-amber-600 font-semibold">{isManualGold ? "(Manual)" : "(-3k Otomatis)"}</span>
                </div>
                <Input 
                  id="price_gold" 
                  type="number" 
                  value={formData.price_gold} 
                  onChange={(e) => {
                    setIsManualGold(true);
                    setFormData({...formData, price_gold: Number(e.target.value) || 0});
                  }} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price_vip">Harga VIP</Label>
                  <span className="text-[10px] text-purple-600 font-semibold">{isManualVip ? "(Manual)" : "(-5k Otomatis)"}</span>
                </div>
                <Input 
                  id="price_vip" 
                  type="number" 
                  value={formData.price_vip} 
                  onChange={(e) => {
                    setIsManualVip(true);
                    setFormData({...formData, price_vip: Number(e.target.value) || 0});
                  }} 
                />
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
