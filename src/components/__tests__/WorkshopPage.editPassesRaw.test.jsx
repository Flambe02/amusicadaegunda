/**
 * Régression — même bug que SongQuickActions.editPassesRaw.test.jsx, second point
 * d'entrée : le bouton « Adicionar letra » de la page Ateliê de karaokê.
 *
 * `WorkshopPage.jsx` faisait :
 *   onClick={() => (action.action === 'editLyrics' ? openEdit(view) : openKaraoke(view.raw))}
 * — la branche `editLyrics` oubliait `.raw`, contrairement à la branche `openKaraoke`
 * juste à côté (l'asymétrie trahit l'oubli). `openEdit(view)` transmettait la vue
 * d'affichage (`toSongAdminView`), qui n'a ni `description` ni `lyrics` ni `release_date`
 * (snake_case) — `SongForm` retombe alors sur `nextMonday()`, une date fictive qu'un
 * « Guardar » aurait réécrite dans Supabase.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import WorkshopPage from '../../components/admin/WorkshopPage';
import { useAdminData } from '@/components/admin/AdminDataContext';

vi.mock('@/components/admin/AdminDataContext', () => ({ useAdminData: vi.fn() }));

const RAW_SONG = {
  id: 7,
  title: 'Chanson sans letra',
  lyrics: null,
  description: 'Ainda por escrever',
  release_date: '2026-06-01',
  category: null,
};

describe('WorkshopPage — action « Adicionar letra »', () => {
  it('appelle openEdit avec la ligne Supabase (view.raw), jamais la vue d’affichage', () => {
    const openEdit = vi.fn();
    useAdminData.mockReturnValue({
      songs: [RAW_SONG], categories: [], openKaraoke: vi.fn(), openEdit, loading: false,
    });

    render(<WorkshopPage />);

    fireEvent.click(screen.getByRole('button', { name: /adicionar letra/i }));

    expect(openEdit).toHaveBeenCalledTimes(1);
    expect(openEdit).toHaveBeenCalledWith(RAW_SONG);
    const passed = openEdit.mock.calls[0][0];
    expect(passed.description).toBe(RAW_SONG.description);
    expect(passed.release_date).toBe(RAW_SONG.release_date);
  });
});
