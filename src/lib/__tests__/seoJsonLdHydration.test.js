import { describe, it, expect, beforeEach } from 'vitest';
import { ENTITY_ID, injectJsonLd, musicRecordingJsonLd, removeStaticJsonLd } from '../seo-jsonld';

const staticBlock = (schema) => {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema, null, 2);
  document.head.appendChild(script);
  return script;
};
const types = () => [...document.head.querySelectorAll('script[type="application/ld+json"]')].map((script) => JSON.parse(script.textContent)['@type']);

beforeEach(() => { document.head.innerHTML = ''; });

describe('JSON-LD après hydratation — un seul bloc par type', () => {
  it('the React block replaces the static one of the same type, and leaves the others alone', () => {
    staticBlock({ '@type': 'MusicGroup', name: 'A Música da Segunda' });
    staticBlock({ '@type': 'MusicRecording', name: 'Static' });
    staticBlock({ '@type': 'BreadcrumbList' });
    injectJsonLd(musicRecordingJsonLd({ title: 'Querido TSE', slug: 'querido-tse', datePublished: '2026-09-28' }), 'song-music-schema');
    injectJsonLd({ '@type': 'BreadcrumbList' }, 'song-breadcrumb-schema');
    expect(types().sort()).toEqual(['BreadcrumbList', 'MusicGroup', 'MusicRecording']);
    expect(JSON.parse(document.getElementById('song-music-schema').textContent).name).toBe('Querido TSE');
  });

  it('injecting twice with the same id keeps one block', () => {
    injectJsonLd({ '@type': 'MusicRecording', name: 'a' }, 'song-music-schema');
    injectJsonLd({ '@type': 'MusicRecording', name: 'b' }, 'song-music-schema');
    expect(types()).toEqual(['MusicRecording']);
  });

  it('removeStaticJsonLd never touches a block placed by React (with an id) nor an unreadable one', () => {
    injectJsonLd({ '@type': 'FAQPage' }, 'faq');
    const broken = document.createElement('script');
    broken.type = 'application/ld+json';
    broken.textContent = '{not json';
    document.head.appendChild(broken);
    staticBlock({ '@type': 'FAQPage' });
    removeStaticJsonLd('FAQPage');
    expect(document.getElementById('faq')).toBeTruthy();
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(2);
  });

  it('the React MusicRecording names the same entity as the static pages, with its platform links', () => {
    const recording = musicRecordingJsonLd({ title: 'X', slug: 'x', datePublished: '2025-02-03', streamingUrls: ['https://open.spotify.com/track/abc'] });
    expect(recording.byArtist['@id']).toBe(ENTITY_ID);
    expect(ENTITY_ID).toBe('https://www.amusicadasegunda.com/#organization');
    expect(recording.sameAs).toEqual(['https://open.spotify.com/track/abc']);
    expect(recording.genre).toEqual(['Paródia musical', 'Sátira musical', 'Música de humor']);
    expect(recording.duration).toBeUndefined();
  });
});
