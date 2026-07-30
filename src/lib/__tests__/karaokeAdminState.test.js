/**
 * Régression — « si la chanson n'est pas publiée, le karaokê ne peut jamais être publié »
 * (signalé le 2026-07-29).
 *
 * C'est exact, et c'était le problème : le public ne reçoit QUE des chansons
 * `status='published'` (filtre de requête pour getBySlug/getCurrent, policy RLS
 * « public read published » pour le catalogue /karaoke, la TV et a Festa). Publier le
 * karaokê d'une chanson en rascunho n'a donc aucun effet public — mais l'admin affichait
 * quand même le badge « Karaokê », c'est-à-dire « en ligne ».
 *
 * `karaokeAdminState()` distingue donc explicitement les deux rascunhos.
 */
import { describe, it, expect } from 'vitest';
import { KARAOKE_STATE, karaokeAdminState, isSongPublished, isKaraokePublished } from '../lrc';

const SYNCED = '[00:12.04]Cinco e quarenta';

const song = (over = {}) => ({
  status: 'published', lyrics: 'Cinco e quarenta', lrc_content: SYNCED, ...over,
});

describe('isSongPublished', () => {
  it('n’accepte que le statut publié', () => {
    expect(isSongPublished({ status: 'published' })).toBe(true);
    expect(isSongPublished({ status: 'draft' })).toBe(false);
    expect(isSongPublished({})).toBe(false);
    expect(isSongPublished(null)).toBe(false);
  });
});

describe('karaokeAdminState', () => {
  it('ACTIVE seulement quand la chanson ET le karaokê sont publiés', () => {
    expect(karaokeAdminState(song())).toBe(KARAOKE_STATE.ACTIVE);
    expect(karaokeAdminState(song({ karaoke_published: true }))).toBe(KARAOKE_STATE.ACTIVE);
  });

  it('SONG_DRAFT quand le karaokê est prêt mais la chanson est un rascunho', () => {
    // Le cas signalé : rien n'est public, il ne faut donc PAS afficher « Karaokê ».
    expect(karaokeAdminState(song({ status: 'draft' }))).toBe(KARAOKE_STATE.SONG_DRAFT);
    expect(karaokeAdminState(song({ status: 'draft', karaoke_published: true }))).toBe(KARAOKE_STATE.SONG_DRAFT);
    expect(karaokeAdminState(song({ status: undefined }))).toBe(KARAOKE_STATE.SONG_DRAFT);
  });

  it('DRAFT quand c’est le karaokê lui-même qui est désactivé', () => {
    expect(karaokeAdminState(song({ karaoke_published: false }))).toBe(KARAOKE_STATE.DRAFT);
    // Le rascunho du karaokê l'emporte : la cause la plus proche de l'action de l'admin.
    expect(karaokeAdminState(song({ status: 'draft', karaoke_published: false }))).toBe(KARAOKE_STATE.DRAFT);
  });

  it('PENDING avec de la letra mais aucune synchronisation', () => {
    expect(karaokeAdminState(song({ lrc_content: null }))).toBe(KARAOKE_STATE.PENDING);
    expect(karaokeAdminState(song({ lrc_content: 'sem nenhum tempo aqui' }))).toBe(KARAOKE_STATE.PENDING);
  });

  it('reconnaît une letra qui n’existe que dans lyrics_karaoke', () => {
    // Sans ça, une chanson migrée vers lyrics_karaoke passait pour « não configurado ».
    expect(karaokeAdminState({ status: 'published', lyrics: null, lyrics_karaoke: 'Cinco', lrc_content: null }))
      .toBe(KARAOKE_STATE.PENDING);
  });

  it('UNCONFIGURED sans letra ni timing', () => {
    expect(karaokeAdminState({ status: 'published' })).toBe(KARAOKE_STATE.UNCONFIGURED);
    expect(karaokeAdminState(null)).toBe(KARAOKE_STATE.UNCONFIGURED);
  });

  it('accepte timing_data seul comme synchronisation', () => {
    const s = { status: 'draft', lyrics: 'Cinco', lrc_content: null, timing_data: { lines: [{ text: 'Cinco', start: 1 }] } };
    expect(karaokeAdminState(s)).toBe(KARAOKE_STATE.SONG_DRAFT);
  });

  it('ne modifie PAS la décision de visibilité publique', () => {
    // isKaraokePublished reste le seul point de décision public et garde son contrat :
    // il ne regarde pas `status` (le filtrage par statut se fait en amont, requête + RLS).
    expect(isKaraokePublished(song({ status: 'draft' }))).toBe(true);
    expect(isKaraokePublished(song({ karaoke_published: false }))).toBe(false);
  });
});
