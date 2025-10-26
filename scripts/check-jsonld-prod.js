// Node >= 18 required (global fetch)
const TS = Date.now();
const URLs = [
  { url: "https://www.amusicadasegunda.com/", expect: ["WebSite","Organization"] },
  { url: "https://www.amusicadasegunda.com/playlist/", expect: ["MusicPlaylist"] },
  { url: "https://www.amusicadasegunda.com/chansons/debaixo-da-pia/", expect: ["MusicRecording"] }
];

// Regex simple pour extraire <script type="application/ld+json">...</script>
const reJSONLD = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function collectTypesFromJson(any) {
  const arr = Array.isArray(any) ? any : [any];
  const types = new Set();
  for (const obj of arr) {
    if (obj && obj['@type']) {
      (Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']]).forEach(t=>types.add(String(t)));
    }
  }
  return types;
}

async function fetchNoCache(u) {
  let res = await fetch(u, {
    redirect: 'follow',
    headers: {
      'cache-control': 'no-cache, no-store, max-age=0',
      'pragma': 'no-cache'
    }
  });
  if (res.ok) return res;
  const u2 = u.includes('?') ? `${u}&v=${TS}` : `${u}?v=${TS}`;
  return fetch(u2, {
    redirect: 'follow',
    headers: {
      'cache-control': 'no-cache, no-store, max-age=0',
      'pragma': 'no-cache'
    }
  });
}

(async () => {
  let failures = [];
  for (const { url, expect } of URLs) {
    const res = await fetchNoCache(url);
    const html = await res.text();

    let match, found = new Set();
    while ((match = reJSONLD.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        const types = collectTypesFromJson(json);
        types.forEach(t => found.add(t));
      } catch {}
    }

    const missing = expect.filter(t => !found.has(t));
    console.log(`${url} -> types: ${[...found].join(', ') || '(none)'} | status ${res.status}`);
    if (missing.length) failures.push(`${url}: missing ${missing.join(', ')}`);
  }
  if (failures.length) {
    console.error('\n❌ JSON-LD check failed:\n- ' + failures.join('\n- '));
    process.exit(1);
  } else {
    console.log('\n✅ JSON-LD OK (expected types present, cache bypassed)');
  }
})();


