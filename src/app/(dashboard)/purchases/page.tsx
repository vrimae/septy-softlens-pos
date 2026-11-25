"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw, Trash2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { unwrap, scopeBranch, friendlyError } from "@/lib/supabase/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplier: string;
  invoice: string;
  date: string;
  status: "LUNAS" | "UTANG" | "PENDING";
  paymentMethod: string;
  totalCost: number;
};

type POItem = {
  productId: string;
  productName: string;
  qty: number;
  unitCost: number;
  expiryDate: string;
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [invoice, setInvoice] = useState("");
  const [status, setStatus] = useState<"LUNAS" | "UTANG" | "PENDING">("LUNAS");
  const [paymentMethod, setPaymentMethod] = useState("Transfer Bank");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      let query = supabase.from("purchases").select(`
          id,
          po_number,
          total_cost,
          debt_balance,
          payment_status,
          created_at,
          supplier:suppliers(name)
        `);
      query = scopeBranch(query);
      const rows = unwrap(await query.order("created_at", { ascending: false }));

      const mapped: PurchaseOrder[] = (rows || []).map((item: any) => ({
        id: item.id,
        poNumber: item.po_number || `PO-${item.id.slice(0, 8)}`,
        supplier: item.supplier?.name || "Supplier Mitra",
        invoice: item.po_number || "-",
        date: new Date(item.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        status: item.debt_balance > 0 ? "UTANG" : "LUNAS",
        paymentMethod: "Transfer Bank",
        totalCost: Number(item.total_cost) || 0,
      }));
      setPurchases(mapped);
    } catch (err) {
      alert(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleOpenAdd = () => {
    setSupplier("");
    setInvoice("");
    setStatus("LUNAS");
    setPaymentMethod("Transfer Bank");
    setPoItems([]);
    setSearchProduct("");
    setSearchResults([]);
    setIsModalOpen(true);
  };

  const handleSearchProduct = async (text: string) => {
    setSearchProduct(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await scopeBranch(
      supabase.from("products")
      .select("id, name, product_code, cost_price")
      .or(`name.ilike.%${text}%,product_code.ilike.%${text}%`)
      .limit(5)
    );
    setSearchResults(data || []);
  };

  const addProduct = (prod: any) => {
    setPoItems(prev => [...prev, {
      productId: prod.id,
      productName: prod.name,
      qty: 1,
      unitCost: prod.cost_price || 0,
      expiryDate: ""
    }]);
    setSearchProduct("");
    setSearchResults([]);
  };

  const totalCost = poItems.reduce((acc, item) => acc + (item.qty * item.unitCost), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim() || poItems.length === 0) {
       return alert("Supplier dan minimal 1 produk wajib diisi!");
    }

    setIsSubmitting(true);
    try {
      const poNum = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // Cari atau buat supplier (within branch)
      let supplierId = null;
      let supQuery = supabase.from("suppliers").select("id").ilike("name", supplier.trim());
      supQuery = scopeBranch(supQuery);
      const { data: existingSup } = await supQuery.limit(1).maybeSingle();

      if (existingSup) {
        supplierId = existingSup.id;
      } else {
        const newSup = unwrap(await supabase.from("suppliers").insert(({
          name: supplier.trim(),
        })).select("id").single());
        if (newSup) supplierId = newSup.id;
      }

      if (supplierId) {
        const newPO = unwrap(await supabase.from("purchases").insert(({
          po_number: poNum,
          supplier_id: supplierId,
          total_cost: totalCost,
          total_paid: status === "LUNAS" ? totalCost : 0,
          debt_balance: status === "UTANG" ? totalCost : 0,
          payment_status: status === "LUNAS" ? "LUNAS" : "UTANG",
          status: "ORDERED",
        })).select('id').single());

        if (newPO && poItems.length > 0) {
           const itemsToInsert = poItems.map(item => ({ purchase_id: newPO.id, product_id: item.productId, qty: item.qty, cost_per_unit: item.unitCost, subtotal: item.qty * item.unitCost, expiry_date: item.expiryDate ? item.expiryDate : null }));
           unwrap(await supabase.from("purchase_items").insert(itemsToInsert));
           
           // Update expiry_date for products if provided
           for (const item of poItems) {
             if (item.expiryDate) {
               await supabase.from("products").update({ expiry_date: item.expiryDate }).eq('id', item.productId);
             }
           }
           
           // Receive PO instantly to update inventory & ledger
           unwrap(await supabase.rpc('receive_purchase', { p_purchase_id: newPO.id }));
        }
      }

      setIsModalOpen(false);
      fetchPurchases();
      alert("Pembelian berhasil dicatat dan stok bertambah!");
    } catch (err: any) {
      alert(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Pembelian Barang (PO)</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Catat belanja stok dari supplier pabrik secara lengkap.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchPurchases}
            variant="outline"
            className="border-gray-200 dark:border-gray-800"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button 
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Tambah Pembelian Baru
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-1 mt-4">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-transparent">
              <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-4 px-4">No. PO/Faktur</TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-4 px-4">Supplier & Tgl</TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-4 px-4">Status / Metode</TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-4 px-4 text-right">Total Biaya</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-gray-500">Memuat data pembelian...</TableCell>
              </TableRow>
            ) : purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-gray-500">Belum ada catatan pembelian.</TableCell>
              </TableRow>
            ) : (
              purchases.map((po) => (
                <TableRow key={po.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-[#1e2329]/50 transition-colors">
                  <TableCell className="py-4 px-4">
                    <div className="font-bold text-gray-900 dark:text-gray-100">{po.poNumber}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{po.invoice !== "-" ? po.invoice : ""}</div>
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{po.supplier}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{po.date}</div>
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${po.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {po.status}
                      </span>
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                        {po.paymentMethod}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-right">
                    <div className="font-bold text-gray-900 dark:text-gray-100">Rp {po.totalCost.toLocaleString('id-ID')}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#1e2329]/50">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">Restock & Terima Barang (PO)</DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <form id="purchaseForm" onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Nama Supplier / Pabrik</label>
                  <input
                    required
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Contoh: PT Optik Sentosa Abadi"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">No. Faktur (Opsional)</label>
                  <input
                    value={invoice}
                    onChange={(e) => setInvoice(e.target.value)}
                    placeholder="Contoh: INV-9921"
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Product Search & Item List */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                 <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 block">Tambahkan Produk</label>
                 <div className="relative mb-4">
                   <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                   <input
                      type="text"
                      placeholder="Ketik nama atau kode produk..."
                      value={searchProduct}
                      onChange={(e) => handleSearchProduct(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                   />
                   {searchResults.length > 0 && (
                     <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg">
                       {searchResults.map(res => (
                         <div 
                           key={res.id} 
                           onClick={() => addProduct(res)}
                           className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#13151a] cursor-pointer text-sm flex justify-between"
                         >
                           <span className="font-medium text-gray-900 dark:text-gray-100">{res.name} <span className="text-gray-400 text-xs">({res.product_code})</span></span>
                           <span className="text-emerald-600 font-semibold">Rp {Number(res.cost_price || 0).toLocaleString('id-ID')}</span>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                 {poItems.length > 0 && (
                   <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                     <Table>
                       <TableHeader className="bg-gray-50 dark:bg-[#1e2329]">
                         <TableRow>
                           <TableHead className="py-2 px-3 text-xs">Produk</TableHead>
                           <TableHead className="py-2 px-3 text-xs w-24">Qty Masuk</TableHead>
                           <TableHead className="py-2 px-3 text-xs w-32">Harga Beli/Pcs</TableHead>
                           <TableHead className="py-2 px-3 text-xs w-36">Kadaluarsa</TableHead>
                           <TableHead className="py-2 px-3 text-xs w-10"></TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {poItems.map((item, idx) => (
                           <TableRow key={idx}>
                             <TableCell className="py-2 px-3 text-sm font-medium">{item.productName}</TableCell>
                             <TableCell className="py-2 px-3">
                               <input 
                                 type="number" 
                                 min="1"
                                 value={item.qty}
                                 onChange={(e) => {
                                   const newItems = [...poItems];
                                   newItems[idx].qty = parseInt(e.target.value) || 1;
                                   setPoItems(newItems);
                                 }}
                                 className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-[#13151a]"
                               />
                             </TableCell>
                             <TableCell className="py-2 px-3">
                               <input 
                                 type="number" 
                                 min="0"
                                 value={item.unitCost}
                                 onChange={(e) => {
                                   const newItems = [...poItems];
                                   newItems[idx].unitCost = parseFloat(e.target.value) || 0;
                                   setPoItems(newItems);
                                 }}
                                 className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-[#13151a]"
                               />
                             </TableCell>
                             <TableCell className="py-2 px-3">
                               <input 
                                 type="date" 
                                 value={item.expiryDate}
                                 onChange={(e) => {
                                   const newItems = [...poItems];
                                   newItems[idx].expiryDate = e.target.value;
                                   setPoItems(newItems);
                                 }}
                                 className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-[#13151a]"
                               />
                             </TableCell>
                             <TableCell className="py-2 px-3">
                               <Button size="icon" variant="ghost" onClick={() => {
                                 const newItems = [...poItems];
                                 newItems.splice(idx, 1);
                                 setPoItems(newItems);
                               }} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7">
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </div>
                 )}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Status Bayar</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="LUNAS">LUNAS</option>
                    <option value="UTANG">TEMPO / UTANG</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Metode Bayar</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Tunai Keras">Tunai Keras</option>
                    <option value="Kredit">Kredit Tempo</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                  <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Total Tagihan (Auto)</label>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    Rp {totalCost.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#1e2329]/50 flex justify-end gap-3 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-gray-200 dark:border-gray-800 font-semibold text-gray-600 dark:text-gray-300"
            >
              Batal
            </Button>
            <Button
              form="purchaseForm"
              type="submit"
              disabled={isSubmitting || poItems.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan & Terima Barang"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}





