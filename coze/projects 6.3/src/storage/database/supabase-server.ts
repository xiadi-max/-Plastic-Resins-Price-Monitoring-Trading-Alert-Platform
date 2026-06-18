import { createClient } from '@supabase/supabase-js';
import { getSupabaseCredentials, getSupabaseServiceRoleKey } from './supabase-client';

// 创建 Admin 客户端（使用 service role key）
const { url } = getSupabaseCredentials();
const serviceRoleKey = getSupabaseServiceRoleKey();

if (!url || !serviceRoleKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  db: {
    timeout: 60000,
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
