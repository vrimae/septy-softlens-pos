"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type InventoryMovement = {
  id: string;
  product_id: string;
  movement_type: string;
  qty: number;
  notes: string;
  created_at: string;
  products: { name: string; sku: string };
};

export default function InventoryPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovements = async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select(`*, products(name, sku)`)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (!error && data) {
        setMovements(data as any);
      }
      setLoading(false);
    };

    fetchMovements();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Riwayat Stok</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Melihat pergerakan barang masuk dan keluar.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Memuat...</TableCell></TableRow>
              ) : movements.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-500 dark:text-gray-400">Belum ada pergerakan stok</TableCell></TableRow>
              ) : (
                movements.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{format(new Date(m.created_at), "dd MMM yyyy HH:mm", { locale: id })}</TableCell>
                    <TableCell className="font-medium">{m.products?.name} <span className="text-xs text-gray-400 block">{m.products?.sku}</span></TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        m.movement_type === 'IN' ? 'bg-green-100 text-green-700' :
                        m.movement_type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {m.movement_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">{m.qty > 0 ? `+${m.qty}` : m.qty}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{m.notes || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
