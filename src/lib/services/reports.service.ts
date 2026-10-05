// ==============================================================================
// FILE: src/lib/services/reports.service.ts
// DESCRIPTION: Reports, Financial Aggregations & AI Restock Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';

export const reportsService = {
  /**
   * Mengambil metrik ringkasan dashboard owner (omzet, profit, transaksi)
   */
  async getDashboardMetrics() {
    try {
      const { data, error } = await supabase.rpc('get_owner_dashboard_metrics');
      if (error) {
        console.warn('Fallback metrics query due to RPC note:', error.message);
        // Fallback aggregation if RPC is still warming up
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, total_cost, subtotal, discount_amount, payment_method')
          .eq('status', 'COMPLETED');

        const gross_sales = sales?.reduce((s, x) => s + Number(x.total_amount || 0), 0) || 0;
        const cogs = sales?.reduce((s, x) => s + Number(x.total_cost || 0), 0) || 0;
        const gross_profit = gross_sales - cogs;
        const total_transactions = sales?.length || 0;

        return {
          gross_sales,
          cogs,
          gross_profit,
          operating_expenses: 0,
          net_profit: gross_profit,
          total_transactions,
          avg_basket_size: total_transactions > 0 ? gross_sales / total_transactions : 0,
          total_items_sold: 0,
          cash_collected: gross_sales,
          non_cash_collected: 0,
        };
      }
      return data;
    } catch (err: any) {
      console.error('getDashboardMetrics exception:', err);
      return {
        gross_sales: 0,
        cogs: 0,
        gross_profit: 0,
        operating_expenses: 0,
        net_profit: 0,
        total_transactions: 0,
        avg_basket_size: 0,
        total_items_sold: 0,
        cash_collected: 0,
        non_cash_collected: 0,
      };
    }
  },

  /**
   * Mengambil laporan komprehensif (Penjualan, Laba Bersih, Arus Kas)
   */
  async getComprehensiveReport(startDate?: string, endDate?: string, branchId?: string) {
    const params: any = {};
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;
    if (branchId) params.p_branch_id = branchId;

    const { data, error } = await supabase.rpc('get_comprehensive_report', params);
    if (error) {
      console.error('Error fetching comprehensive report:', error);
      throw new Error(error.message);
    }
    return data;
  },

  /**
   * Mengambil rekomendasi restock berbasis analitik AI
   */
  async getAiRestockRecommendations() {
    const { data, error } = await supabase.rpc('get_ai_restock_recommendations');
    if (error) {
      console.error('Error fetching AI restock:', error);
      // Fallback query to low stock products
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .filter('stock_global', 'lte', 'min_stock');
      return (prods || []).map(p => ({
        product_code: p.product_code,
        product_name: p.name,
        current_stock: p.stock_global,
        min_stock: p.min_stock,
        sold_last_30_days: 0,
        suggested_order_qty: Math.max(10, p.min_stock * 2 - p.stock_global),
        priority: p.stock_global <= 0 ? 'HABIS' : 'KRITIS',
      }));
    }
    return data || [];
  },

  /**
   * Mengambil produk slow moving (minim pergerakan dalam N hari)
   */
  async getSlowMovingProducts(days: number = 30) {
    const { data, error } = await supabase.rpc('get_slow_moving_products', {
      p_days: days,
    });
    if (error) {
      console.error('Error fetching slow moving:', error);
      return [];
    }
    return data || [];
  }
};
