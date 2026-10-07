import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
const single = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args) => rpc(...args),
    from: () => ({ insert: () => ({ select: () => ({ single: () => single() }) }) }),
  },
}));

import { createFestaSession } from '../festa';

beforeEach(() => {
  rpc.mockReset();
  single.mockReset();
  single.mockResolvedValue({ data: { id: 'abc', code: 'SEGA26', active: true }, error: null });
});

describe('createFestaSession — ménage des sessions inactives', () => {
  it('asks the database to close stale sessions, then creates the new one', async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    const session = await createFestaSession();
    expect(rpc).toHaveBeenCalledWith('cleanup_stale_festa_sessions');
    expect(session.code).toBe('SEGA26');
  });

  it('a failing clean-up never prevents the party from starting', async () => {
    rpc.mockRejectedValue(new Error('network'));
    await expect(createFestaSession()).resolves.toMatchObject({ id: 'abc' });
    rpc.mockImplementation(() => { throw new Error('no client'); });
    await expect(createFestaSession()).resolves.toMatchObject({ id: 'abc' });
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    await expect(createFestaSession()).resolves.toMatchObject({ id: 'abc' });
  });
});
