// ==============================================================================
// FILE: src/lib/services/customers.service.ts
// DESCRIPTION: Customers & Prescription Notes Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
import { Customer } from './types';
import { withBranch } from '@/lib/supabase/db';

export const customersService = {
  /**
   * Mengambil daftar pelanggan (bisa difilter pencarian nama/telepon)
   */
  async getCustomers(search?: string) {
    let query = supabase
      .from('customers')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching customers:', error);
      throw new Error(error.message);
    }

    return (data || []) as Customer[];
  },

  /**
   * Mengambil detail pelanggan berdasarkan ID
   */
  async getCustomerById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  },

  /**
   * Tambah pelanggan baru
   */
  async createCustomer(customer: Partial<Customer>) {
    const payload = withBranch({
      name: customer.name?.trim() || 'Pelanggan Baru',
      phone: customer.phone ? customer.phone.trim() : null,
      address: customer.address ? customer.address.trim() : null,
      customer_level: (customer as any).customer_level || 'REGULER',
      points: customer.points || 0,
      prescription_notes: (customer as any).prescription_notes || (customer as any).prescription_data || {
        r_sphere: 0, r_cyl: 0, r_axis: 0, l_sphere: 0, l_cyl: 0, l_axis: 0, pd: 0
      },
    });

    const { data, error } = await supabase
      .from('customers')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      throw new Error(error.message);
    }

    return data as Customer;
  },

  /**
   * Perbarui profil pelanggan atau catatan resep
   */
  async updateCustomer(id: string, customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  },

  /**
   * Hapus data pelanggan
   */
  async deleteCustomer(id: string) {
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
};
