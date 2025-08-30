import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function upsertSubscription({ endpoint, p256dh, auth, topics=['new-song'], locale, vapid_key_version='v1' }) {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { endpoint, p256dh, auth, topics, locale, vapid_key_version, last_seen_at: new Date().toISOString() },
      { onConflict: 'endpoint' }
    )
    .select('endpoint')
    .single();
  if (error) throw error;
  return data;
}

export async function listSubscriptionsByTopic(topic='new-song') {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .contains('topics', [topic]);
  if (error) throw error;
  return data || [];
}

export async function removeSubscriptionByEndpoint(endpoint) {
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
