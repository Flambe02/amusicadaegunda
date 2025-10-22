const SITE = "https://www.amusicadasegunda.com";
const NEED = [
  `${SITE}/`,
  `${SITE}/playlist/`,
  `${SITE}/chansons/debaixo-da-pia/`
];

(async () => {
  const res = await fetch(`${SITE}/sitemap.xml?ts=${Date.now()}`, {
    redirect: 'follow',
    headers: {
      'cache-control': 'no-cache, no-store, max-age=0',
      'pragma': 'no-cache'
    }
  });
  if (!res.ok) {
    console.error(`❌ Cannot fetch sitemap.xml: HTTP ${res.status}`);
    process.exit(1);
  }
  const xml = await res.text();
  const missing = NEED.filter(u => !xml.includes(`<loc>${u}</loc>`));
  console.log('sitemap length:', xml.length, '| status', res.status);
  if (missing.length) {
    console.error('❌ Missing URLs in sitemap:\n- ' + missing.join('\n- '));
    process.exit(1);
  } else {
    console.log('✅ sitemap contains all key URLs');
  }
})();


