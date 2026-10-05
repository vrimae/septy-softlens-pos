"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "lucide-react";

export default function AuditTrailPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Audit Trail</h1>
        <p className="text-gray-500 mt-1">Catatan seluruh aktivitas penting dalam sistem. Data ini tidak dapat dihapus oleh siapa pun.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Cari</label>
            <input 
              type="text" 
              placeholder="Cari aktivitas..." 
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Aktivitas</label>
            <select className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>Semua Aktivitas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">User</label>
            <select className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>Semua User</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Dari Tanggal</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="dd/mm/yyyy" 
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Sampai Tanggal</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="dd/mm/yyyy" 
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-4">Menampilkan <span className="font-bold text-gray-900">0</span> dari <span className="font-bold text-gray-900">0</span> catatan audit.</p>
        
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
          <Table>
            <TableHeader>
              <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider py-4 px-6">TANGGAL</TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider py-4 px-6 text-center">JAM</TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider py-4 px-6 text-center">USER</TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider py-4 px-6 text-center">AKTIVITAS</TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider py-4 px-6 text-center">DATA SEBELUM</TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider py-4 px-6 text-center">DATA SESUDAH</TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider py-4 px-6 text-right">ALASAN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-gray-400 font-medium border-b-0 italic">
                  Belum ada catatan audit.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
