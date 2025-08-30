import { withCORS } from '../_cors.js';
import { upsertSubscription } from '../../lib/db.js';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = await readJSON(req);
  const { subscription, topic='new-song', locale, vapidKeyVersion='v1' } = body || {};

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'bad subscription' });
  }

  await upsertSubscription({
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    topics: [topic],
    locale,
    vapid_key_version: vapidKeyVersion
  });

  return res.json({ ok: true });
}

async function readJSON(req){ const b=[]; for await (const c of req) b.push(c);
  return JSON.parse(Buffer.concat(b).toString('utf8')||'{}'); }

export default withCORS(handler);
