/**
 * Régression — un SHORT ne doit jamais servir d'horloge de synchronisation.
 *
 * Signalé le 2026-07-29 sur « Vini, outro CPF » : le lien de la chanson complète
 * n'était pas exploitable, l'éditeur retombait donc sur `youtube_music_url` — qui,
 * dans ce schéma, contient le lien SHORTS. La synchronisation se faisait alors sur un
 * extrait de ~60 s, silencieusement.
 */
import { describe, it, expect } from 'vitest';
import { SYNC_VIDEO_REASON, isShortsUrl, resolveSyncVideo, syncVideoProblem } from '../syncVideoSource';

const FULL = 'https://music.youtube.com/watch?v=abcdefghijk';
const SHORT = 'https://www.youtube.com/shorts/ZYXWVUTSRQP';
const WATCH = 'https://www.youtube.com/watch?v=11112222333';

describe('isShortsUrl', () => {
  it('reconnaît un Short', () => {
    expect(isShortsUrl(SHORT)).toBe(true);
    expect(isShortsUrl('http://YOUTUBE.COM/SHORTS/ZYXWVUTSRQP')).toBe(true);
  });
  it('ne confond pas une vidéo normale avec un Short', () => {
    expect(isShortsUrl(FULL)).toBe(false);
    expect(isShortsUrl(WATCH)).toBe(false);
    expect(isShortsUrl(null)).toBe(false);
  });
});

describe('resolveSyncVideo', () => {
  it('prend la chanson complète quand elle existe', () => {
    const r = resolveSyncVideo({ youtube_url: FULL, youtube_music_url: SHORT });
    expect(r).toMatchObject({ videoId: 'abcdefghijk', field: 'youtube_url', reason: SYNC_VIDEO_REASON.OK });
  });

  it('REFUSE de retomber sur le Short — le bug de « Vini, outro CPF »', () => {
    // youtube_url inexploitable (playlist YouTube Music : aucun ?v=)
    const r = resolveSyncVideo({
      youtube_url: 'https://music.youtube.com/playlist?list=OLAK5uy_abc',
      youtube_music_url: SHORT,
    });
    expect(r.videoId).toBeNull();
    expect(r.reason).toBe(SYNC_VIDEO_REASON.SHORTS_ONLY);
  });

  it('refuse aussi le Short quand il est le seul lien présent', () => {
    expect(resolveSyncVideo({ youtube_music_url: SHORT }).reason).toBe(SYNC_VIDEO_REASON.SHORTS_ONLY);
    expect(resolveSyncVideo({ youtube_url: SHORT }).reason).toBe(SYNC_VIDEO_REASON.SHORTS_ONLY);
  });

  it('accepte une vidéo complète rangée dans la colonne Shorts (données mélangées)', () => {
    // La colonne ne fait pas foi : c'est la FORME de l'URL qui décide.
    const r = resolveSyncVideo({ youtube_url: null, youtube_music_url: WATCH });
    expect(r).toMatchObject({ videoId: '11112222333', field: 'youtube_music_url', reason: SYNC_VIDEO_REASON.OK });
  });

  it('distingue « aucun lien » de « seulement un Short »', () => {
    expect(resolveSyncVideo({}).reason).toBe(SYNC_VIDEO_REASON.MISSING);
    expect(resolveSyncVideo(null).reason).toBe(SYNC_VIDEO_REASON.MISSING);
    expect(resolveSyncVideo({ youtube_url: 'não é um link' }).reason).toBe(SYNC_VIDEO_REASON.MISSING);
  });
});

describe('syncVideoProblem', () => {
  it('explique le refus du Short en nommant la cause', () => {
    expect(syncVideoProblem(SYNC_VIDEO_REASON.SHORTS_ONLY)).toMatch(/Short/);
  });
  it('ne dit rien quand la vidéo est bonne', () => {
    expect(syncVideoProblem(SYNC_VIDEO_REASON.OK)).toBeNull();
  });
  it('a un message pour l’absence de lien', () => {
    expect(syncVideoProblem(SYNC_VIDEO_REASON.MISSING)).toMatch(/link/i);
  });
});
