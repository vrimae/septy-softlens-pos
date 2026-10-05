"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserCheck, UserX } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manajemen Karyawan</h1>
          <p className="text-gray-500 mt-1">Atur wewenang karyawan sesuai kebijakan toko.</p>
        </div>
        <Button className="bg-[#1c5ffb] hover:bg-blue-700 text-white rounded-lg px-5 font-semibold shadow-sm h-11">
          + Tambah Karyawan Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-600 mb-1">Total pegawai</p>
            <div className="text-4xl font-black text-gray-900">1</div>
          </div>
          <div className="w-14 h-14 bg-[#f0f4ff] rounded-2xl flex items-center justify-center text-[#1c5ffb]">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-600 mb-1">Aktif</p>
            <div className="text-4xl font-black text-gray-900">1</div>
          </div>
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-600 mb-1">Tidak aktif</p>
            <div className="text-4xl font-black text-gray-900">0</div>
          </div>
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
            <UserX className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Info User</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6">Cabang</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Jabatan (Role)</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Hak Akses Sementara</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-b border-gray-100">
              <TableCell className="px-6 py-4">
                <p className="font-bold text-gray-900 text-base">Owner</p>
                <p className="text-sm text-gray-400">vrimae23@gmail.com</p>
              </TableCell>
              <TableCell className="px-6 py-4 font-bold text-gray-700">Pusat</TableCell>
              <TableCell className="px-6 py-4 text-center">
                <span className="bg-purple-100 text-purple-600 font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full">OWNER</span>
              </TableCell>
              <TableCell className="px-6 py-4 text-center">
                <span className="bg-gray-100 text-gray-500 font-bold text-xs px-3 py-1 rounded-full">all</span>
              </TableCell>
              <TableCell className="px-6 py-4 text-right">
                <button className="text-[#1c5ffb] font-bold text-sm mr-4 hover:underline">Edit</button>
                <button className="text-red-500 font-bold text-sm hover:underline">Hapus</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
