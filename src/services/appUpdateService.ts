// Contrôle de version distant (Android mobile + Android TV) — logique pure et
// accès réseau/stockage. AUCUNE logique UI ici (cf. src/hooks/useAppUpdate.jsx
// pour l'orchestration React et src/components/AppUpdate|src/tv/components
// pour l'affichage). Documentation complète : APP_UPDATE_SYSTEM.md.
import { supabase } from '@/lib/supabase';
import { isTV } from '@/tv/platform';
import { isNative } from '@/native';
import { getPlayStoreUrl, getPlayStoreMarketUri } from '@/lib/playStore';

const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;

export type AppUpdatePlatform = 'android_mobile' | 'android_tv';

export type AppUpdateState = 'checking' | 'none' | 'recommended' | 'required' | 'error';

export interface AppUpdateConfig {
  platform: AppUpdatePlatform;
  enabled: boolean;
  latestVersionCode: number;
  minimumVersionCode: number;
  latestVersionName?: string | null;
  titleRecommended?: string | null;
  messageRecommended?: string | null;
  titleRequired?: string | null;
  messageRequired?: string | null;
  storeUrl?: string | null;
  checkIntervalMinutes: number;
}

export interface AppUpdateStatus {
  state: AppUpdateState;
  currentVersionCode: number;
  currentVersionName: string;
  config: AppUpdateConfig | null;
}

export interface AppUpdateCacheEntry {
  config: AppUpdateConfig;
  fetchedAt: number;
}

export const DEFAULT_CHECK_INTERVAL_MINUTES = 360;

export const DEFAULT_RECOMMENDED_TITLE = 'Nova versão disponível';
export const DEFAULT_RECOMMENDED_MESSAGE = 'Atualizamos A Música da Segunda com melhorias de estabilidade, navegação e karaokê.';
export const DEFAULT_REQUIRED_TITLE = 'Atualização necessária';
export const DEFAULT_REQUIRED_MESSAGE = 'Esta versão não é mais compatível. Atualize o aplicativo para continuar usando A Música da Segunda.';
export const STORE_OPEN_ERROR_MESSAGE = 'Não foi possível abrir a Google Play. Tente novamente.';

const APP_UPDATE_TABLE = 'app_update_config';
const CACHE_KEY_PREFIX = 'app_update_config_v1_';
const DISMISS_KEY_PREFIX = 'app_update_dismissed_';
const STORE_OPEN_FALLBACK_DELAY_MS = 1200;

// ─────────────────────────────────────────────────────────────────────────
// Détection plateforme / versão local
// ─────────────────────────────────────────────────────────────────────────

/** android_tv | android_mobile — jamais TV par erreur si la détection échoue (cf. src/tv/platform.js#isTV). */
export function detectAppUpdatePlatform(): AppUpdatePlatform {
  try {
    return isTV() ? 'android_tv' : 'android_mobile';
  } catch {
    return 'android_mobile';
  }
}

/**
 * Lit versionName/versionCode natifs via @capacitor/app (import dynamique,
 * même convention que src/tv/adapters/backButton.js). Sur web/PWA ou si
 * `info.build` est invalide, retourne `versionCode: NaN` — jamais une valeur
 * qui pourrait déclencher un blocage accidentel (cf. computeUpdateState).
 */
export async function readCurrentVersion(): Promise<{ versionCode: number; versionName: string }> {
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    const versionCode = Number.parseInt(info.build, 10);
    if (!Number.isFinite(versionCode)) {
      if (isDev) console.warn('[appUpdateService] info.build inválido:', info.build);
      return { versionCode: NaN, versionName: info.version || '' };
    }
    return { versionCode, versionName: info.version || '' };
  } catch (err) {
    if (isDev) console.warn('[appUpdateService] App.getInfo indisponível (web/PWA?):', err);
    return { versionCode: NaN, versionName: '' };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Calcul de l'état — fonction pure, cf. cas 1-5 de APP_UPDATE_SYSTEM.md
// ─────────────────────────────────────────────────────────────────────────

export function computeUpdateState(
  currentVersionCode: number | null | undefined,
  config: AppUpdateConfig | null | undefined,
): AppUpdateState {
  if (!config || config.enabled === false) return 'none';
  if (!Number.isFinite(currentVersionCode as number)) return 'none';
  const current = currentVersionCode as number;
  if (current >= config.latestVersionCode) return 'none';
  if (current >= config.minimumVersionCode) return 'recommended';
  return 'required';
}

// ─────────────────────────────────────────────────────────────────────────
// Validation — une ligne Supabase malformée ne doit JAMAIS produire un état
// bloquant (cf. cas 5). Accepte snake_case (DB) ou camelCase (cache local).
// ─────────────────────────────────────────────────────────────────────────

function toFiniteInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function normalizeAppUpdateConfig(row: unknown): AppUpdateConfig | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;

  const platform = r.platform;
  if (platform !== 'android_mobile' && platform !== 'android_tv') {
    if (isDev) console.warn('[appUpdateService] platform inválida:', platform);
    return null;
  }

  const latestVersionCode = toFiniteInt(r.latest_version_code ?? r.latestVersionCode);
  const minimumVersionCode = toFiniteInt(r.minimum_version_code ?? r.minimumVersionCode);
  if (latestVersionCode === null || minimumVersionCode === null || latestVersionCode < 0 || minimumVersionCode < 0) {
    if (isDev) console.warn('[appUpdateService] version codes inválidos:', row);
    return null;
  }
  if (minimumVersionCode > latestVersionCode) {
    if (isDev) console.warn('[appUpdateService] minimum_version_code > latest_version_code — configuração rejeitada:', row);
    return null;
  }

  const checkIntervalRaw = toFiniteInt(r.check_interval_minutes ?? r.checkIntervalMinutes);
  const checkIntervalMinutes = checkIntervalRaw !== null && checkIntervalRaw > 0 ? checkIntervalRaw : DEFAULT_CHECK_INTERVAL_MINUTES;

  return {
    platform,
    enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
    latestVersionCode,
    minimumVersionCode,
    latestVersionName: toStringOrNull(r.latest_version_name ?? r.latestVersionName),
    titleRecommended: toStringOrNull(r.title_recommended ?? r.titleRecommended),
    messageRecommended: toStringOrNull(r.message_recommended ?? r.messageRecommended),
    titleRequired: toStringOrNull(r.title_required ?? r.titleRequired),
    messageRequired: toStringOrNull(r.message_required ?? r.messageRequired),
    storeUrl: toStringOrNull(r.store_url ?? r.storeUrl),
    checkIntervalMinutes,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Réseau — le timeout (7s) est déjà appliqué globalement par le fetch
// Supabase (cf. src/lib/supabase.js#fetchWithTimeout), donc jamais de requête
// pendante indéfiniment ici.
// ─────────────────────────────────────────────────────────────────────────

export async function fetchRemoteAppUpdateConfig(platform: AppUpdatePlatform): Promise<AppUpdateConfig | null> {
  const { data, error } = await supabase
    .from(APP_UPDATE_TABLE)
    .select('*')
    .eq('platform', platform)
    .maybeSingle();
  if (error) throw error;
  return normalizeAppUpdateConfig(data);
}

// ─────────────────────────────────────────────────────────────────────────
// Cache local (localStorage — même stratégie que src/lib/karaokeOptions.js).
// Une configuration en cache est TOUJOURS utilisable immédiatement au
// démarrage, avant même une éventuelle requête réseau en arrière-plan.
// ─────────────────────────────────────────────────────────────────────────

function cacheKey(platform: AppUpdatePlatform): string {
  return `${CACHE_KEY_PREFIX}${platform}`;
}

export function readAppUpdateCache(platform: AppUpdatePlatform): AppUpdateCacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(platform));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const config = normalizeAppUpdateConfig(parsed?.config);
    const fetchedAt = Number(parsed?.fetchedAt);
    if (!config || !Number.isFinite(fetchedAt)) return null;
    return { config, fetchedAt };
  } catch {
    return null;
  }
}

