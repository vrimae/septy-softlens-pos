"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, RotateCw, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { unwrap, scopeBranch, withBranch, friendlyError, getActiveBranchId, getActiveProfileId } from "@/lib/supabase/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";

type CashRegister = {
  id: string;
  name: string;
  balance: number;
  is_expense_fund?: boolean;
  branch_id?: string;
  store_id?: string;
};

type CashFlow = {
  id: string;
  flow_type: string;
  category: string;
  description: string;
  amount: number;
  created_at: string;
  cash_registers?: { name: string; branch_id?: string };
};

export default function CashflowPage() {
  const { role } = useAuth();
  const isOwner = role === "owner";
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [flows, setFlows] = useState<CashFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT">("ALL");

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form
  const [registerName, setRegisterName] = useState("");

  // Flow Form
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [flowType, setFlowType] = useState("IN");
  const [flowCategory, setFlowCategory] = useState("PENJUALAN");
  const [flowAmount, setFlowAmount] = useState("");
  const [flowDescription, setFlowDescription] = useState("");

  // Mutasi Form
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
  const [mutasiFromId, setMutasiFromId] = useState("");
  const [mutasiToId, setMutasiToId] = useState("");
  const [mutasiAmount, setMutasiAmount] = useState("");
  const [mutasiDesc, setMutasiDesc] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const branchId = getActiveBranchId();

      // 1. Ambil data kantong kas (sesuai cabang aktif atau global/null)
      let regQuery = supabase.from('cash_registers').select('*').order('created_at');
      if (branchId) {
        regQuery = regQuery.or(`branch_id.eq.${branchId},branch_id.is.null`);
      }

      // 2. Ambil riwayat arus kas (sesuai cabang aktif atau global/null)
      let flowQuery = supabase
        .from('cash_flows')
        .select('*, cash_registers(name, branch_id)')
        .order('created_at', { ascending: false })
        .limit(150);
      if (branchId) {
        flowQuery = flowQuery.or(`branch_id.eq.${branchId},branch_id.is.null`);
      }

      const [regRes, flowRes] = await Promise.all([regQuery, flowQuery]);

      if (regRes.error) console.error("Error cash_registers:", regRes.error);
      if (flowRes.error) console.error("Error cash_flows:", flowRes.error);

      const regList = regRes.data || [];
      setRegisters(regList);
      if (regList.length > 0 && !selectedRegisterId) {
        setSelectedRegisterId(regList[0].id);
      }

      setFlows((flowRes.data as any) || []);
    } catch (err) {
      alert(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim()) return;
    setIsSubmitting(true);
    try {
      unwrap(await supabase.from('cash_registers').insert(withBranch({ name: registerName, balance: 0, is_active: true })));
      setIsRegisterModalOpen(false);
      setRegisterName("");
      await fetchData();
    } catch (err) {
      alert(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFlowModal = () => {
    if (registers.length > 0 && !selectedRegisterId) {
      setSelectedRegisterId(registers[0].id);
    }
    setFlowType("IN");
    setFlowCategory("PENJUALAN");
    setFlowAmount("");
    setFlowDescription("");
    setIsFlowModalOpen(true);
  };

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(flowAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Nominal harus lebih dari 0.");
      return;
    }

    let targetRegisterId = selectedRegisterId;
    if (!targetRegisterId && registers.length > 0) {
      targetRegisterId = registers[0].id;
    }
    if (!targetRegisterId) {
      alert("Pilih kantong kas terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const branchId = getActiveBranchId();
      const profileId = getActiveProfileId();

      let success = false;
      let lastError: any = null;

      // 1. Coba lewat RPC record_cash_flow terlebih dahulu
      try {
        const payload = {
          branch_id: branchId || undefined,
          cash_register_id: targetRegisterId,
          flow_type: flowType,
          category: flowCategory.trim().toUpperCase(),
          amount: amount,
          description: flowDescription.trim() || undefined,
          created_by: profileId || undefined
        };
        const res = await supabase.rpc('record_cash_flow', { p_payload: payload });
        if (!res.error) {
          success = true;
        } else {
          lastError = res.error;
          console.warn("RPC record_cash_flow error, falling back to direct update:", res.error);
        }
      } catch (rpcErr) {
        lastError = rpcErr;
        console.warn("RPC call error, falling back to direct update:", rpcErr);
      }

      // 2. Fallback: jika RPC gagal atau tidak ada, lakukan update saldo & insert langsung
      if (!success) {
        const { data: reg, error: regErr } = await supabase
          .from('cash_registers')
          .select('id, name, balance, store_id, branch_id')
          .eq('id', targetRegisterId)
          .single();

        if (regErr || !reg) {
          throw new Error(lastError ? friendlyError(lastError) : "Kantong kas tidak ditemukan.");
        }

        const currentBalance = Number(reg.balance) || 0;
        if (flowType === 'OUT' && currentBalance < amount) {
          throw new Error(`Saldo kantong kas (Rp ${currentBalance.toLocaleString('id-ID')}) tidak mencukupi untuk pengeluaran Rp ${amount.toLocaleString('id-ID')}.`);
        }

        const newBalance = flowType === 'IN' ? currentBalance + amount : currentBalance - amount;

        // Update saldo register
        const { error: updErr } = await supabase
          .from('cash_registers')
          .update({ balance: newBalance })
          .eq('id', targetRegisterId);
        if (updErr) throw updErr;

        // Insert catatan arus kas
        const flowInsert: any = {
          cash_register_id: targetRegisterId,
          flow_type: flowType,
          category: flowCategory.trim().toUpperCase(),
          amount: amount,
          description: flowDescription.trim() || null,
          created_by: profileId || null
        };
        if (branchId || reg.branch_id) flowInsert.branch_id = branchId || reg.branch_id;
        if (reg.store_id) flowInsert.store_id = reg.store_id;

        const { error: insErr } = await supabase
          .from('cash_flows')
          .insert(flowInsert);
        if (insErr) throw insErr;
      } else {
        // Jika RPC sukses, sinkronkan branch_id pada baris cash_flows terbaru jika belum ada
        if (branchId && targetRegisterId) {
          try {
            await supabase
              .from('cash_flows')
              .update({ branch_id: branchId })
              .eq('cash_register_id', targetRegisterId)
              .is('branch_id', null)
              .order('created_at', { ascending: false })
              .limit(1);
          } catch (e) {
            console.warn("Could not patch branch_id:", e);
          }
        }
      }

      setIsFlowModalOpen(false);
      setFlowAmount("");
      setFlowDescription("");
      await fetchData();
    } catch (err) {
      alert(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutasiFromId || !mutasiToId || !mutasiAmount || mutasiFromId === mutasiToId) {
      alert("Pilih kantong asal dan tujuan yang berbeda.");
      return;
    }
    const amount = parseFloat(mutasiAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Nominal mutasi harus lebih dari 0.");
      return;
    }
    setIsSubmitting(true);
    try {
      const branchId = getActiveBranchId();
      const userId = getActiveProfileId();

      let rpcSuccess = false;
      try {
        const resOut = await supabase.rpc('record_cash_flow', { 
          p_payload: {
            branch_id: branchId || undefined,
            cash_register_id: mutasiFromId,
            flow_type: "OUT",
            category: "MUTASI KELUAR",
            amount: amount,
            description: mutasiDesc.trim() || "Mutasi ke kantong tujuan",
            created_by: userId || undefined
          }
        });
        if (!resOut.error) {
          const resIn = await supabase.rpc('record_cash_flow', { 
            p_payload: {
              branch_id: branchId || undefined,
              cash_register_id: mutasiToId,
              flow_type: "IN",
              category: "MUTASI MASUK",
              amount: amount,
              description: mutasiDesc.trim() || "Mutasi dari kantong asal",
              created_by: userId || undefined
            }
          });
          if (!resIn.error) {
            rpcSuccess = true;
          }
        }
      } catch (e) {
        console.warn("RPC mutasi error, using direct fallback:", e);
      }

      if (!rpcSuccess) {
        const [fromRes, toRes] = await Promise.all([
          supabase.from('cash_registers').select('*').eq('id', mutasiFromId).single(),
          supabase.from('cash_registers').select('*').eq('id', mutasiToId).single()
        ]);
        if (fromRes.error || !fromRes.data) throw new Error("Kantong asal tidak ditemukan.");
        if (toRes.error || !toRes.data) throw new Error("Kantong tujuan tidak ditemukan.");

        const fromBal = Number(fromRes.data.balance) || 0;
        if (fromBal < amount) {
          throw new Error(`Saldo kantong asal (Rp ${fromBal.toLocaleString('id-ID')}) tidak cukup untuk mutasi Rp ${amount.toLocaleString('id-ID')}.`);
        }
        const toBal = Number(toRes.data.balance) || 0;

        unwrap(await supabase.from('cash_registers').update({ balance: fromBal - amount }).eq('id', mutasiFromId));
        unwrap(await supabase.from('cash_registers').update({ balance: toBal + amount }).eq('id', mutasiToId));

        const flowOut: any = {
          cash_register_id: mutasiFromId,
          flow_type: "OUT",
          category: "MUTASI KELUAR",
          amount: amount,
          description: mutasiDesc.trim() || `Mutasi ke ${toRes.data.name}`,
          created_by: userId || null
        };
        if (branchId || fromRes.data.branch_id) flowOut.branch_id = branchId || fromRes.data.branch_id;
        if (fromRes.data.store_id) flowOut.store_id = fromRes.data.store_id;

        const flowIn: any = {
          cash_register_id: mutasiToId,
          flow_type: "IN",
          category: "MUTASI MASUK",
          amount: amount,
          description: mutasiDesc.trim() || `Mutasi dari ${fromRes.data.name}`,
          created_by: userId || null
        };
        if (branchId || toRes.data.branch_id) flowIn.branch_id = branchId || toRes.data.branch_id;
        if (toRes.data.store_id) flowIn.store_id = toRes.data.store_id;

        unwrap(await supabase.from('cash_flows').insert([flowOut, flowIn]));
      }

      setIsMutasiModalOpen(false);
      setMutasiAmount("");
      setMutasiDesc("");
      await fetchData();
    } catch (err) {
      alert(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetExpenseFund = async (id: string) => {
    if (!confirm("Jadikan kantong ini sebagai Kas Pengeluaran Kasir? Semua catatan pengeluaran kasir akan langsung diambil dari kas ini.")) return;
    try {
      unwrap(await scopeBranch(supabase.from('cash_registers').update({ is_expense_fund: false }).eq('is_expense_fund', true)));
      unwrap(await supabase.from('cash_registers').update({ is_expense_fund: true }).eq('id', id));
      await fetchData();
    } catch (err) {
      alert(friendlyError(err));
    }
  };

  const openTopUp = (id: string) => {
    setSelectedRegisterId(id);
    setFlowType("IN");
    setFlowCategory("MODAL KAS PENGELUARAN");
    setFlowAmount("");
    setFlowDescription("Isi saldo kas pengeluaran kasir");
    setIsFlowModalOpen(true);
  };

  const handleDeleteRegister = async (id: string) => {
    if (!confirm("Hapus kantong kas ini? Semua riwayat yang terkait mungkin hilang atau memunculkan error.")) return;
    try {
      await supabase.from('cash_registers').delete().eq('id', id);
      await fetchData();
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  const filteredFlows = flows.filter(f => {
    if (filterType === "ALL") return true;
    return f.flow_type === filterType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Buku Kas & Kantong Kas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Pantau pergerakan uang masuk, pengeluaran operasional, dan mutasi saldo.</p>
        </div>
        <div className="flex gap-2.5 sm:gap-3 flex-wrap">
          {isOwner && (
            <Button onClick={() => setIsRegisterModalOpen(true)} variant="outline" className="bg-white dark:bg-[#13151a] hover:bg-gray-50 dark:hover:bg-[#2a303c] font-semibold shadow-sm border-gray-200 dark:border-gray-800">
              + Kantong Baru
            </Button>
          )}
          <Button onClick={() => setIsMutasiModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm px-4">
            <ArrowLeftRight className="h-4 w-4 mr-1.5" /> Mutasi Kas
          </Button>
          <Button onClick={openFlowModal} className="bg-[#9333ea] hover:bg-purple-700 text-white font-semibold shadow-sm px-4">
            + Catat Arus Kas
          </Button>
        </div>
      </div>

      {/* Daftar Kartu Kantong Kas */}
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2">
        {registers.length === 0 && !loading && (
          <div className="text-gray-400 py-10 w-full text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            Belum ada kantong kas. Buat kantong baru terlebih dahulu.
          </div>
        )}
        
        {registers.map(reg => (
          <Card key={reg.id} className={`min-w-[280px] sm:min-w-[300px] rounded-xl shadow-sm overflow-hidden relative border ${reg.is_expense_fund ? "border-purple-300 dark:border-purple-800" : "border-emerald-200 dark:border-emerald-800"}`}>
            <CardContent className="p-5 sm:p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">{reg.name}</h3>
                  {reg.is_expense_fund && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      KAS PENGELUARAN KASIR
                    </span>
                  )}
                </div>
                {isOwner && (
                  <button onClick={() => handleDeleteRegister(reg.id)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 font-mono">
                Rp {Number(reg.balance || 0).toLocaleString("id-ID")}
              </div>
              {isOwner && !reg.is_expense_fund && (
                <Button size="sm" variant="outline" onClick={() => handleSetExpenseFund(reg.id)} className="text-xs font-semibold w-full">
                  Jadikan Kas Pengeluaran Kasir
                </Button>
              )}
              {reg.is_expense_fund && (
                <Button size="sm" onClick={() => openTopUp(reg.id)} className="text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white w-full">
                  + Isi Saldo Kas
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabel Histori Transaksi Kas */}
      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-[#1e2329]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Histori Transaksi Kas</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Catatan seluruh arus kas masuk, pengeluaran, dan mutasi saldo.</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex bg-gray-200 dark:bg-[#2a303c] p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterType === "ALL" ? "bg-white dark:bg-[#13151a] text-gray-900 dark:text-gray-100 shadow-xs" : "text-gray-600 dark:text-gray-400"}`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterType("IN")}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterType === "IN" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 dark:text-gray-400"}`}
              >
                Masuk (+)
              </button>
              <button
                type="button"
                onClick={() => setFilterType("OUT")}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterType === "OUT" ? "bg-red-600 text-white shadow-xs" : "text-gray-600 dark:text-gray-400"}`}
              >
                Keluar (-)
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="text-xs font-semibold h-8"
              title="Segarkan data arus kas"
            >
              <RotateCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-white dark:bg-[#13151a] hover:bg-white dark:bg-[#13151a] border-b border-gray-100 dark:border-gray-800/50">
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-3.5 px-6">Waktu</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-3.5 px-6 text-center">Kantong Kas</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-3.5 px-6 text-center">Kategori</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-3.5 px-6">Keterangan</TableHead>
              <TableHead className="font-bold text-gray-700 dark:text-gray-300 py-3.5 px-6 text-right">Nominal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-500">Memuat catatan arus kas...</TableCell></TableRow>
            ) : filteredFlows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-16 text-gray-500 dark:text-gray-400 font-medium border-b-0">Belum ada catatan arus kas.</TableCell></TableRow>
            ) : (
              filteredFlows.map(f => (
                <TableRow key={f.id} className="border-b border-gray-50 dark:border-gray-900/40 hover:bg-gray-50/60 dark:hover:bg-[#1e2329]/40">
                  <TableCell className="px-6 py-3.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap font-mono">
                    {new Date(f.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </TableCell>
                  <TableCell className="px-6 py-3.5 text-center font-bold text-gray-800 dark:text-gray-200 text-xs">
                    {f.cash_registers?.name || '-'}
                  </TableCell>
                  <TableCell className="px-6 py-3.5 text-center">
                    <span className="text-[11px] font-bold bg-gray-100 dark:bg-[#2a303c] text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                      {f.category}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-3.5 text-gray-600 dark:text-gray-300 text-xs">
                    {f.description || '-'}
                  </TableCell>
                  <TableCell className={`px-6 py-3.5 text-right font-bold font-mono text-sm whitespace-nowrap ${f.flow_type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    <span className="inline-flex items-center gap-1">
                      {f.flow_type === 'IN' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {f.flow_type === 'IN' ? '+' : '-'} Rp {Number(f.amount || 0).toLocaleString("id-ID")}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Kantong Baru */}
      <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Kantong Kas Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRegister} className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Kantong Kas</label>
              <input required type="text" placeholder="Cth: Laci Kasir 1 / Rekening BCA" value={registerName} onChange={e => setRegisterName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRegisterModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-blue-600 text-white" disabled={isSubmitting}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Catat Arus Kas */}
      <Dialog open={isFlowModalOpen} onOpenChange={setIsFlowModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[460px]">
          <DialogHeader><DialogTitle>Catat Arus Kas Manual</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateFlow} className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Pilih Kantong Kas</label>
              <select required value={selectedRegisterId} onChange={e => setSelectedRegisterId(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1a1f26]">
                <option value="">-- Pilih Kantong Kas --</option>
                {registers.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Saldo: Rp {Number(r.balance || 0).toLocaleString("id-ID")})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Jenis</label>
                <select value={flowType} onChange={e => setFlowType(e.target.value)} className="w-full px-3 py-2 border rounded-lg font-bold bg-white dark:bg-[#1a1f26]">
                  <option value="IN">Uang Masuk (+)</option>
                  <option value="OUT">Uang Keluar (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                <input required type="text" value={flowCategory} onChange={e => setFlowCategory(e.target.value)} placeholder="Cth: BIAYA LISTRIK" className="w-full px-3 py-2 border rounded-lg uppercase bg-white dark:bg-[#1a1f26]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nominal (Rp)</label>
              <input required type="number" min="1" value={flowAmount} onChange={e => setFlowAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-lg font-semibold text-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-[#1a1f26]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Keterangan Tambahan</label>
              <input required type="text" value={flowDescription} onChange={e => setFlowDescription(e.target.value)} placeholder="Cth: Beli pulsa listrik bulan agustus" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1a1f26]" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFlowModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-[#9333ea] text-white hover:bg-purple-700 font-bold" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Arus Kas"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Mutasi Kas */}
      <Dialog open={isMutasiModalOpen} onOpenChange={setIsMutasiModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[460px]">
          <DialogHeader><DialogTitle>Mutasi Antar Kantong Kas</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateMutasi} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Dari Kantong (Keluar)</label>
                <select required value={mutasiFromId} onChange={e => setMutasiFromId(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1a1f26]">
                  <option value="">-- Pilih --</option>
                  {registers.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (Rp {Number(r.balance || 0).toLocaleString("id-ID")})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Ke Kantong (Masuk)</label>
                <select required value={mutasiToId} onChange={e => setMutasiToId(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1a1f26]">
                  <option value="">-- Pilih --</option>
                  {registers.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Jumlah Mutasi</label>
              <input required type="number" min="1" value={mutasiAmount} onChange={e => setMutasiAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1a1f26]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Keterangan (Opsional)</label>
              <input type="text" value={mutasiDesc} onChange={e => setMutasiDesc(e.target.value)} placeholder="Contoh: Setor ke brankas utama" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1a1f26]" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsMutasiModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {isSubmitting ? 'Memproses...' : 'Transfer Sekarang'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
