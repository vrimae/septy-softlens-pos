"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, ShoppingCart, Trash2, CheckCircle2, Plus, DollarSign, ScanLine, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { salesService, cashflowService, customersService } from "@/lib/services";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Product = {
  id: string;
  product_code: string;
  name: string;
  price_regular: number;
  stock_global: number;
};

type CartItem = Product & {
  qty: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

export default function PosPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [barcodeScan, setBarcodeScan] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [salesChannel, setSalesChannel] = useState<"Toko" | "WhatsApp" | "Marketplace">("Toko");
  
  // Persist cart to localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('septy_pos_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse saved cart");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('septy_pos_cart', JSON.stringify(cart));
  }, [cart]);
  
  // Customer selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  
  // Payment states
  const [payTunai, setPayTunai] = useState<number>(0);
  const [payTransfer, setPayTransfer] = useState<number>(0);
  const [payQris, setPayQris] = useState<number>(0);

  const [isProcessing, setIsProcessing] = useState(false);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock_global) {
          alert("Stok tidak mencukupi!");
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      if (product.stock_global <= 0) {
        alert("Stok habis!");
        return prev;
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQty = (id: string, newQty: number) => {
    if (newQty < 1) return removeFromCart(id);
    const product = products.find(p => p.id === id);
    if (product && newQty > product.stock_global) {
      alert("Stok tidak mencukupi!");
      return;
    }
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty: newQty } : item));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeScan.trim()) return;
    const found = products.find(
      p => p.product_code.toLowerCase() === barcodeScan.trim().toLowerCase()
    );
    if (found) {
      addToCart(found);
      setBarcodeScan("");
    } else {
      alert(`Produk dengan kode "${barcodeScan}" tidak ditemukan.`);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const data = await customersService.createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || "-",
      });

      if (data?.id) {
        setSelectedCustomerId(data.id);
      }
      setIsCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      fetchCustomers();
    } catch (err: any) {
      alert(`Gagal menambahkan pelanggan: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc.trim()) return;
    try {
      await cashflowService.createCashFlow({
        flow_type: 'OUT',
        category: 'PENGELUARAN KASIR',
        amount: parseFloat(expenseAmount) || 0,
        description: expenseDesc.trim(),
      });
      alert("Pengeluaran kasir berhasil dicatat ke buku kas!");
      setIsExpenseModalOpen(false);
      setExpenseAmount("");
      setExpenseDesc("");
    } catch (err: any) {
      alert(`Gagal mencatat pengeluaran: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price_regular * item.qty), 0);
  const totalAkhir = Math.max(0, subtotal - discount);
  const totalBayar = payTunai + payTransfer + payQris;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Keranjang kosong!");
    if (!selectedCustomerId) return alert("Pilih pelanggan terlebih dahulu!");
    if (totalBayar < totalAkhir) return alert("Pembayaran kurang!");
    
    setIsProcessing(true);
    try {
      const payments = [];
      if (payTunai > 0) payments.push({ payment_method: 'TUNAI' as const, amount: payTunai });
      if (payTransfer > 0) payments.push({ payment_method: 'TRANSFER' as const, amount: payTransfer });
      if (payQris > 0) payments.push({ payment_method: 'QRIS' as const, amount: payQris });

      const payload = {
        customer_id: selectedCustomerId,
        cashier_id: user?.id || null,
        sales_channel: salesChannel,
        discount_amount: discount,
        idempotency_key: `POS-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        items: cart.map(item => ({
          variant_id: item.id,
          qty: item.qty,
          price_at_sale: item.price_regular
        })),
        payments: payments.length > 0 ? payments : [{ payment_method: 'TUNAI' as const, amount: totalBayar }],
        pay_amount: totalBayar,
        payment_method: payTunai > 0 ? 'TUNAI' : (payQris > 0 ? 'QRIS' : 'TRANSFER')
      };

      const result = await salesService.createSale(payload);

      alert(`Transaksi Berhasil Diselesaikan!\nNo Invoice: ${result.invoice_number || 'INV-BERHASIL'}\nTotal: Rp ${(result.total_amount || totalAkhir).toLocaleString()}\nKembalian: Rp ${(result.change_amount || 0).toLocaleString()}`);
      setCart([]);
      setDiscount(0);
      setPayTunai(0);
      setPayTransfer(0);
      setPayQris(0);
      setSelectedCustomerId("");
      fetchProducts();

    } catch (err: any) {
      console.error(err);
      alert(`Gagal memproses transaksi: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.product_code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-full pb-10">
      {/* Left Area (Product List) */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Mesin Kasir (POS)</h1>
            <p className="text-gray-500 text-sm mt-1">Klik produk untuk menambah ke keranjang belanja.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button 
              onClick={() => setIsExpenseModalOpen(true)}
              variant="outline" 
              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 font-bold h-11 px-4 rounded-xl"
            >
              + Catat Pengeluaran
            </Button>
            
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <input 
                type="text" 
                value={barcodeScan}
                onChange={(e) => setBarcodeScan(e.target.value)}
                placeholder="Scan Barcode & Enter..." 
                className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[210px]"
              />
              <ScanLine className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </form>
          </div>
        </div>

        {/* Search filter bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau kode produk..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              onClick={() => addToCart(product)}
              className="bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-[#1c5ffb] hover:shadow-md transition-all flex flex-col justify-between min-h-[130px]"
            >
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{product.product_code}</span>
                <h3 className="font-bold text-gray-900 text-sm mt-1 line-clamp-2">{product.name}</h3>
              </div>
              <div className="mt-3 flex justify-between items-end">
                <span className="font-black text-[#1c5ffb] text-sm">Rp {product.price_regular.toLocaleString()}</span>
                <span className={`text-xs font-bold ${product.stock_global > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  Stok: {product.stock_global}
                </span>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
              Tidak ada produk ditemukan.
            </div>
          )}
        </div>
      </div>

      {/* Right Area (Cart) */}
      <div className="w-full lg:w-[400px] shrink-0">
        <div className="bg-[#f8fafc] rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-6rem)] sticky top-6">
          {/* Cart Header */}
          <div className="px-5 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-gray-700" />
              <h2 className="font-bold text-gray-900 text-lg">Keranjang Belanja</h2>
            </div>
            <div className="bg-[#1c5ffb] text-white text-xs font-bold px-3 py-1 rounded-full">
              {cart.reduce((a, b) => a + b.qty, 0)} item
            </div>
          </div>
          
          {/* Cart Items Area */}
          <div className="flex-1 overflow-y-auto p-5 bg-white space-y-3">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 font-medium text-sm">Belum ada barang di keranjang</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center pb-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-sm text-gray-900 leading-tight">{item.name}</p>
                    <p className="text-xs text-[#1c5ffb] font-bold mt-1">Rp {item.price_regular.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 font-bold">-</button>
                    <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 font-bold">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Actions */}
          <div className="bg-[#f8fafc] border-t border-gray-200 p-5 space-y-4">
            <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
              <span>Diskon (Rp)</span>
              <input 
                type="number" 
                value={discount || ""}
                onChange={e => setDiscount(Number(e.target.value))}
                className="w-24 px-3 py-1.5 text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-xs" 
              />
            </div>
            <div className="flex justify-between items-center text-lg font-black text-[#1c5ffb] pt-2 border-t border-gray-200">
              <span>Total Akhir</span>
              <span>Rp {totalAkhir.toLocaleString()}</span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-700">Pelanggan</label>
                <button 
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" /> Pelanggan Baru
                </button>
              </div>
              <select 
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            <div className="pt-1">
              <label className="block text-xs font-bold text-gray-700 mb-2">Channel Penjualan</label>
              <div className="flex bg-gray-200 rounded-xl p-1 gap-1">
                {(["Toko", "WhatsApp", "Marketplace"] as const).map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setSalesChannel(channel)}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${
                      salesChannel === channel 
                        ? "bg-[#1c5ffb] text-white shadow-sm" 
                        : "bg-transparent text-gray-600 hover:bg-white"
                    }`}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 mb-2">Pembayaran (Split)</label>
              <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-16">Tunai</span>
                  <div className="relative flex-1">
                    <input type="number" value={payTunai || ""} onChange={e => setPayTunai(Number(e.target.value))} className="w-full pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold" />
                    <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">Rp</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-16">Transfer</span>
                  <div className="relative flex-1">
                    <input type="number" value={payTransfer || ""} onChange={e => setPayTransfer(Number(e.target.value))} className="w-full pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold" />
                    <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">Rp</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600 w-16">QRIS</span>
                  <div className="relative flex-1">
                    <input type="number" value={payQris || ""} onChange={e => setPayQris(Number(e.target.value))} className="w-full pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold" />
                    <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">Rp</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-600">Total Bayar:</span>
                  <span className={`text-sm font-black ${totalBayar >= totalAkhir ? 'text-[#00a84e]' : 'text-red-500'}`}>
                    Rp {totalBayar.toLocaleString()}
                  </span>
                </div>
                {totalBayar > totalAkhir && (
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                    <span>Kembalian:</span>
                    <span>Rp {(totalBayar - totalAkhir).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={handleCheckout} 
              disabled={isProcessing || cart.length === 0 || !selectedCustomerId || totalBayar < totalAkhir}
              className="w-full bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-sm text-base mt-2"
            >
              {isProcessing ? "Memproses..." : "Selesaikan Transaksi"}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Catat Pengeluaran */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Catat Pengeluaran Kasir</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordExpense} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 50000"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan / Keperluan</label>
              <input
                type="text"
                placeholder="Contoh: Beli bensin kurir / galon air"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Simpan Pengeluaran
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Pelanggan Cepat */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Daftarkan Pelanggan Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                placeholder="Nama pelanggan..."
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nomor WhatsApp</label>
              <input
                type="text"
                placeholder="0812xxxx"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCustomerModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold">
                Tambah Pelanggan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
