/**
 * Régression — « Editar música » à partir do drawer não devolvia os dados reais.
 *
 * Signalé le 2026-07-30 : ouvrir « Editar » depuis les Ações rápidas du drawer
 * affichait Descrição vide et « Adicionar letra » fermé, alors que Supabase avait bien
 * ces données. Confirmé par lecture du code : `AdminLayout` passe `openEdit` (la fonction
 * de contexte BRUTE, sans wrapper) directement au drawer → `SongQuickActions`, qui
 * appelait `onEdit(view)` — la VUE ADMIN (`toSongAdminView`, un modèle d'affichage sans
 * `description`/`lyrics`/`spotify_url`/etc., et avec `releaseDate` en camelCase au lieu de
 * `release_date`) au lieu de `view.raw` (la ligne Supabase réelle).
 *
 * Plus grave qu'un défaut d'affichage : `SongForm` retombe sur `nextMonday()` quand
 * `release_date` est absent — sauvegarder ce formulaire aurait donc RÉÉCRIT une date de
 * sortie fictive sur la chanson.
 *
 * `CatalogPage.jsx` faisait déjà `onEdit={(v) => openEdit(v.raw)}` correctement ; ce test
 * verrouille le même contrat pour SongQuickActions (drawer) — le seul autre point d'entrée
 * du bouton « Editar música ».
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import SongQuickActions from '../../components/admin/SongQuickActions';

const RAW_SONG = {
  id: 42,
  title: 'Sinfonia do Vorcaro',
  description: 'Descreve o contexto da música…',
  lyrics: 'Confere o nome\nConfere a foto',
  release_date: '2026-07-13',
  spotify_url: 'https://open.spotify.com/track/abc',
};

const VIEW = {
  id: 42,
  title: 'Sinfonia do Vorcaro',
  status: 'published',
  hasLyrics: true,
  hasPitchMap: false,
  pitchNoteCount: 0,
  slug: 'sinfonia-do-vorcaro',
  raw: RAW_SONG,
};

const noop = () => {};

describe('SongQuickActions — « Editar música »', () => {
  it('appelle onEdit avec la ligne Supabase (view.raw), jamais avec la vue d’affichage', () => {
    const onEdit = vi.fn();
    render(
      <SongQuickActions
        view={VIEW}
        onEdit={onEdit}
        onKaraoke={noop}
        onQuickSync={noop}
        onPitchMap={noop}
        onPublish={noop}
        onManageLinks={noop}
        onDelete={noop}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /editar música/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(RAW_SONG);
    // La preuve concrète du bug : ces champs n'existent QUE sur la ligne brute.
    const passed = onEdit.mock.calls[0][0];
    expect(passed.description).toBe(RAW_SONG.description);
    expect(passed.lyrics).toBe(RAW_SONG.lyrics);
    expect(passed.release_date).toBe(RAW_SONG.release_date);
  });
});
