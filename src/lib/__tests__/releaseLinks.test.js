import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'jwt' } } })) } },
}));

import { normalizeTitle, titleScore, pickBestMatch, appleSongUrl, findReleaseLinks } from '../releaseLinks';

// Titres réels relevés le 2026-11-15 sur la chaîne YouTube et l'API iTunes.
const SHORTS = [
  { title: 'Mister Veto 🤠 #trump #bolsonaro #lula #musk #usa #f1 #eleições2026', url: 'https://www.youtube.com/shorts/2r2e7EebXB0', date: '2026-11-08T13:03:28+00:00' },
  { title: '# 15 de Novembro 🇧🇷👑 | A Música da Segunda #feriado #1889 #governo @portugal #dompedro', url: 'https://www.youtube.com/shorts/Po7ukRmaj58', date: '2026-11-15T13:00:00+00:00' },
  { title: '🎵 13 Presidente #lula #flaviobolsonaro #trump #halloween #eleições2026 #usa', url: 'https://www.youtube.com/shorts/Iuvt50SJ83I', date: '2026-11-01T02:31:01+00:00' },
];

describe('rapprochement titre ↔ sortie', () => {
  it('normalise hashtags, emojis, accents et « | suite »', () => {
    expect(normalizeTitle(SHORTS[0].title)).toBe('mister veto');
    expect(normalizeTitle(SHORTS[1].title)).toBe('15 de novembro');
    expect(normalizeTitle('Tá Chovendo de Novo!')).toBe('ta chovendo de novo');
  });

  it('score : exact 1, préfixe 0,9, autre titre < 0,8', () => {
    expect(titleScore('Mister Veto', 'Mister Veto')).toBe(1);
    expect(titleScore('Mister Veto', 'Mister Veto (Remix)')).toBe(0.9);
    expect(titleScore('Mister Veto', '13 Presidente')).toBeLessThan(0.8);
  });

  it('choisit le bon Short pour chaque chanson', () => {
    expect(pickBestMatch(SHORTS, { title: 'Mister Veto', release_date: '2026-11-10' }).url).toContain('2r2e7EebXB0');
    expect(pickBestMatch(SHORTS, { title: '15 de Novembro', release_date: '2026-11-17' }).url).toContain('Po7ukRmaj58');
    expect(pickBestMatch(SHORTS, { title: 'Uma música nova', release_date: '2026-11-24' })).toBeNull();
  });

  it('même titre d\'une autre année : la sortie la plus proche de la date', () => {
    const items = [
      { title: 'Já é Natal', url: 'old', date: '2025-12-20' },
      { title: 'Já é Natal', url: 'new', date: '2026-12-19' },
    ];
    expect(pickBestMatch(items, { title: 'Já é Natal', release_date: '2026-12-21' }).url).toBe('new');
    expect(pickBestMatch([items[0]], { title: 'Já é Natal', release_date: '2026-12-21' })).toBeNull();
  });

  it('lien Apple Music au format du site', () => {
    expect(appleSongUrl({ trackId: 6831165038, trackViewUrl: 'https://music.apple.com/br/album/mister-veto/6831165037?i=6831165038&uo=4' }))
      .toBe('https://music.apple.com/br/song/mister-veto/6831165038');
  });
});

describe('findReleaseLinks', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('itunes.apple.com')) {
        return new Response(JSON.stringify({ results: [
          { wrapperType: 'artist' },
          { wrapperType: 'track', trackId: 6831165038, trackName: 'Mister Veto', releaseDate: '2026-11-07T12:00:00Z', trackViewUrl: 'https://music.apple.com/br/album/mister-veto/6831165037?i=6831165038&uo=4' },
        ] }), { status: 200 });
      }
      return new Response(JSON.stringify({
        shorts: { status: 'ok', items: SHORTS },
        spotify: { status: 'not_configured', items: [] },
        youtubeMusic: { status: 'error', items: [] },
      }), { status: 200 });
    });
  });
  afterEach(() => { globalThis.fetch = realFetch; });

  it('un statut par plateforme', async () => {
    const out = await findReleaseLinks({ title: 'Mister Veto', release_date: '2026-11-10' });
    expect(out.apple_music_url).toMatchObject({ status: 'found', url: 'https://music.apple.com/br/song/mister-veto/6831165038' });
    expect(out.youtube_music_url).toMatchObject({ status: 'found', url: SHORTS[0].url });
    expect(out.spotify_url.status).toBe('not_configured');
    expect(out.youtube_url.status).toBe('error');
  });

  it('fonction pas encore déployée : Apple Music marche quand même', async () => {
    const apple = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url) => (String(url).includes('itunes') ? apple(url) : new Response('', { status: 404 })));
    const out = await findReleaseLinks({ title: 'Mister Veto', release_date: '2026-11-10' });
    expect(out.apple_music_url.status).toBe('found');
    expect(out.youtube_music_url.status).toBe('error');
  });
});
