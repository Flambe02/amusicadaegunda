/**
 * Microfone escolhido no « Configurar microfone » do grand écran (karaokê K1, 2026-11-16).
 *
 * Guardado no aparelho (localStorage), nunca enviado. Três estados :
 *   - null                         → ainda não configurado ;
 *   - { source: 'none' }           → sem microfone (só a letra) ;
 *   - { source: 'device', deviceId, label, testedAt } → um microfone testado ;
 *   - { source: 'phone', code }    → um celular como microfone (K3, src/lib/phoneMic.js).
 * O `deviceId` do navegador pode mudar (outro navegador, permissões limpas) : se o
 * aparelho sumir, `audioConstraints` volta ao microfone padrão em vez de falhar.
 */

export const MIC_PREFS_KEY = 'amds-mic-v1';

export function loadMicPrefs(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(MIC_PREFS_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value?.source === 'none') return { source: 'none' };
    if (value?.source === 'phone' && typeof value.code === 'string' && value.code) return { source: 'phone', code: value.code };
    if (value?.source === 'device' && typeof value.deviceId === 'string') {
      return { source: 'device', deviceId: value.deviceId, label: String(value.label || ''), testedAt: value.testedAt || null };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveMicPrefs(prefs, storage = globalThis.localStorage) {
  try {
    if (!prefs) storage?.removeItem(MIC_PREFS_KEY);
    else storage?.setItem(MIC_PREFS_KEY, JSON.stringify(prefs));
  } catch { /* stockage indisponible : le choix vaut pour la session */ }
}

/**
 * Contrainte `audio` pour getUserMedia : le microfone escolhido (`ideal`, pas `exact` —
 * s'il a disparu, le navigateur prend celui par défaut), sans traitement qui écrase la
 * voix (l'annulation d'écho reste : la musique sort des enceintes).
 */
export function audioConstraints(prefs) {
  const base = { echoCancellation: true, noiseSuppression: false, autoGainControl: false };
  if (prefs?.source === 'device' && prefs.deviceId && prefs.deviceId !== 'default') {
    return { ...base, deviceId: { ideal: prefs.deviceId } };
  }
  return base;
}

/** Nom lisible d'un micro : sans « Par défaut - » / « Default - » ni identifiant USB. */
export function micDisplayName(label) {
  const clean = String(label || '')
    .replace(/^(par défaut|default|padrão|predeterminado)\s*-\s*/i, '')
    .replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)/gi, '')
    .trim();
  return clean || 'Microfone';
}

/** Ligne d'état affichée dans « Antes de cantar ». */
export function micStatus(prefs) {
  if (!prefs) return { kind: 'unset', text: 'Microfone ainda não configurado' };
  if (prefs.source === 'none') return { kind: 'none', text: 'Sem microfone · só a letra' };
  if (prefs.source === 'phone') return { kind: 'phone', text: 'Celular como microfone' };
  return { kind: 'device', text: micDisplayName(prefs.label) };
}

/** Un micro qui donne une nota : celui de l'appareil ou un celular. */
export function hasScoringMic(prefs) {
  return prefs?.source === 'device' || prefs?.source === 'phone';
}

/** RMS d'un buffer d'octets (getByteTimeDomainData) → 0..1. */
export function rmsOfBytes(buf) {
  if (!buf || !buf.length) return 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) { const v = (buf[i] - 128) / 128; sum += v * v; }
  return Math.sqrt(sum / buf.length);
}
