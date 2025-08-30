import webpush from 'web-push';
import { withCORS } from '../_cors.js';
import { listSubscriptionsByTopic, removeSubscriptionByEndpoint } from '../../lib/db.js';

webpush.setVapidDetails(
  'mailto:admin@amusicadasegunda.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const DEFAULT_LOCALE = process.env.PUSH_DEFAULT_LOCALE || 'pt-BR';
const MESSAGES = {
  'pt-BR': { title: 'Música da Segunda', body: 'Nova música no ar 🎶' },
  'fr':    { title: 'Música da Segunda', body: 'Nouvelle chanson en ligne 🎶' },
  'en':    { title: 'Música da Segunda', body: 'New song is live 🎶' }
};

async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  const params = req.method === 'GET' ? {} : await readJSON(req);
  const locale = (params.locale || DEFAULT_LOCALE);
  const t = MESSAGES[locale] || MESSAGES['pt-BR'];
  
  const {
    title,
    body,
    url = '/playlist',
    tag = 'nova-musica',
    topic = 'new-song',
    icon,
    badge
  } = params;

  const payload = JSON.stringify({
    title: title ?? t.title,
    body:  body  ?? t.body,
    url, tag, icon, badge
  });

  const subs = await listSubscriptionsByTopic(topic);
  const results = await Promise.allSettled(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await removeSubscriptionByEndpoint(s.endpoint);
      } else {
        throw e;
      }
    }
  }));

  return res.json({ ok: true, sent: results.length });
}

async function readJSON(req){ const b=[]; for await (const c of req) b.push(c);
  return JSON.parse(Buffer.concat(b).toString('utf8')||'{}'); }

export default withCORS(handler);
