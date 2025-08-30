import { withCORS } from '../_cors.js';
import { removeSubscriptionByEndpoint } from '../../lib/db.js';

async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const body = await readJSON(req);
  const { endpoint } = body || {};
  if (!endpoint) return res.status(400).json({ error: 'missing endpoint' });
  await removeSubscriptionByEndpoint(endpoint);
  return res.json({ ok: true });
}

async function readJSON(req){ const b=[]; for await (const c of req) b.push(c);
  return JSON.parse(Buffer.concat(b).toString('utf8')||'{}'); }

export default withCORS(handler);
