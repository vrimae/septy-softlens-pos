"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auditService } from "@/lib/services/audit.service";

export default function AuditTrailPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getLogs();
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const searchString = search.toLowerCase();
    return (
      log.activity?.toLowerCase().includes(searchString) ||
      log.profiles?.full_name?.toLowerCase().includes(searchString) ||
      log.reason?.toLowerCase().includes(searchString)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Audit Trail</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Catatan seluruh aktivitas penting dalam sistem. Data ini tidak dapat dihapus oleh siapapun.</p>
        </div>
        <Button onClick={fetchLogs} className="bg-slate-900 dark:bg-[#13151a] hover:bg-slate-800 dark:hover:bg-[#2a303c] text-white font-bold rounded-lg px-4 h-10 shadow-sm transition-colors">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-[#13151a] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Cari</label>
          <input
            type="text"
            placeholder="Cari aktivitas atau user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100 transition-colors"
          />
        </div>
      </div>

      {/* Info */}
      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
        Menampilkan {filteredLogs.length} dari {logs.length} catatan audit.
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50 dark:bg-[#2a303c]/50">
              <TableRow className="border-gray-200 dark:border-gray-800">
                <TableHead className="font-semibold text-gray-600 dark:text-gray-400">TANGGAL & WAKTU</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-400">USER</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-400">AKTIVITAS</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-400">DATA</TableHead>
                <TableHead className="font-semibold text-gray-600 dark:text-gray-400">ALASAN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">Memuat data audit...</TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">Tidak ada catatan audit yang ditemukan.</TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const dateObj = new Date(log.created_at);
                  const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                  const timeStr = dateObj.toLocaleTimeString('id-ID');
                  return (
                    <TableRow key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#2a303c] transition-colors border-gray-200 dark:border-gray-800">
                      <TableCell className="py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{dateStr}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{timeStr}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-gray-900 dark:text-gray-100">{log.profiles?.full_name || 'System/Unknown'}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase">{log.profiles?.role || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-lg uppercase tracking-wider border border-blue-200 dark:border-blue-900/50">
                          {log.activity}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-gray-600 dark:text-gray-400" title={JSON.stringify(log.data_after)}>
                        {log.data_after ? JSON.stringify(log.data_after).substring(0, 50) + '...' : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{log.reason || '-'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
