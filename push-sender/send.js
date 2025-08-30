import 'dotenv/config';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  DEFAULT_LOCALE = 'pt-BR',
} = process.env;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing env: SUPABASE_URL, SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
webpush.setVapidDetails('mailto:admin@amusicadasegunda.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const arg = (name, def) => {
  const i = process.argv.findIndex(a => a === `--${name}`);
  return i > -1 ? (process.argv[i + 1] ?? '') : def;
};

// Defaults pt-BR
const title = arg('title', 'Música da Segunda');
const body  = arg('body',  DEFAULT_LOCALE === 'pt-BR' ? 'Nova música no ar 🎶' : 'New song is live 🎶');
const url   = arg('url',   '/playlist');
const tag   = arg('tag',   'nova-musica');
const topic = arg('topic', 'new-song');

const { data: subs, error } = await supabase
  .from('push_subscriptions')
  .select('endpoint,p256dh,auth')
  .contains('topics', [topic]);

if (error) {
  console.error('DB error:', error);
  process.exit(1);
}

const payload = JSON.stringify({ title, body, url, tag });

let sent = 0, purged = 0;
for (const s of subs ?? []) {
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      payload
    );
    sent++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      purged++;
    } else {
      console.error('Send error:', e.statusCode || e.message);
    }
  }
}

console.log(JSON.stringify({ ok: true, subs: subs?.length || 0, sent, purged }, null, 2));
