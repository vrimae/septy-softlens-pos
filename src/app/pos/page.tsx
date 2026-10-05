"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, Plus, Minus, Trash2, CreditCard, Banknote, User, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  brand: string;
  sell_price: number;
  stock_qty: number;
};

type CartItem = Product & {
  qty: number;
  discount: number;
};

export default function PosPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("TUNAI");
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, brand, sell_price, stock_qty")
      .eq("is_active", true)
      .gt("stock_qty", 0);
    if (data) setProducts(data);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock_qty) return prev; // limit to stock
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1, discount: 0 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty > item.stock_qty) return item; // limit to stock
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sell_price * item.qty), 0);
  const totalDiscount = cart.reduce((sum, item) => sum + (item.discount * item.qty), 0);
  const total = subtotal - totalDiscount;
  const change = typeof amountPaid === "number" ? amountPaid - total : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Keranjang kosong!");
    if (typeof amountPaid !== "number" || amountPaid < total) {
      if (paymentMethod === "TUNAI") {
         return alert("Uang pembayaran kurang!");
      }
    }

    setIsCheckingOut(true);
    try {
      // call RPC checkout_sale
      const items = cart.map(item => ({
        product_id: item.id,
        qty: item.qty,
        price: item.sell_price,
        discount: item.discount,
        subtotal: (item.sell_price - item.discount) * item.qty
      }));

      const { data, error } = await supabase.rpc("checkout_sale", {
        p_customer_id: null, // default customer
        p_cashier_id: user?.id,
        p_total_amount: subtotal,
        p_discount: totalDiscount,
        p_final_amount: total,
        p_payment_method: paymentMethod,
        p_amount_paid: paymentMethod === 'TUNAI' ? amountPaid : total,
        p_change_amount: paymentMethod === 'TUNAI' ? change : 0,
        p_status: 'COMPLETED',
        p_items: items
      });

      if (error) throw error;

      alert("Transaksi berhasil!");
      setCart([]);
      setAmountPaid("");
      fetchProducts(); // refresh stock
    } catch (error: any) {
      alert("Gagal memproses transaksi: " + error.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 bg-white border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-teal-700">Kasir POS</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-5 w-5" />
          <span>{user?.email}</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Kolom Kiri: Daftar Produk */}
        <div className="w-2/3 flex flex-col bg-gray-50 border-r">
          <div className="p-4 bg-white border-b shrink-0">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <Input 
                className="pl-10 h-12 text-lg rounded-full bg-gray-100 border-transparent focus:bg-white"
                placeholder="Cari softlens (nama, tipe, merek)..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-teal-400 hover:shadow-md transition-all active:scale-95 flex flex-col justify-between h-32"
                >
                  <div>
                    <h3 className="font-bold text-gray-800 line-clamp-2 leading-tight">{product.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{product.brand}</p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="font-bold text-teal-700">
                      Rp {product.sell_price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-600">
                      Stok: {product.stock_qty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Keranjang */}
        <div className="w-1/3 bg-white flex flex-col">
          <div className="h-12 bg-teal-50 border-b border-teal-100 flex items-center px-4 shrink-0 font-semibold text-teal-800">
            Pesanan Saat Ini
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
                <p>Keranjang masih kosong</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex flex-col p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between font-medium">
                    <span className="truncate pr-2">{item.name}</span>
                    <span>Rp {(item.sell_price * item.qty).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center bg-gray-100 rounded-lg">
                      <button onClick={() => updateQty(item.id, -1)} className="p-2 hover:bg-gray-200 rounded-l-lg text-gray-600">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-semibold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-2 hover:bg-gray-200 rounded-r-lg text-gray-600">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t bg-gray-50 shrink-0 space-y-4">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">Total</span>
              <span className="font-bold text-2xl">Rp {total.toLocaleString("id-ID")}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant={paymentMethod === "TUNAI" ? "default" : "outline"}
                className={paymentMethod === "TUNAI" ? "bg-teal-600" : ""}
                onClick={() => setPaymentMethod("TUNAI")}
              >
                <Banknote className="mr-2 h-4 w-4" /> Tunai
              </Button>
              <Button 
                variant={paymentMethod === "QRIS" ? "default" : "outline"}
                className={paymentMethod === "QRIS" ? "bg-teal-600" : ""}
                onClick={() => { setPaymentMethod("QRIS"); setAmountPaid(total); }}
              >
                <CreditCard className="mr-2 h-4 w-4" /> QRIS / Transfer
              </Button>
            </div>

            {paymentMethod === "TUNAI" && (
              <div className="space-y-2">
                <Input 
                  type="number" 
                  placeholder="Jumlah Uang Diterima" 
                  className="h-12 text-lg text-right font-bold"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value ? Number(e.target.value) : "")}
                />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Kembalian</span>
                  <span className={`font-bold ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    Rp {change >= 0 ? change.toLocaleString("id-ID") : 0}
                  </span>
                </div>
              </div>
            )}

            <Button 
              className="w-full h-14 text-lg bg-teal-600 hover:bg-teal-700 mt-2" 
              onClick={handleCheckout}
              disabled={isCheckingOut || cart.length === 0}
            >
              {isCheckingOut ? "Memproses..." : "Bayar Sekarang"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
