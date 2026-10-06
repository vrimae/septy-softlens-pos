import { auditService } from "./audit.service";
// ==============================================================================
// FILE: src/lib/services/purchases.service.ts
// DESCRIPTION: Purchases & Supplier Debt Management Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
import { CreatePurchasePayload } from './types';

export const purchasesService = {
  /**
   * Mengambil riwayat pesanan pembelian (PO)
   */
  async getPurchases(status?: string) {
    let query = supabase
      .from('purchases')
      .select(`
        *,
        supplier:suppliers(id, name, code, contact_person),
        purchase_items(
          id, qty, cost_price, subtotal,
          variant:product_variants(id, variant_name, sku)
        ),
        purchase_payments(*)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching purchases:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Mengambil detail pembelian berdasarkan ID
   */
  async getPurchaseById(id: string) {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        supplier:suppliers(*),
        purchase_items(
          *,
          variant:product_variants(*)
        ),
        purchase_payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Buat Purchase Order (PO) baru
   */
  async createPurchase(payload: CreatePurchasePayload) {
    // 1. Hitung total
    const totalAmount = payload.items.reduce((sum, item) => sum + (item.qty * item.cost_price), 0);
    const paidAmount = payload.payment?.paid_amount || 0;
    const paymentStatus = paidAmount >= totalAmount ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID');

    // 2. Insert PO header
    const { data: po, error: poError } = await supabase
      .from('purchases')
      .insert({
        supplier_id: payload.supplier_id,
        branch_id: payload.branch_id || null,
        po_number: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
        status: 'ORDERED',
        total_amount: totalAmount,
        paid_amount: paidAmount,
        debt_amount: Math.max(0, totalAmount - paidAmount),
        payment_status: paymentStatus,
        notes: payload.notes || null,
      })
      .select()
      .single();

    if (poError) {
      console.error('Error creating purchase order:', poError);
      throw new Error(poError.message);
    }

    // 3. Insert PO Items
    const itemsToInsert = payload.items.map(item => ({
      purchase_id: po.id,
      variant_id: item.variant_id,
      qty: item.qty,
      cost_price: item.cost_price,
      subtotal: item.qty * item.cost_price,
      received_qty: 0,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error inserting purchase items:', itemsError);
    }

    // 4. Catat pembayaran uang muka jika ada
    if (paidAmount > 0 && payload.payment) {
      await supabase.from('purchase_payments').insert({
        purchase_id: po.id,
        amount: paidAmount,
        payment_method: payload.payment.payment_method,
        reference_number: payload.payment.reference_number || null,
      });
    }

    return po;
  },

  /**
   * Terima barang pesanan pembelian & perbarui stok + HPP secara atomik via RPC
   */
  async receivePurchase(purchaseId: string) {
    const { data, error } = await supabase.rpc('receive_purchase', {
      p_purchase_id: purchaseId,
    });

    if (error) {
      console.error('Error receiving purchase:', error);
      throw new Error(error.message || 'Gagal memproses penerimaan barang.');
    }

    return data;
  },

  /**
   * Bayar hutang pembelian ke supplier via RPC
   */
  async payPurchaseDebt(purchaseId: string, amount: number, paymentMethod: string = 'Transfer Bank') {
    const { data, error } = await supabase.rpc('pay_purchase_debt', {
      p_purchase_id: purchaseId,
      p_amount: amount,
      p_payment_method: paymentMethod,
    });

    if (error) {
      console.error('Error paying purchase debt:', error);
      throw new Error(error.message || 'Gagal mencatat pembayaran hutang.');
    }

    return data;
  }
};
