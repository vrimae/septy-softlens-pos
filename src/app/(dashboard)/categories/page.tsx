"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

export default function CategoriesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manajemen Kategori</h1>
          <p className="text-gray-500 mt-1">Atur kategori barang dan target margin profit Anda.</p>
        </div>
        <Button className="bg-[#1f5ffe] hover:bg-blue-700 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
          <Plus className="h-4 w-4 mr-2" /> Tambah Kategori
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Nama Kategori</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Target Margin Profit (%)</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Gunakan Expired</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="text-center py-16 text-gray-500">
                Belum ada kategori.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
