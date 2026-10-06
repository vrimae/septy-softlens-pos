import { supabase } from '../supabase/client';

export const auditService = {
  async log(activity: string, details?: { tableName?: string, recordId?: string, before?: any, after?: any, reason?: string }) {
    try {
      let userId = null;
      
      if (typeof window !== 'undefined') {
        const profileStr = localStorage.getItem('septy_active_profile');
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          userId = profile.id;
        } else {
          const { data } = await supabase.auth.getSession();
          userId = data?.session?.user?.id;
        }
      }

      await supabase.from('audit_logs').insert({
        user_id: userId,
        activity,
        table_name: details?.tableName,
        record_id: details?.recordId,
        data_before: details?.before,
        data_after: details?.after,
        reason: details?.reason
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  },

  async getLogs() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, profiles(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (error) throw error;
    return data;
  }
};
