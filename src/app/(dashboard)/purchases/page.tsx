"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pembelian & Supplier</h1>
        <p className="text-sm text-gray-500">Kelola restok barang dari supplier.</p>
      </div>

      <Card className="border-dashed border-2 bg-gray-50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Construction className="h-12 w-12 mb-4 text-teal-600 opacity-50" />
          <h2 className="text-lg font-semibold">Modul Pembelian Sedang Dalam Pengembangan</h2>
          <p className="text-sm mt-2 max-w-md text-center">
            Modul ini akan menangani penambahan stok otomatis (IN) saat barang datang dari supplier. 
            Struktur tabel `purchases` dan `suppliers` sudah siap di database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