export function writeAppUpdateCache(platform: AppUpdatePlatform, config: AppUpdateConfig): void {
  try {
    localStorage.setItem(cacheKey(platform), JSON.stringify({ config, fetchedAt: Date.now() }));
  } catch {
    /* stockage indisponível (quota / navegação privada) — jamais bloquant */
  }
}

export function shouldRefreshAppUpdateCache(entry: AppUpdateCacheEntry | null, checkIntervalMinutes: number): boolean {
  if (!entry) return true;
  const intervalMs = Math.max(1, checkIntervalMinutes) * 60_000;
  return Date.now() - entry.fetchedAt >= intervalMs;
}

// ─────────────────────────────────────────────────────────────────────────
// Dismissal — « Mais tarde » est mémorisé PAR latestVersionCode : une
// nouvelle version publiée réaffiche automatiquement la recommandation
// (cf. cas 8/9 des tests).
// ─────────────────────────────────────────────────────────────────────────

function dismissKey(platform: AppUpdatePlatform, latestVersionCode: number): string {
  return `${DISMISS_KEY_PREFIX}${platform}_${latestVersionCode}`;
}

export function isRecommendedUpdateDismissed(platform: AppUpdatePlatform, latestVersionCode: number): boolean {
  try {
    return localStorage.getItem(dismissKey(platform, latestVersionCode)) === '1';
  } catch {
    return false;
  }
}

export function dismissRecommendedUpdate(platform: AppUpdatePlatform, latestVersionCode: number): void {
  try {
    localStorage.setItem(dismissKey(platform, latestVersionCode), '1');
  } catch {
    /* ignore */
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Google Play — market:// d'abord (natif), repli HTTPS sinon. Détection du
// « échec » du market:// via visibilitychange : si la page est toujours
// visible après le délai, aucune app externe n'a pris le relais.
// ─────────────────────────────────────────────────────────────────────────

function isValidHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveStoreHttpsUrl(config?: AppUpdateConfig | null): string {
  return isValidHttpsUrl(config?.storeUrl) ? (config!.storeUrl as string) : getPlayStoreUrl();
}

export function openAppStore(config?: AppUpdateConfig | null): Promise<void> {
  const httpsUrl = resolveStoreHttpsUrl(config);

  if (!isNative()) {
    try {
      const win = window.open(httpsUrl, '_blank', 'noopener');
      if (!win) throw new Error('popup blocked');
      return Promise.resolve();
    } catch {
      return Promise.reject(new Error(STORE_OPEN_ERROR_MESSAGE));
    }
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let httpsTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (httpsTimer) clearTimeout(httpsTimer);
    };
    const onVisibilityChange = () => {
      if (document.hidden && !settled) {
        settled = true;
        cleanup();
        resolve();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const tryHttpsFallback = () => {
      if (settled) return;
      try {
        window.location.href = httpsUrl;
      } catch {
        /* dernière tentative — jugée ci-dessous sur la visibilité de la page */
      }
      setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        if (document.hidden) resolve();
        else reject(new Error(STORE_OPEN_ERROR_MESSAGE));
      }, STORE_OPEN_FALLBACK_DELAY_MS);
    };

    httpsTimer = setTimeout(tryHttpsFallback, STORE_OPEN_FALLBACK_DELAY_MS);

    try {
      window.location.href = getPlayStoreMarketUri();
    } catch {
      if (httpsTimer) clearTimeout(httpsTimer);
      tryHttpsFallback();
    }
  });
}
