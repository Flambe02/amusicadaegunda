import { onCLS, onFCP, onLCP, onINP, onTTFB } from 'web-vitals';

type Metric = { name: string; value: number; id: string; rating?: string; delta?: number };

const send = (m: Metric) => {
  // Dev: log; Prod: easy to switch to POST to a Supabase edge endpoint
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[WebVital]', m.name, m.value, m.id);
  }
};

// Web Vitals v5.x API - onFID remplacé par onFCP
onCLS(send);
onFCP(send);
onLCP(send);
onINP(send);
onTTFB(send);
