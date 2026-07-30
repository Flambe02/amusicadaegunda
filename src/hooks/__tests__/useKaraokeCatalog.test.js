import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useKaraokeCatalog } from '../useKaraokeCatalog';

const LRC = '[00:01.00]Olá\n[00:03.00]Mundo';

const SONGS = [
  { id: '1', title: 'Camarada Quer CPF', category: 'internacional', release_date: '2026-07-06', lrc_content: LRC, difficulty: 'easy' },
  { id: '2', title: 'Independência ou Gol', category: 'esporte', release_date: '2026-07-01', lrc_content: LRC, difficulty: 'medium' },
  { id: '3', title: 'Messi é o Melhor', category: 'esporte', release_date: '2026-06-15', lrc_content: LRC, difficulty: 'hard' },
  // Non éligible (sans LRC) : ne doit jamais être proposée par « Me surpreenda ».
  { id: '99', title: 'Sem Karaoke', category: 'outros', release_date: '2026-05-01', lrc_content: null, difficulty: 'easy' },
];

vi.mock('@/api/entities', () => ({
  Song: { list: vi.fn(() => Promise.resolve(SONGS)) },
}));

describe('useKaraokeCatalog — difficulté', () => {
  beforeEach(() => localStorage.clear());

  it('loads only karaoke-eligible songs', async () => {
    const { result } = renderHook(() => useKaraokeCatalog());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalEligible).toBe(3);
    expect(result.current.results.map((s) => s.id).sort()).toEqual(['1', '2', '3']);
  });

  it('filters results by difficulty and reports hasActiveFilters', async () => {
    const { result } = renderHook(() => useKaraokeCatalog());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasActiveFilters).toBe(false);
    act(() => { result.current.setDifficulty('medium'); });
    expect(result.current.results.map((s) => s.id)).toEqual(['2']);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('clearFilters resets the difficulty filter along with the rest', async () => {
    const { result } = renderHook(() => useKaraokeCatalog());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setDifficulty('hard'); });
    expect(result.current.results).toHaveLength(1);
    act(() => { result.current.clearFilters(); });
    expect(result.current.filters.difficulty).toBeNull();
    expect(result.current.results).toHaveLength(3);
  });

  it('"Me surpreenda" only draws from eligible AND currently filtered songs', async () => {
    const { result } = renderHook(() => useKaraokeCatalog());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setDifficulty('easy'); });
    // Une seule chanson easy ET éligible : "1". Jamais "99" (easy mais pas de LRC).
    expect(result.current.results.map((s) => s.id)).toEqual(['1']);

    let chosen;
    act(() => { chosen = result.current.pickSurprise(() => 0); });
    expect(chosen?.id).toBe('1');
  });

  it('returns null from "Me surpreenda" when the active filter matches nothing', async () => {
    const { result } = renderHook(() => useKaraokeCatalog());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setQuery('não existe nenhuma música assim'); });
    expect(result.current.results).toHaveLength(0);
    let picked;
    act(() => { picked = result.current.pickSurprise(() => 0); });
    expect(picked).toBeNull();
  });
});
