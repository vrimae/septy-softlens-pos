// ==============================================================================
// FILE: src/lib/services/sales.service.ts
// DESCRIPTION: Sales & POS Service Layer (Direct PL/pgSQL RPC Calls)
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
import { CreateSalePayload, Sale } from './types';

export const salesService = {
  /**
   * Eksekusi transaksi penjualan kasir secara atomik via RPC PostgreSQL create_sale
   */
  async createSale(payload: CreateSalePayload) {
    try {
      const { data, error } = await supabase.rpc('create_sale', {
        p_payload: payload,
      });

      if (error) {
        console.error('Error executing create_sale RPC:', error);
        throw new Error(error.message || 'Gagal memproses transaksi penjualan.');
      }

      return data as {
        success: boolean;
        sale_id: string;
        invoice_number: string;
        subtotal: number;
        discount_amount: number;
        tax_amount: number;
        total_amount: number;
        total_paid: number;
        change_amount: number;
        payment_method: string;
        created_at: string;
      };
    } catch (err: any) {
      console.error('salesService.createSale exception:', err);
      throw err;
    }
  },

  /**
   * Batalkan transaksi penjualan (Khusus Owner/Admin)
   */
  async cancelSale(saleId: string, reason: string) {
    const { data, error } = await supabase.rpc('cancel_sale', {
      p_sale_id: saleId,
      p_reason: reason,
    });

    if (error) {
      console.error('Error executing cancel_sale RPC:', error);
      throw new Error(error.message || 'Gagal membatalkan transaksi.');
    }

    return data;
  },

  /**
   * Ambil daftar riwayat transaksi penjualan
   */
  async getSales(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    let query = supabase
      .from('sales')
      .select(`
        *,
        customer:customers(id, name, phone),
        sale_items(
          id, product_name_snapshot, sku_snapshot, qty, unit_price, subtotal
        ),
        sale_payments(
          id, payment_method, amount, reference_number, created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.search) {
      query = query.ilike('invoice_number', `%${options.search}%`);
    }
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching sales:', error);
      throw new Error(error.message);
    }

    return (data || []) as Sale[];
  },

  /**
   * Ambil detail transaksi berdasarkan ID
   */
  async getSaleById(id: string) {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customer:customers(id, name, phone, email, notes),
        sale_items(
          *,
          product:products(id, name, product_code)
        ),
        sale_payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching sale by id:', error);
      throw new Error(error.message);
    }

    return data as Sale;
  },

  /**
   * Simpan transaksi yang ditahan (Hold Transaction)
   */
  async holdSale(payload: {
    hold_name: string;
    cart_data: any[];
    customer_id?: string | null;
    notes?: string;
  }) {
    const { data, error } = await supabase.from('held_sales').insert({
      hold_name: payload.hold_name,
      cart_data: payload.cart_data,
      customer_id: payload.customer_id,
      notes: payload.notes,
    }).select().single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Ambil daftar transaksi yang sedang ditahan
   */
  async getHeldSales() {
    const { data, error } = await supabase
      .from('held_sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Hapus transaksi ditahan setelah dilanjutkan atau dibatalkan
   */
  async deleteHeldSale(id: string) {
    const { error } = await supabase.from('held_sales').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
};
