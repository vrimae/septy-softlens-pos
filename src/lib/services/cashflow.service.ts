import { auditService } from "./audit.service";
// ==============================================================================
// FILE: src/lib/services/cashflow.service.ts
// DESCRIPTION: Cash Registers, Cash Transactions & Shift Closings Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
import { CashRegister, CashFlow } from './types';

export const cashflowService = {
  /**
   * Mengambil daftar mesin kasir
   */
  async getCashRegisters() {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);
    return (data || []) as CashRegister[];
  },

  /**
   * Mengambil arus kas masuk / keluar
   */
  async getCashFlows(options?: { flow_type?: 'IN' | 'OUT'; limit?: number }) {
    let query = supabase
      .from('cash_flows')
      .select(`
        *,
        register:cash_registers(name)
      `)
      .order('created_at', { ascending: false });

    if (options?.flow_type) {
      query = query.eq('flow_type', options.flow_type);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as CashFlow[];
  },

  /**
   * Catat pemasukan / pengeluaran kas (petty cash)
   */
  async createCashFlow(payload: {
    register_id?: string | null;
    cash_register_id?: string | null;
    flow_type: 'IN' | 'OUT';
    category: string;
    amount: number;
    description?: string;
  }) {
    const regId = payload.cash_register_id || payload.register_id || null;
    const { data, error } = await supabase
      .from('cash_flows')
      .insert({
        cash_register_id: regId,
        flow_type: payload.flow_type,
        category: payload.category,
        amount: payload.amount,
        description: payload.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating cash flow:', error);
      throw new Error(error.message);
    }

    return data as CashFlow;
  },

  /**
   * Tutup kasir / shift harian via RPC close_cash_shift
   */
  async closeShift(actualCash: number, notes?: string) {
    const { data, error } = await supabase.rpc('close_cash_shift', {
      p_payload: {
        actual_cash: actualCash,
        notes: notes || '',
      },
    });

    if (error) {
      console.error('Error closing cash shift:', error);
      throw new Error(error.message || 'Gagal melakukan tutup kasir.');
    }

    return data as {
      success: boolean;
      shift_id: string;
      system_cash: number;
      actual_cash: number;
      difference: number;
      status: 'SEIMBANG' | 'SELISIH_LEBIH' | 'SELISIH_KURANG';
    };
  },

  /**
   * Mengambil riwayat tutup kasir
   */
  async getShiftClosings(limit?: number) {
    let query = supabase
      .from('shift_closings')
      .select(`
        *,
        cashier:profiles(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((item: any) => ({
      ...item,
      closed_at: item.shift_end || item.created_at,
      system_expected_cash: item.system_cash,
      physical_counted_cash: item.actual_cash,
      difference_amount: item.difference,
    }));
  }
};
