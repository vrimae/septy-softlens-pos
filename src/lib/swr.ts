import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';

/**
 * Universal fetcher for Supabase queries.
 * SWR Key format: ['table_name', 'select_query', { eq: { col: 'val' } }]
 */
export const supabaseFetcher = async (args: any[]) => {
  const [table, selectQuery, options] = args;
  let query = supabase.from(table).select(selectQuery || '*');
  
  if (options?.eq) {
    for (const [col, val] of Object.entries(options.eq)) {
      query = query.eq(col, val);
    }
  }
  if (options?.order) {
    for (const [col, opts] of Object.entries(options.order)) {
      query = query.order(col, opts as any);
    }
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};
