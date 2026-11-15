// Régression 2026-11-15 : supabase-js appelle les callbacks onAuthStateChange EN TENANT
// son verrou d'auth (et ré-émet SIGNED_IN à chaque retour sur l'onglet). Un appel
// Supabase attendu dans ce callback attend ce même verrou → interblocage permanent
// (Sair sans effet, Guardar qui mouline, autres onglets sur le catalogue statique).
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';

let authCallback = null;
const maybeSingle = vi.fn(() => Promise.resolve({ data: { user_id: 'u1' }, error: null }));
const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args) => from(...args),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      onAuthStateChange: vi.fn((cb) => { authCallback = cb; return { data: { subscription: { unsubscribe() {} } } }; }),
    },
  },
}));
vi.mock('@/pages/Admin', () => ({ default: () => <div>admin</div> }));
vi.mock('@/pages/Login', () => ({ default: () => <div>login</div> }));
vi.mock('@/components/UpdatePassword', () => ({ default: () => null }));

import ProtectedAdmin from '../ProtectedAdmin';

describe('ProtectedAdmin — callback onAuthStateChange', () => {
  beforeEach(() => { from.mockClear(); authCallback = null; });

  it('ne fait aucun appel Supabase pendant le callback (hors verrou, différé)', async () => {
    vi.useFakeTimers();
    render(<HelmetProvider><ProtectedAdmin /></HelmetProvider>);
    await act(async () => { await vi.runAllTimersAsync(); });
    from.mockClear();

    let returned;
    act(() => { returned = authCallback('SIGNED_IN', { user: { id: 'u1' } }); });
    expect(returned).toBeUndefined(); // jamais une promesse attendue par supabase-js
    expect(from).not.toHaveBeenCalled();

    await act(async () => { await vi.runAllTimersAsync(); });
    expect(from).toHaveBeenCalledWith('admins');

    // Retour sur l'onglet : même admin déjà vérifié → aucune nouvelle requête.
    from.mockClear();
    act(() => { authCallback('SIGNED_IN', { user: { id: 'u1' } }); });
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(from).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
