/**
 * Tests de validation JSON-LD pour A Música da Segunda
 * Vérifie que les schémas générés sont valides et complets
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { 
  musicRecordingJsonLd, 
  breadcrumbsJsonLd, 
  musicPlaylistJsonLd 
} from '../src/lib/seo-jsonld.js';

describe('JSON-LD Schema Validation', () => {
  describe('musicRecordingJsonLd', () => {
    it('génère un schéma MusicRecording valide avec tous les champs obligatoires', () => {
      const schema = musicRecordingJsonLd({
        title: 'Nobel Prize',
        slug: 'nobel-prize',
        datePublished: '2024-01-08',
        image: 'https://example.com/image.jpg',
        byArtist: 'A Música da Segunda',
        description: 'Paródia musical sobre o Prêmio Nobel',
        streamingUrls: [
          'https://open.spotify.com/track/123',
          'https://music.apple.com/track/456',
          'https://www.youtube.com/watch?v=789'
        ]
      });

      // Vérifications de base
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('MusicRecording');
      expect(schema.name).toBe('Nobel Prize');
      expect(schema.url).toBe('https://www.amusicadasegunda.com/musica/nobel-prize');
      expect(schema.inLanguage).toBe('pt-BR');
      expect(schema.genre).toContain('Comedy');
      expect(schema.genre).toContain('Music');
      expect(schema.description).toBe('Paródia musical sobre o Prêmio Nobel');

      // Vérifier byArtist
      expect(schema.byArtist).toEqual({
        '@type': 'MusicGroup',
        name: 'A Música da Segunda'
      });

      // Vérifier potentialAction (ListenAction)
      expect(schema.potentialAction).toHaveLength(3);
      expect(schema.potentialAction[0]['@type']).toBe('ListenAction');
      expect(schema.potentialAction[0].target['@type']).toBe('EntryPoint');
      expect(schema.potentialAction[0].target.urlTemplate).toBe('https://open.spotify.com/track/123');
      expect(schema.potentialAction[0].target.actionPlatform).toContain('http://schema.org/DesktopWebPlatform');
      
      // Vérifier expectsAcceptanceOf
      expect(schema.potentialAction[0].expectsAcceptanceOf['@type']).toBe('Offer');
      expect(schema.potentialAction[0].expectsAcceptanceOf.category).toBe('free');
      expect(schema.potentialAction[0].expectsAcceptanceOf.availabilityStarts).toBe('2024-01-08');

      // Vérifier sameAs
      expect(schema.sameAs).toHaveLength(3);
      expect(schema.sameAs).toContain('https://open.spotify.com/track/123');
    });

    it('gère correctement l\'absence de streamingUrls', () => {
      const schema = musicRecordingJsonLd({
        title: 'Test Song',
        slug: 'test-song',
        streamingUrls: []
      });

      expect(schema.potentialAction).toBeUndefined();
      expect(schema.sameAs).toBeUndefined();
    });

    it('filtre les URLs invalides dans streamingUrls', () => {
      const schema = musicRecordingJsonLd({
        title: 'Test Song',
        slug: 'test-song',
        streamingUrls: [
          'https://spotify.com/valid',
          null,
          undefined,
          '',
          123, // Invalid type
          'https://youtube.com/valid'
        ]
      });

      expect(schema.sameAs).toHaveLength(2);
      expect(schema.sameAs).toEqual([
        'https://spotify.com/valid',
        'https://youtube.com/valid'
      ]);
      expect(schema.potentialAction).toHaveLength(2);
    });

    it('utilise la date actuelle si datePublished est absent', () => {
      const schema = musicRecordingJsonLd({
        title: 'Test Song',
        slug: 'test-song'
      });

      const today = new Date().toISOString().slice(0, 10);
      expect(schema.datePublished).toBe(today);
    });

    it('n\'inclut pas description si elle est absente', () => {
      const schema = musicRecordingJsonLd({
        title: 'Test Song',
        slug: 'test-song'
      });

      expect(schema.description).toBeUndefined();
    });

    it('n\'inclut pas image si elle est absente', () => {
      const schema = musicRecordingJsonLd({
        title: 'Test Song',
        slug: 'test-song'
      });

      expect(schema.image).toBeUndefined();
    });

    it('génère un JSON valide sans virgules traînantes', () => {
      const schema = musicRecordingJsonLd({
        title: 'Test Song',
        slug: 'test-song',
        streamingUrls: ['https://spotify.com/track']
      });

      // Vérifie que JSON.stringify ne génère pas d'erreur
      const json = JSON.stringify(schema, null, 2);
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('breadcrumbsJsonLd', () => {
    it('génère un schéma BreadcrumbList valide', () => {
      const schema = breadcrumbsJsonLd({
        title: 'Nobel Prize',
        slug: 'nobel-prize'
      });

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(3);

      // Vérifier les breadcrumbs
      expect(schema.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: 'https://www.amusicadasegunda.com/'
      });

      expect(schema.itemListElement[1]).toEqual({
        '@type': 'ListItem',
        position: 2,
        name: 'Músicas',
        item: 'https://www.amusicadasegunda.com/musica'
      });

      expect(schema.itemListElement[2]).toEqual({
        '@type': 'ListItem',
        position: 3,
        name: 'Nobel Prize',
        item: 'https://www.amusicadasegunda.com/musica/nobel-prize'
      });
    });

    it('normalise le slug en nom lisible si le titre est absent', () => {
      const schema = breadcrumbsJsonLd({
        slug: 'test-song'
      });

      // Le slug "test-song" est normalisé en "Test Song" pour éviter "N/A" dans Google Search Console
      expect(schema.itemListElement[2].name).toBe('Test Song');
    });

    it('utilise le fallback "Música" si le slug est invalide', () => {
      const schema = breadcrumbsJsonLd({
        slug: null
      });

      // Garantit que "name" n'est jamais vide ou undefined
      expect(schema.itemListElement[2].name).toBe('Música');
    });
  });

  describe('musicPlaylistJsonLd', () => {
    it('génère un schéma MusicPlaylist valide', () => {
      const tracks = [
        { title: 'Song 1', slug: 'song-1', artist: 'Artist 1', datePublished: '2024-01-01' },
        { title: 'Song 2', slug: 'song-2', artist: 'Artist 2', datePublished: '2024-01-08' },
        { title: 'Song 3', slug: 'song-3', datePublished: '2024-01-15' }
      ];

      const schema = musicPlaylistJsonLd({ tracks });

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('MusicPlaylist');
      expect(schema.name).toBe('A Música da Segunda - Todas as Músicas');
      expect(schema.url).toBe('https://www.amusicadasegunda.com/musica');
      expect(schema.inLanguage).toBe('pt-BR');
      expect(schema.genre).toContain('Comedy');
      expect(schema.genre).toContain('Music');
      expect(schema.numTracks).toBe(3);

      // Vérifier author
      expect(schema.author).toEqual({
        '@type': 'MusicGroup',
        name: 'A Música da Segunda',
        url: 'https://www.amusicadasegunda.com'
      });

      // Vérifier les tracks
      expect(schema.track).toHaveLength(3);
      expect(schema.track[0]).toEqual({
        '@type': 'MusicRecording',
        position: 1,
        name: 'Song 1',
        url: 'https://www.amusicadasegunda.com/musica/song-1',
        byArtist: {
          '@type': 'MusicGroup',
          name: 'Artist 1'
        },
        datePublished: '2024-01-01'
      });

      // Vérifier que l'artiste par défaut est utilisé si absent
      expect(schema.track[2].byArtist.name).toBe('A Música da Segunda');
    });

    it('gère une playlist vide', () => {
      const schema = musicPlaylistJsonLd({ tracks: [] });

      expect(schema.numTracks).toBe(0);
      expect(schema.track).toHaveLength(0);
    });

    it('n\'inclut pas datePublished si elle est absente', () => {
      const tracks = [
        { title: 'Song 1', slug: 'song-1' }
      ];

      const schema = musicPlaylistJsonLd({ tracks });

      expect(schema.track[0].datePublished).toBeUndefined();
    });

    it('génère un JSON valide sans virgules traînantes', () => {
      const tracks = [
        { title: 'Song 1', slug: 'song-1', artist: 'Artist 1' }
      ];

      const schema = musicPlaylistJsonLd({ tracks });

      // Vérifie que JSON.stringify ne génère pas d'erreur
      const json = JSON.stringify(schema, null, 2);
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('URL Validation', () => {
    it('utilise toujours le préfixe /musica pour les chansons', () => {
      const musicSchema = musicRecordingJsonLd({
        title: 'Test Song',
        slug: 'test-song'
      });

      expect(musicSchema.url).toContain('/musica/');
      expect(musicSchema.url).not.toContain('/chansons/');
    });

    it('utilise /musica pour les breadcrumbs', () => {
      const breadcrumbs = breadcrumbsJsonLd({
        title: 'Test Song',
        slug: 'test-song'
      });

      expect(breadcrumbs.itemListElement[1].item).toBe('https://www.amusicadasegunda.com/musica');
      expect(breadcrumbs.itemListElement[2].item).toContain('/musica/');
    });

    it('utilise /musica pour la playlist', () => {
      const playlistSchema = musicPlaylistJsonLd({
        tracks: [{ title: 'Song 1', slug: 'song-1' }]
      });

      expect(playlistSchema.url).toBe('https://www.amusicadasegunda.com/musica');
      expect(playlistSchema.track[0].url).toContain('/musica/');
    });

    it('utilise toujours https://www.amusicadasegunda.com comme domaine canonique', () => {
      const musicSchema = musicRecordingJsonLd({ title: 'Test', slug: 'test' });
      const breadcrumbs = breadcrumbsJsonLd({ title: 'Test', slug: 'test' });
      const playlist = musicPlaylistJsonLd({ tracks: [] });

      expect(musicSchema.url).toMatch(/^https:\/\/www\.amusicadasegunda\.com/);
      expect(breadcrumbs.itemListElement[0].item).toMatch(/^https:\/\/www\.amusicadasegunda\.com/);
      expect(playlist.url).toMatch(/^https:\/\/www\.amusicadasegunda\.com/);
      expect(playlist.author.url).toBe('https://www.amusicadasegunda.com');
    });
  });

  describe('Data Quality', () => {
    it('ne génère pas de potentialAction si streamingUrls contient seulement des valeurs invalides', () => {
      const schema = musicRecordingJsonLd({
        title: 'Test Song',
        slug: 'test-song',
        streamingUrls: [null, undefined, '', 123]
      });

      expect(schema.potentialAction).toBeUndefined();
      expect(schema.sameAs).toBeUndefined();
    });

    it('génère des schémas avec inLanguage pt-BR', () => {
      const music = musicRecordingJsonLd({ title: 'Test', slug: 'test' });
      const playlist = musicPlaylistJsonLd({ tracks: [] });

      expect(music.inLanguage).toBe('pt-BR');
      expect(playlist.inLanguage).toBe('pt-BR');
    });

    it('génère des schémas avec genre correct', () => {
      const music = musicRecordingJsonLd({ title: 'Test', slug: 'test' });
      const playlist = musicPlaylistJsonLd({ tracks: [] });

      expect(music.genre).toEqual(['Comedy', 'Music', 'Música Brasileira', 'Paródia']);
      expect(playlist.genre).toEqual(['Comedy', 'Music', 'Música Brasileira', 'Paródia']);
    });
  });
});
