"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Sale = {
  id: string;
  total_amount: number;
  final_amount: number;
  payment_method: string;
  created_at: string;
  cashier: { full_name: string };
  customer: { name: string };
};

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`*, cashier:profiles!cashier_id(full_name), customer:customers!customer_id(name)`)
        .eq('status', 'COMPLETED')
        .order("created_at", { ascending: false });
        
      if (!error && data) {
        setSales(data as any);
      }
      setLoading(false);
    };
    fetchReports();
  }, []);

  const totalRevenue = sales.reduce((sum, s) => sum + s.final_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
          <p className="text-sm text-gray-500">Rekapitulasi riwayat transaksi penjualan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">Rp {totalRevenue.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Total (Rp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Memuat...</TableCell></TableRow>
              ) : sales.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-gray-500">Tidak ada data transaksi</TableCell></TableRow>
              ) : (
                sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{format(new Date(s.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}</TableCell>
                    <TableCell>{s.customer?.name || "Umum"}</TableCell>
                    <TableCell>{s.payment_method}</TableCell>
                    <TableCell className="text-right font-bold text-teal-700">
                      {s.final_amount.toLocaleString("id-ID")}
                    </TableCell>
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
