// ==============================================================================
// FILE: src/lib/services/returns.service.ts
// DESCRIPTION: Returns & Product Exchanges Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';

export const returnsService = {
  async getReturns() {
    const { data, error } = await supabase
      .from('returns')
      .select(`
        *,
        customer:customers(name, phone),
        sale:sales(invoice_number),
        items:return_items(
          *,
          original_variant:product_variants!return_items_original_variant_id_fkey(variant_name),
          exchange_variant:product_variants!return_items_exchange_variant_id_fkey(variant_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching returns:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  async createReturn(payload: {
    sale_id?: string;
    customer_id?: string;
    return_type: 'EXCHANGE' | 'REFUND';
    price_difference?: number;
    items: Array<{
      original_variant_id: string;
      exchange_variant_id?: string;
      qty: number;
      reason: string;
      is_damaged: boolean;
    }>;
  }) {
    // 1. Insert header return
    const returnNumber = `RTN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const { data: ret, error: retError } = await supabase
      .from('returns')
      .insert({
        return_number: returnNumber,
        sale_id: payload.sale_id || null,
        customer_id: payload.customer_id || null,
        return_type: payload.return_type,
        price_difference: payload.price_difference || 0,
        status: 'COMPLETED',
      })
      .select()
      .single();

    if (retError) throw new Error(retError.message);

    // 2. Insert items
    const returnItems = payload.items.map(item => ({
      return_id: ret.id,
      original_variant_id: item.original_variant_id,
      exchange_variant_id: item.exchange_variant_id || null,
      qty: item.qty,
      reason: item.reason,
      is_damaged: item.is_damaged,
    }));

    const { error: itemsError } = await supabase
      .from('return_items')
      .insert(returnItems);

    if (itemsError) throw new Error(itemsError.message);

    return ret;
  }
};
