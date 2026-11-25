"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { unwrap, scopeBranch, friendlyError, getActiveProfileId, getActiveBranchId } from "@/lib/supabase/db";
import { Check, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ApprovalItem = {
  id: string;
  category: "price" | "expense" | "cash_diff" | "warehouse";
  title: string;
  requester: string;
  details: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      let query = supabase.from("approvals").select(`
          id, category, title, details, status, created_at,
          requester:profiles!requester_id(full_name)
        `);
      query = scopeBranch(query);
      const rows = unwrap(await query.order("created_at", { ascending: false }));
      
      const mapped: ApprovalItem[] = (rows || []).map((r: any) => {
        let parsedDetails = r.details;
        if (typeof parsedDetails === 'object' && parsedDetails !== null) {
          if (r.category === 'CASH_DIFF') {
            parsedDetails = `Minus Rp ${Math.abs(Number(parsedDetails.difference || 0)).toLocaleString('id-ID')}. Keterangan Kasir: ${parsedDetails.notes || '-'}`;
          } else {
            parsedDetails = JSON.stringify(parsedDetails);
          }
        }
        
        return {
          id: r.id,
          category: r.category === 'PRICE_OVERRIDE' ? 'price' :
                    r.category === 'EXPENSE' ? 'expense' :
                    r.category === 'CASH_DIFF' ? 'cash_diff' :
                    r.category === 'DAMAGED_WRITE_OFF' ? 'warehouse' : r.category,
          title: r.title,
          requester: r.requester?.full_name || "Sistem",
          details: String(parsedDetails),
          date: new Date(r.created_at).toLocaleString("id-ID"),
          status: r.status,
        };
      });
      setItems(mapped);
    } catch (err) {
      alert(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const [expandedCat, setExpandedCat] = useState<string | null>("price");

  const handleAction = async (id: string, action: "APPROVED" | "REJECTED") => {
    try {
      if (action === "APPROVED") {
        const { data: approval } = await supabase.from("approvals").select("*").eq("id", id).single();
        if (approval) {
          if (approval.category === "EXPENSE") {
            const det = approval.details;
            const { data: fund } = await scopeBranch(
              supabase.from("cash_registers").select("id, name, balance").eq("is_expense_fund", true).eq("is_active", true).limit(1)
            ).maybeSingle();
            if (!fund) {
              alert("Belum ada Kas Pengeluaran Kasir. Buka Buku Kas, lalu pilih 'Jadikan Kas Pengeluaran Kasir' pada salah satu kantong kas.");
              return;
            }
            const { error } = await supabase.rpc('record_cash_flow', {
              p_payload: {
                cash_register_id: fund.id,
                flow_type: 'OUT',
                category: det.category,
                amount: det.amount,
                description: det.description,
                branch_id: getActiveBranchId(),
                created_by: getActiveProfileId()
              }
            });
            if (error) throw error;
          } else if (approval.category === "DAMAGED_WRITE_OFF") {
            const det = approval.details;
            const newStatus = det.action_name === "Klaim Retur Pabrik" ? "CLAIMED_SUPPLIER" : "DESTROYED";
            unwrap(await supabase.from("damaged_goods").update({
              status: newStatus,
              resolved_at: new Date().toISOString()
            }).eq("id", det.damaged_goods_id));
          }
        }
      }

      unwrap(await supabase.from("approvals").update({ status: action, decided_by: getActiveProfileId() }).eq("id", id));
      fetchApprovals();
    } catch (err) {
      alert(friendlyError(err));
    }
  };

  const getPendingCount = (cat: string) => items.filter(it => it.category === cat && it.status === "PENDING").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="bg-white dark:bg-[#13151a] border border-gray-100 dark:border-gray-800/50 rounded-xl shadow-sm p-6 mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal mb-1">Pusat Approval Owner</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Persetujuan untuk tindakan administratif yang membutuhkan wewenang Owner.</p>
      </div>

      <div className="space-y-4">
        {/* Card A: Harga di bawah Target Margin */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden p-6 transition-colors">
          <div 
            onClick={() => setExpandedCat(expandedCat === "price" ? null : "price")}
            className="flex justify-between items-center cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-semibold text-sm">A</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Harga di bawah Target Margin</h2>
                <p className="text-xs text-gray-400">Pengajuan potongan harga oleh kasir</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${getPendingCount("price") > 0 ? "bg-red-50 text-red-600" : "bg-gray-100 dark:bg-[#2a303c] text-gray-500 dark:text-gray-400"}`}>
                {getPendingCount("price")} Menunggu
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedCat === "price" ? "rotate-180" : ""}`} />
            </div>
          </div>

          {expandedCat === "price" && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50 space-y-3">
              {items.filter(it => it.category === "price").map(item => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-[#1e2329] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{item.title}</span>
                      <span className="text-[11px] text-gray-400 font-mono">({item.id})</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.details}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Diajukan oleh: <strong className="text-gray-700 dark:text-gray-300">{item.requester}</strong> • {item.date}</p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.status === "PENDING" ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleAction(item.id, "APPROVED")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAction(item.id, "REJECTED")}
                          className="border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs px-3"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Tolak
                        </Button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {item.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card ! : Notifikasi Pengeluaran Kasir */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden p-6 transition-colors">
          <div 
            onClick={() => setExpandedCat(expandedCat === "expense" ? null : "expense")}
            className="flex justify-between items-center cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-semibold text-sm">!</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Riwayat Approval Pengeluaran Kasir</h2>
                <p className="text-xs text-gray-400">Catatan pengeluaran baru kini langsung masuk Buku Kas tanpa perlu approval Owner</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${getPendingCount("expense") > 0 ? "bg-purple-50 text-purple-600" : "bg-gray-100 dark:bg-[#2a303c] text-gray-500 dark:text-gray-400"}`}>
                {getPendingCount("expense")} Menunggu
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedCat === "expense" ? "rotate-180" : ""}`} />
            </div>
          </div>

          {expandedCat === "expense" && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50 space-y-3">
              {items.filter(it => it.category === "expense").map(item => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-[#1e2329] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{item.title}</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.details}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Diajukan: {item.requester} • {item.date}</p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.status === "PENDING" ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleAction(item.id, "APPROVED")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAction(item.id, "REJECTED")}
                          className="border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs px-3"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Tolak
                        </Button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {item.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card B: Selisih Kas (Tutup Shift) */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden p-6 transition-colors">
          <div 
            onClick={() => setExpandedCat(expandedCat === "cash_diff" ? null : "cash_diff")}
            className="flex justify-between items-center cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center font-semibold text-sm">B</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Selisih Kas (Tutup Shift)</h2>
                <p className="text-xs text-gray-400">Pemeriksaan selisih kas fisik vs sistem</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${getPendingCount("cash_diff") > 0 ? "bg-orange-50 text-orange-600" : "bg-gray-100 dark:bg-[#2a303c] text-gray-500 dark:text-gray-400"}`}>
                {getPendingCount("cash_diff")} Menunggu
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedCat === "cash_diff" ? "rotate-180" : ""}`} />
            </div>
          </div>

          {expandedCat === "cash_diff" && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50 space-y-3">
              {items.filter(it => it.category === "cash_diff").map(item => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-[#1e2329] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{item.title}</span>
                      <span className="text-[11px] text-gray-400 font-mono">({item.id.split('-')[0]})</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">{item.details}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Diajukan oleh: <strong className="text-gray-700 dark:text-gray-300">{item.requester}</strong> • {item.date}</p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.status === "PENDING" ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleAction(item.id, "APPROVED")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAction(item.id, "REJECTED")}
                          className="border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs px-3"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Tolak
                        </Button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {item.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {items.filter(it => it.category === "cash_diff").length === 0 && (
                <div className="text-center py-4 text-sm text-gray-400">Tidak ada pengajuan selisih kas.</div>
              )}
            </div>
          )}
        </Card>

        {/* Card C: Gudang Barang Bermasalah */}
        <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden p-6 transition-colors">
          <div 
            onClick={() => setExpandedCat(expandedCat === "warehouse" ? null : "warehouse")}
            className="flex justify-between items-center cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#2a303c] text-slate-600 flex items-center justify-center font-semibold text-sm">C</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Gudang (Barang Bermasalah)</h2>
                <p className="text-xs text-gray-400">Persetujuan pemusnahan atau klaim retur pabrik</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${getPendingCount("warehouse") > 0 ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200" : "bg-gray-100 dark:bg-[#2a303c] text-gray-500 dark:text-gray-400"}`}>
                {getPendingCount("warehouse")} Menunggu
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedCat === "warehouse" ? "rotate-180" : ""}`} />
            </div>
          </div>

          {expandedCat === "warehouse" && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50 space-y-3">
              {items.filter(it => it.category === "warehouse").map(item => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-[#1e2329] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{item.title}</span>
                      <span className="text-[11px] text-gray-400 font-mono">({item.id.split('-')[0]})</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">{item.details}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Diajukan oleh: <strong className="text-gray-700 dark:text-gray-300">{item.requester}</strong> • {item.date}</p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.status === "PENDING" ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleAction(item.id, "APPROVED")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAction(item.id, "REJECTED")}
                          className="border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs px-3"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Tolak
                        </Button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {item.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {items.filter(it => it.category === "warehouse").length === 0 && (
                <div className="text-center py-4 text-sm text-gray-400">Tidak ada persetujuan gudang.</div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
