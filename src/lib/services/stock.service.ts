import { auditService } from "./audit.service";
// ==============================================================================
// FILE: src/lib/services/stock.service.ts
// DESCRIPTION: Stock Management & Inventory Ledger Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';

export const stockService = {
  /**
   * Eksekusi Stock Opname / Penyesuaian stok via RPC adjust_stock
   */
  async adjustStock(variantId: string, physicalQty: number, reason: string) {
    const { data, error } = await supabase.rpc('adjust_stock', {
      p_variant_id: variantId,
      p_physical_qty: physicalQty,
      p_reason: reason,
    });

    if (error) {
      console.error('Error adjusting stock:', error);
      throw new Error(error.message || 'Gagal menyesuaikan stok.');
    }

    return data;
  },

  /**
   * Mengambil riwayat mutasi stok (Ledger append-only)
   */
  async getStockMovements(params?: { variantId?: string; limit?: number }) {
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(id, name, product_code),
        variant:product_variants(id, variant_name, sku)
      `)
      .order('created_at', { ascending: false });

    if (params?.variantId) {
      query = query.eq('variant_id', params.variantId);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Mengambil daftar produk yang stoknya di bawah batas minimum
   */
  async getLowStockProducts() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name),
        brand:brands(name),
        variants:product_variants(*)
      `)
      .eq('is_active', true)
      .filter('stock_global', 'lte', 'min_stock')
      .order('stock_global', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }
};
