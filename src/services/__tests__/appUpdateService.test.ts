import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const maybeSingleMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: maybeSingleMock }),
      }),
    }),
  },
}));

import {
  computeUpdateState,
  normalizeAppUpdateConfig,
  fetchRemoteAppUpdateConfig,
  readAppUpdateCache,
  writeAppUpdateCache,
  shouldRefreshAppUpdateCache,
  isRecommendedUpdateDismissed,
  dismissRecommendedUpdate,
  detectAppUpdatePlatform,
  resolveStoreHttpsUrl,
} from '@/services/appUpdateService';

function makeConfig(overrides = {}) {
  return {
    platform: 'android_mobile',
    enabled: true,
    latestVersionCode: 25,
    minimumVersionCode: 23,
    checkIntervalMinutes: 360,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Cas 1-5 (§18 de la consigne) — calcul pur de l'état.
// ─────────────────────────────────────────────────────────────────────────
describe('computeUpdateState', () => {
  it('caso 1: current === latest → none', () => {
    expect(computeUpdateState(25, makeConfig())).toBe('none');
  });

  it('caso 2: minimum <= current < latest → recommended', () => {
    expect(computeUpdateState(24, makeConfig())).toBe('recommended');
  });

  it('caso 3: current < minimum → required', () => {
    expect(computeUpdateState(22, makeConfig())).toBe('required');
  });

  it('caso 4: current > latest → none', () => {
    expect(computeUpdateState(26, makeConfig())).toBe('none');
  });

  it('caso 5: configuração inválida/ausente → none (nunca "required")', () => {
    expect(computeUpdateState(1, null)).toBe('none');
    expect(computeUpdateState(1, undefined)).toBe('none');
    expect(computeUpdateState(1, makeConfig({ enabled: false }))).toBe('none');
  });

  it('nunca bloqueia quando a versão local é ilegível (NaN)', () => {
    expect(computeUpdateState(NaN, makeConfig({ minimumVersionCode: 999 }))).toBe('none');
  });
});

describe('normalizeAppUpdateConfig', () => {
  it('aceita uma linha Supabase bem formada (snake_case)', () => {
    const cfg = normalizeAppUpdateConfig({
      platform: 'android_tv',
      enabled: true,
      latest_version_code: 25,
      minimum_version_code: 23,
      latest_version_name: '1.5.0',
      check_interval_minutes: 120,
    });
    expect(cfg).toMatchObject({
      platform: 'android_tv', latestVersionCode: 25, minimumVersionCode: 23, checkIntervalMinutes: 120,
    });
  });

  it.each([
    [null],
    [undefined],
    ['nope'],
    [{ platform: 'ios', latest_version_code: 1, minimum_version_code: 1 }],
    [{ platform: 'android_mobile', latest_version_code: 'abc', minimum_version_code: 1 }],
    [{ platform: 'android_mobile', latest_version_code: 10, minimum_version_code: 11 }],
    [{ platform: 'android_mobile', latest_version_code: -1, minimum_version_code: -1 }],
  ])('rejeita entrada malformada (%#)', (input) => {
    expect(normalizeAppUpdateConfig(input)).toBeNull();
  });

  it('usa o intervalo padrão quando check_interval_minutes está ausente/inválido', () => {
    const cfg = normalizeAppUpdateConfig({ platform: 'android_mobile', latest_version_code: 5, minimum_version_code: 5 });
    expect(cfg?.checkIntervalMinutes).toBe(360);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Cache local — fail-safe (§7 / cas 6-7 de la consigne).
// ─────────────────────────────────────────────────────────────────────────
describe('cache local (comportamento fail-safe)', () => {
  const PLATFORM = 'android_mobile';

  beforeEach(() => { localStorage.clear(); });

  it('caso 6: sem cache e sem configuração → acesso normal à aplicação', () => {
    expect(readAppUpdateCache(PLATFORM)).toBeNull();
    expect(computeUpdateState(20, null)).toBe('none');
  });

  it('caso 7: uma configuração "required" em cache válido permanece required', () => {
    const cfg = makeConfig({ latestVersionCode: 25, minimumVersionCode: 23 });
    writeAppUpdateCache(PLATFORM, cfg);
    const entry = readAppUpdateCache(PLATFORM);
    expect(entry).not.toBeNull();
    expect(computeUpdateState(22, entry?.config)).toBe('required');
  });

  it('ignora uma entrada de cache corrompida em vez de lançar', () => {
    localStorage.setItem('app_update_config_v1_android_mobile', '{not json');
    expect(readAppUpdateCache(PLATFORM)).toBeNull();
  });

  it('shouldRefreshAppUpdateCache: true se obsoleto ou ausente, false se recente', () => {
    const fresh = { config: makeConfig(), fetchedAt: Date.now() };
    const stale = { config: makeConfig(), fetchedAt: Date.now() - 400 * 60_000 };
    expect(shouldRefreshAppUpdateCache(fresh, 360)).toBe(false);
    expect(shouldRefreshAppUpdateCache(stale, 360)).toBe(true);
    expect(shouldRefreshAppUpdateCache(null, 360)).toBe(true);
  });
});

describe('fetchRemoteAppUpdateConfig', () => {
  beforeEach(() => { maybeSingleMock.mockReset(); });

  it('propaga falhas de rede ao chamador (nunca engolidas silenciosamente)', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: new Error('network down') });
    await expect(fetchRemoteAppUpdateConfig('android_mobile')).rejects.toThrow('network down');
  });

  it('devolve null para uma linha ausente (nunca tratado como "required")', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    await expect(fetchRemoteAppUpdateConfig('android_mobile')).resolves.toBeNull();
  });

  it('normaliza uma linha válida', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        platform: 'android_mobile', enabled: true, latest_version_code: 25, minimum_version_code: 23, check_interval_minutes: 360,
      },
      error: null,
    });
    const cfg = await fetchRemoteAppUpdateConfig('android_mobile');
    expect(cfg).toMatchObject({ latestVersionCode: 25, minimumVersionCode: 23 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Dismissal da recomendação — cas 8-9.
// ─────────────────────────────────────────────────────────────────────────
describe('dismissal da atualização recomendada (casos 8 e 9)', () => {
  const PLATFORM = 'android_mobile';

  beforeEach(() => { localStorage.clear(); });

  it('caso 8: dispensar a versão 25 esconde-a para essa versão', () => {
    expect(isRecommendedUpdateDismissed(PLATFORM, 25)).toBe(false);
    dismissRecommendedUpdate(PLATFORM, 25);
    expect(isRecommendedUpdateDismissed(PLATFORM, 25)).toBe(true);
  });

  it('caso 9: uma nova latestVersionCode volta a ser mostrada (chave de dismissal independente)', () => {
    dismissRecommendedUpdate(PLATFORM, 25);
    expect(isRecommendedUpdateDismissed(PLATFORM, 26)).toBe(false);
  });
});

describe('detectAppUpdatePlatform (seleção de plataforma)', () => {
  afterEach(() => { localStorage.removeItem('force-tv'); });

  it('resolve para android_mobile por defeito (jsdom, sem sinais de TV)', () => {
    expect(detectAppUpdatePlatform()).toBe('android_mobile');
  });

  it('resolve para android_tv quando o override de TV está ativo (mesmo mecanismo que src/tv/platform.js)', () => {
    localStorage.setItem('force-tv', '1');
    expect(detectAppUpdatePlatform()).toBe('android_tv');
  });
});

describe('resolveStoreHttpsUrl (fallback da loja)', () => {
  it('usa a URL padrão da Google Play quando não há override', () => {
    expect(resolveStoreHttpsUrl(null)).toContain('play.google.com/store/apps/details?id=com.amusicadasegunda.app');
  });

  it('usa config.storeUrl quando é uma URL https válida', () => {
    const url = 'https://play.google.com/store/apps/details?id=other.app';
    expect(resolveStoreHttpsUrl(makeConfig({ storeUrl: url }))).toBe(url);
  });

  it('rejeita um override não-https (market:// ou http://) e usa o padrão', () => {
    expect(resolveStoreHttpsUrl(makeConfig({ storeUrl: 'market://details?id=x' }))).toContain('play.google.com');
    expect(resolveStoreHttpsUrl(makeConfig({ storeUrl: 'http://evil.example' }))).toContain('play.google.com');
  });
});
