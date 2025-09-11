import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing URL or ANON key');
}
export const supabase = createClient(ENV.SUPABASE_URL!, ENV.SUPABASE_ANON_KEY!, {
  auth: { persistSession: true },
});
