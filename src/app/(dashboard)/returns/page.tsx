"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type ReturnItem = {
  id: string;
  date: string;
  originalTrx: string;
  item: string;
  qty: number;
  reason: string;
  destination: string;
  exchangeWith: string;
  difference: number;
  handler: string;
};

export default function ReturnsPage() {
  const [returnsList, setReturnsList] = useState<ReturnItem[]>([
    {
      id: "RET-101",
      date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      originalTrx: "TRX-1728231",
      item: "Softlens Gray 14.5mm",
      qty: 1,
      reason: "Minus Salah Beli",
      destination: "Gudang Baik",
      exchangeWith: "Softlens Brown 14.5mm",
      difference: 0,
      handler: "Kasir (SP)",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originalTrx, setOriginalTrx] = useState("");
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("Salah Minus / Warna");
  const [destination, setDestination] = useState("Gudang Baik (Bisa Dijual Lagi)");
  const [exchangeWith, setExchangeWith] = useState("");
  const [difference, setDifference] = useState("0");

  const handleOpenAdd = () => {
    setOriginalTrx("");
    setItem("");
    setQty("1");
    setReason("Salah Minus / Warna");
    setDestination("Gudang Baik (Bisa Dijual Lagi)");
    setExchangeWith("");
    setDifference("0");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !originalTrx.trim()) return;

    const newRet: ReturnItem = {
      id: `RET-${Date.now().toString().slice(-4)}`,
      date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      originalTrx,
      item,
      qty: parseInt(qty) || 1,
      reason,
      destination,
      exchangeWith: exchangeWith || "-",
      difference: parseFloat(difference) || 0,
      handler: "Owner / SP",
    };

    setReturnsList([newRet, ...returnsList]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Retur / Tukar Barang</h1>
          <p className="text-gray-500 mt-1">Kebijakan retur fleksibel. Hanya melayani tukar barang.</p>
        </div>
        <Button 
          onClick={handleOpenAdd}
          className="bg-[#1c5ffb] hover:bg-blue-700 text-white rounded-xl px-5 font-semibold shadow-sm h-11 flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Proses Retur / Tukar
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden p-1 mt-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">ID</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Tanggal</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Transaksi Asal</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Barang Retur</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Qty</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Alasan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Tukar Dengan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Selisih</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Pelaku</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returnsList.map((r) => (
              <TableRow key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <TableCell className="px-6 py-4 text-center font-bold text-xs text-blue-600">{r.id}</TableCell>
                <TableCell className="px-6 py-4 text-center text-xs text-gray-600">{r.date}</TableCell>
                <TableCell className="px-6 py-4 text-center font-mono text-xs text-gray-700">{r.originalTrx}</TableCell>
                <TableCell className="px-6 py-4 text-center font-bold text-gray-900 text-xs">{r.item}</TableCell>
                <TableCell className="px-6 py-4 text-center font-bold text-xs">{r.qty}</TableCell>
                <TableCell className="px-6 py-4 text-center text-xs text-gray-600">{r.reason}</TableCell>
                <TableCell className="px-6 py-4 text-center font-semibold text-xs text-gray-800">{r.exchangeWith}</TableCell>
                <TableCell className="px-6 py-4 text-center text-xs font-bold text-emerald-600">
                  Rp {r.difference.toLocaleString()}
                </TableCell>
                <TableCell className="px-6 py-4 text-center text-xs text-gray-500">{r.handler}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal Dialog Form Retur */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Formulir Retur / Tukar Barang</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">No. Struk Transaksi Asal</label>
              <input
                type="text"
                placeholder="Contoh: TRX-1728231"
                value={originalTrx}
                onChange={(e) => setOriginalTrx(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Barang Diretur</label>
                <input
                  type="text"
                  placeholder="Nama produk..."
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Alasan Retur / Tukar</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="Salah Minus / Ukuran">Salah Minus / Ukuran</option>
                <option value="Salah Warna / Model">Salah Warna / Model</option>
                <option value="Cacat Pabrik (Klaim)">Cacat Pabrik (Klaim)</option>
                <option value="Kemasan Rusak">Kemasan Rusak</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Ditukar Dengan Barang</label>
              <input
                type="text"
                placeholder="Nama produk pengganti..."
                value={exchangeWith}
                onChange={(e) => setExchangeWith(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Selisih Harga (Rp)</label>
              <input
                type="number"
                placeholder="0"
                value={difference}
                onChange={(e) => setDifference(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold">
                Simpan Retur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
