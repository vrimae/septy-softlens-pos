"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditEntry = {
  id: string;
  date: string;
  time: string;
  user: string;
  activity: string;
  before: string;
  after: string;
  reason: string;
};

export default function AuditTrailPage() {
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("Semua Aktivitas");
  const [userFilter, setUserFilter] = useState("Semua User");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [logs, setLogs] = useState<AuditEntry[]>([
    {
      id: "1",
      date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      time: "10:35:12",
      user: "vrimae23@gmail.com (Owner)",
      activity: "LOGIN SISTEM",
      before: "-",
      after: "Sesi Aktif",
      reason: "Login perangkat kasir",
    },
    {
      id: "2",
      date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      time: "11:02:40",
      user: "vrimae23@gmail.com (Owner)",
      activity: "UPDATE MASTER BARANG",
      before: "Stok: 5",
      after: "Stok: 25",
      reason: "Restock manual barang",
    },
    {
      id: "3",
      date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      time: "11:45:00",
      user: "SP Kasir (Pusat)",
      activity: "TRANSAKSI POS",
      before: "TRX-001 (Pending)",
      after: "Lunas Rp 150.000",
      reason: "Penjualan Pelanggan Reguler",
    },
  ]);

  const handleAddSampleAudit = () => {
    const now = new Date();
    const newLog: AuditEntry = {
      id: Date.now().toString(),
      date: now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      time: now.toLocaleTimeString("id-ID"),
      user: "vrimae23@gmail.com",
      activity: "SINKRONISASI SISTEM",
      before: "Status: Idle",
      after: "Status: Sync Success",
      reason: "Pemeriksaan audit rutin",
    };
    setLogs([newLog, ...logs]);
  };

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.activity.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.reason.toLowerCase().includes(search.toLowerCase());

    const matchActivity =
      activityFilter === "Semua Aktivitas" || log.activity.includes(activityFilter);

    const matchUser =
      userFilter === "Semua User" || log.user.includes(userFilter);

    return matchSearch && matchActivity && matchUser;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-normal">Audit Trail</h1>
          <p className="text-gray-500 mt-1">Catatan seluruh aktivitas penting dalam sistem. Data ini tidak dapat dihapus oleh siapa pun.</p>
        </div>
        <Button 
          onClick={handleAddSampleAudit}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-5 h-11 flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" /> Catat Aktivitas Sistem
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Cari</label>
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aktivitas..." 
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Aktivitas</label>
            <select 
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="Semua Aktivitas">Semua Aktivitas</option>
              <option value="LOGIN">LOGIN</option>
              <option value="MASTER BARANG">MASTER BARANG</option>
              <option value="TRANSAKSI">TRANSAKSI</option>
              <option value="SINKRONISASI">SINKRONISASI</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">User</label>
            <select 
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="Semua User">Semua User</option>
              <option value="vrimae23@gmail.com">vrimae23@gmail.com (Owner)</option>
              <option value="Kasir">SP Kasir</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Dari Tanggal</label>
            <div className="relative">
              <input 
                type="text" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="dd/mm/yyyy" 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Sampai Tanggal</label>
            <div className="relative">
              <input 
                type="text" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="dd/mm/yyyy" 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-4">
          Menampilkan <span className="font-bold text-gray-900">{filteredLogs.length}</span> dari <span className="font-bold text-gray-900">{logs.length}</span> catatan audit.
        </p>
        
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-1">
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
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-gray-400 font-medium border-b-0 italic">
                    Belum ada catatan audit yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell className="px-6 py-4 font-semibold text-xs text-gray-800">{log.date}</TableCell>
                    <TableCell className="px-6 py-4 text-center font-mono text-xs text-gray-500">{log.time}</TableCell>
                    <TableCell className="px-6 py-4 text-center text-xs font-bold text-gray-700">{log.user}</TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span className="bg-slate-100 text-blue-700 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full">
                        {log.activity}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center text-xs text-gray-500 font-mono">{log.before}</TableCell>
                    <TableCell className="px-6 py-4 text-center text-xs font-bold text-gray-800 font-mono">{log.after}</TableCell>
                    <TableCell className="px-6 py-4 text-right text-xs text-gray-600">{log.reason}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
