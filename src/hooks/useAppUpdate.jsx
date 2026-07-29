// Orchestration React du contrôle de version distant — seule couche qui
// connaît React (état, effets, cycle de vie). Toute la logique pure (calcul
// d'état, validation, cache, market://) vit dans src/services/appUpdateService.ts.
// Documentation complète : APP_UPDATE_SYSTEM.md.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { isNative } from '@/native';
import {
  detectAppUpdatePlatform, readCurrentVersion, computeUpdateState,
  fetchRemoteAppUpdateConfig, readAppUpdateCache, writeAppUpdateCache, shouldRefreshAppUpdateCache,
  isRecommendedUpdateDismissed, dismissRecommendedUpdate as persistRecommendedDismissal,
  openAppStore,
} from '@/services/appUpdateService';

const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;

const AppUpdateContext = createContext(null);

export function useAppUpdate() {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) throw new Error('useAppUpdate must be used within AppUpdateProvider');
  return ctx;
}

// Filet anti-rafale : jamais plus d'une requête réseau par minute, même si
// check_interval_minutes est mal réglé ou si l'app revient au premier plan en boucle.
const MIN_NETWORK_INTERVAL_MS = 60_000;

export function AppUpdateProvider({ children }) {
  // Décisions figées au montage (même convention que src/tv/TvApp.jsx#isTV) :
  // ni le natif ni la plateforme ne changent en cours de session.
  const [native] = useState(() => isNative());
  const [platform] = useState(() => detectAppUpdatePlatform());

  const [status, setStatus] = useState(() => (isNative() ? 'checking' : 'none'));
  const [config, setConfig] = useState(null);
  const [currentVersionCode, setCurrentVersionCode] = useState(null);
  const [currentVersionName, setCurrentVersionName] = useState(null);
  const [recommendedDismissed, setRecommendedDismissed] = useState(false);

  const versionCodeRef = useRef(null);
  const versionNameRef = useRef('');
  const configRef = useRef(null);
  const lastFetchAtRef = useRef(0);
  const shownRef = useRef(new Set());
  const checkInFlightRef = useRef(false);

  // Applique une config (cache ou réseau) : calcule l'état, la dismissal, et
  // journalise "shown" une seule fois par (état, latestVersionCode).
  const applyConfig = useCallback((cfg) => {
    configRef.current = cfg;
    setConfig(cfg);
    const state = computeUpdateState(versionCodeRef.current, cfg);
    setStatus(state);

    const dismissed = cfg ? isRecommendedUpdateDismissed(platform, cfg.latestVersionCode) : false;
    setRecommendedDismissed(dismissed);

    if (state === 'recommended' || state === 'required') {
      const willRender = state === 'required' || !dismissed;
      const key = `${state}:${cfg?.latestVersionCode}`;
      if (willRender && !shownRef.current.has(key)) {
        shownRef.current.add(key);
        trackEvent(state === 'required' ? 'app_update_required_shown' : 'app_update_recommended_shown', {
          platform,
          current_version_code: versionCodeRef.current,
          latest_version_code: cfg?.latestVersionCode,
          minimum_version_code: cfg?.minimumVersionCode,
          current_version_name: versionNameRef.current,
          latest_version_name: cfg?.latestVersionName,
        });
      }
    }
    return state;
  }, [platform]);

  const fetchRemote = useCallback(async ({ blocking }) => {
    try {
      const remote = await fetchRemoteAppUpdateConfig(platform);
      lastFetchAtRef.current = Date.now();
      trackEvent('app_update_check_completed', {
        platform,
        current_version_code: versionCodeRef.current,
        latest_version_code: remote?.latestVersionCode ?? null,
        minimum_version_code: remote?.minimumVersionCode ?? null,
        current_version_name: versionNameRef.current,
        latest_version_name: remote?.latestVersionName ?? null,
      });
      if (remote) {
        writeAppUpdateCache(platform, remote);
        applyConfig(remote);
      } else if (blocking) {
        // Ligne absente/malformée : jamais bloquant, mais ce n'est pas un échec réseau.
        applyConfig(null);
      }
    } catch (err) {
      if (isDev) console.warn('[useAppUpdate] verificação falhou:', err);
      if (blocking) {
        configRef.current = null;
        setConfig(null);
        setStatus('error');
        setRecommendedDismissed(false);
      }
    }
  }, [platform, applyConfig]);

  const check = useCallback(async ({ forceNetwork = false } = {}) => {
    // Filet de réentrance : évite deux check() concurrents qui se marchent
    // dessus (double appel React StrictMode en dev, resume qui chevauche le
    // check de démarrage encore en vol, etc.) — chaque check() se termine
    // toujours (try/finally), donc jamais bloqué à "true" indéfiniment.
    if (checkInFlightRef.current) return;
    checkInFlightRef.current = true;
    try {
      if (!native) { setStatus('none'); return; }

      const { versionCode, versionName } = await readCurrentVersion();
      versionCodeRef.current = versionCode;
      versionNameRef.current = versionName;
      setCurrentVersionCode(Number.isFinite(versionCode) ? versionCode : null);
      setCurrentVersionName(versionName || null);

      const cache = readAppUpdateCache(platform);
      if (cache) {
        // Le cache gate immédiatement le démarrage — jamais d'attente réseau
        // quand une configuration valide est déjà connue (cf. §7 fail-safe).
        applyConfig(cache.config);
        const stale = forceNetwork || shouldRefreshAppUpdateCache(cache, cache.config.checkIntervalMinutes);
        const throttled = !forceNetwork && Date.now() - lastFetchAtRef.current < MIN_NETWORK_INTERVAL_MS;
        if (stale && !throttled) await fetchRemote({ blocking: false });
        return;
      }

      // Pas de cache (1er lancement) : seul cas où on attend la réponse réseau
      // (bornée par le timeout global ~7s, cf. src/lib/supabase.js) avant de
      // décider — évite d'afficher l'accueil puis de le remplacer soudainement.
      setStatus('checking');
      await fetchRemote({ blocking: true });
    } finally {
      checkInFlightRef.current = false;
    }
  }, [native, platform, applyConfig, fetchRemote]);

  // ── Démarrage ──
  useEffect(() => { check(); }, [check]);

  // ── Retour au premier plan (ex. après avoir visité la Google Play) ──
  useEffect(() => {
    if (!native) return undefined;
    let handle;
    let cancelled = false;
    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return;
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) check();
      }).then((h) => { handle = h; });
    }).catch(() => { /* pas de Capacitor (web/PWA) — rien à nettoyer */ });
    return () => { cancelled = true; handle?.remove?.(); };
  }, [native, check]);

  const dismissRecommendedUpdate = useCallback(() => {
    if (!configRef.current) return;
    persistRecommendedDismissal(platform, configRef.current.latestVersionCode);
    setRecommendedDismissed(true);
    trackEvent('app_update_recommended_dismissed', {
      platform,
      current_version_code: versionCodeRef.current,
      latest_version_code: configRef.current.latestVersionCode,
    });
  }, [platform]);

  const openStore = useCallback(async () => {
    trackEvent('app_update_store_clicked', {
      platform,
      current_version_code: versionCodeRef.current,
      latest_version_code: configRef.current?.latestVersionCode ?? null,
    });
    try {
      await openAppStore(configRef.current);
    } catch (err) {
      trackEvent('app_update_store_open_failed', { platform });
      throw err;
    }
  }, [platform]);

  const refreshUpdateStatus = useCallback(() => check({ forceNetwork: true }), [check]);

  const value = {
    status,
    currentVersionCode,
    currentVersionName,
    config,
    platform,
    recommendedDismissed,
    openStore,
    dismissRecommendedUpdate,
    refreshUpdateStatus,
  };

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}
