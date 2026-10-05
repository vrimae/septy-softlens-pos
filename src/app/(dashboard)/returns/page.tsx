"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

export default function ReturnsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Retur / Pembatalan</h1>
        <p className="text-sm text-gray-500">Manajemen pengembalian barang atau pembatalan transaksi.</p>
      </div>

      <Card className="border-dashed border-2 bg-gray-50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
          <RotateCcw className="h-12 w-12 mb-4 text-teal-600 opacity-50" />
          <h2 className="text-lg font-semibold">Modul Retur Sedang Dalam Pengembangan</h2>
          <p className="text-sm mt-2 max-w-md text-center">
            Modul ini akan menangani penyesuaian stok (IN) saat barang dikembalikan oleh pelanggan.
            Struktur tabel `returns` dan `return_items` sudah siap di database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
