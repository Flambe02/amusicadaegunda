import { onCLS, onFCP, onLCP, onINP, onTTFB } from 'web-vitals';

type Metric = { name: string; value: number; id: string; rating?: string; delta?: number };

const send = (m: Metric) => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.info('[WebVital]', m.name, m.value, m.id);
  }
  if (import.meta.env?.PROD && typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', m.name, {
      event_category: 'Web Vitals',
      event_label: m.id,
      value: Math.round(m.name === 'CLS' ? m.value * 1000 : m.value),
      non_interaction: true,
    });
  }
};

// Web Vitals v5.x API - onFID remplacé par onFCP
onCLS(send);
onFCP(send);
onLCP(send);
onINP(send);
onTTFB(send);
