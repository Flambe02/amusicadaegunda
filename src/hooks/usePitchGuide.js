import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPitch, midiToFrequency, centsBetween } from '@/lib/pitch/yin';
import { PitchSmoother } from '@/lib/pitch/pitchSmoother';
import { MicrophonePitchAnalyzer } from '@/lib/pitch/microphoneService';
import { activeNoteAt } from '@/lib/pitchReference';
import {
  PITCH_DETECTION, PITCH_SMOOTHING, PITCH_COMPARISON, pitchLatencyForPlatform,
} from '@/lib/pitch/pitchConfig';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/**
 * Orquestrador do « Guia de tom · Beta » (§36).
 *
 * Junta microfone (MicrophonePitchAnalyzer) + deteção YIN + suavização +
 * comparação com a melodia de referência no instante atual da reprodução. NUNCA
 * arranca o microfone sozinho: só o gesto explícito `activate()` o faz (§13/§33).
 *
 * Dados de render de alta frequência (nota detetada/esperada, cents) vivem num
 * REF mutável (`guideRef`) lido pelo canvas — sem re-render por frame (§35). O
 * estado React só carrega um `status` grosso (throttle) para o cabeçalho/pílula.
 *
 * @param {object} p
 * @param {boolean} p.enabled            preferência ligada (opts.pitchGuide)
 * @param {Array|null} p.notes           notas de referência (ou null)
 * @param {() => number} p.getMediaTimeMs  tempo de mídia atual (ms)
 * @param {boolean} p.isPlaying
 */
export function usePitchGuide({ enabled, notes, getMediaTimeMs, isPlaying }) {
  const hasReference = Array.isArray(notes) && notes.length > 0;

  const [status, setStatus] = useState('disabled');   // ver PitchGuideState.status (§36)
  const [permission, setPermission] = useState('unknown');
  const [error, setError] = useState(null);           // { code, message } | null
  const [active, setActive] = useState(false);        // microfone realmente a correr

  // Estado de render de alta frequência (mutado, não provoca re-render).
  const guideRef = useRef({
    status: 'disabled',
    detectedMidi: null,
    detectedConfidence: 0,
    expectedMidi: null,
    centsDifference: null,
    active: false,
    updatedAt: 0,
  });

  const analyzerRef = useRef(null);
  const smootherRef = useRef(null);
  const latencyMsRef = useRef(pitchLatencyForPlatform('web'));
  const notesRef = useRef(notes); notesRef.current = notes;
  const getTimeRef = useRef(getMediaTimeMs); getTimeRef.current = getMediaTimeMs;

  // Latência por plataforma (Capacitor Android/iOS diferem do web) — uma vez.
  useEffect(() => {
    let cancelled = false;
    import('@capacitor/core')
      .then(({ Capacitor }) => {
        if (cancelled) return;
        const plat = Capacitor?.getPlatform?.() || 'web';
        latencyMsRef.current = pitchLatencyForPlatform(plat === 'ios' ? 'ios' : plat === 'android' ? 'android' : 'web');
      })
      .catch(() => { /* web puro: valor por defeito */ });
    return () => { cancelled = true; };
  }, []);

  // ── Callback de análise (frequência elevada, sem setState) ──
  const onFrame = useCallback((buffer, sampleRate) => {
    const g = guideRef.current;
    const { frequencyHz, probability, rms } = detectPitch(buffer, sampleRate, {
      threshold: PITCH_DETECTION.yinThreshold,
      minFrequencyHz: PITCH_DETECTION.minFrequencyHz,
      maxFrequencyHz: PITCH_DETECTION.maxFrequencyHz,
    });
    const valid = frequencyHz > 0
      && probability >= PITCH_DETECTION.minConfidence
      && rms >= PITCH_DETECTION.minRms;

    const now = performance.now();
    const smoothedMidi = smootherRef.current?.push(frequencyHz, valid, now) ?? null;

    // Nota esperada no instante compensado pela latência (§22).
    const refTimeMs = getTimeRef.current() - latencyMsRef.current;
    const expected = notesRef.current ? activeNoteAt(notesRef.current, refTimeMs) : null;

    g.detectedMidi = smoothedMidi;
    g.detectedConfidence = valid ? probability : 0;
    g.expectedMidi = expected ? expected.midi : null;
    g.active = true;

    if (smoothedMidi == null) {
      g.centsDifference = null;
      g.status = expected ? 'noVoice' : 'listening';
    } else if (expected == null) {
      g.centsDifference = null;
      g.status = 'listening'; // a ouvir, mas sem nota esperada agora (intervalo)
    } else {
      const cents = centsBetween(midiToFrequency(smoothedMidi), midiToFrequency(expected.midi));
      g.centsDifference = cents;
      const abs = Math.abs(cents);
      if (abs <= PITCH_COMPARISON.inTuneCents) g.status = 'inTune';
      else if (cents < 0) g.status = 'tooLow';   // voz mais grave → cantar mais alto
      else g.status = 'tooHigh';                 // voz mais aguda → cantar mais baixo
    }
    g.updatedAt = now;

    if (isDev && Math.random() < 0.02) {
      // Logging só em desenvolvimento (§22).
      const f = frequencyHz > 0 ? frequencyHz.toFixed(1) : '—';
       
      console.debug(`[guia-de-tom] f=${f}Hz midi=${smoothedMidi?.toFixed(2) ?? '—'} exp=${g.expectedMidi ?? '—'} Δ=${g.centsDifference?.toFixed(0) ?? '—'}c ${g.status}`);
    }
  }, []);

  // ── Ativação explícita (gesto do utilizador) ──
  const activate = useCallback(async () => {
    if (analyzerRef.current?.isRunning) return true;
    setError(null);
    setStatus('initializing');
    guideRef.current.status = 'initializing';
    smootherRef.current = new PitchSmoother(PITCH_SMOOTHING);
    const analyzer = new MicrophonePitchAnalyzer(PITCH_DETECTION, onFrame);
    analyzerRef.current = analyzer;
    try {
      await analyzer.start();
      setPermission('granted');
      setActive(true);
      setStatus('listening');
      guideRef.current.status = 'listening';
      return true;
    } catch (err) {
      analyzerRef.current = null;
      const code = err?.code || 'unknown';
      setError({ code, message: err?.message || 'Erro do microfone' });
      if (code === 'denied') setPermission('denied');
      setStatus('error');
      guideRef.current.status = 'error';
      guideRef.current.active = false;
      setActive(false);
      return false;
    }
  }, [onFrame]);

  // ── Desativação (pára tudo, liberta recursos) ──
  const deactivate = useCallback(() => {
    try { analyzerRef.current?.stop(); } catch { /* ignore */ }
    analyzerRef.current = null;
    smootherRef.current = null;
    setActive(false);
    const g = guideRef.current;
    g.active = false; g.detectedMidi = null; g.expectedMidi = null; g.centsDifference = null;
    g.status = 'disabled';
    setStatus(hasReference ? 'disabled' : 'noReference');
  }, [hasReference]);

  const retry = useCallback(() => { deactivate(); return activate(); }, [deactivate, activate]);

  // Se a preferência for desligada, ou não houver referência → desativar.
  useEffect(() => {
    if (!enabled || !hasReference) {
      if (analyzerRef.current) deactivate();
      else setStatus(hasReference ? 'disabled' : 'noReference');
    } else if (!active) {
      setStatus('disabled'); // ligado mas ainda sem micro → aguarda gesto « Ativar »
    }
  }, [enabled, hasReference, active, deactivate]);

  // Pausa (§30): após ~1,2 s em pausa, suspende a análise mantendo o stream.
  useEffect(() => {
    if (!active) return undefined;
    if (isPlaying) { analyzerRef.current?.setActive(true); return undefined; }
    const id = setTimeout(() => { analyzerRef.current?.setActive(false); }, 1200);
    return () => clearTimeout(id);
  }, [active, isPlaying]);

  // Segundo plano (§14/§32): parar totalmente o microfone; requer nova ativação.
  useEffect(() => {
    if (!active) return undefined;
    const onVis = () => { if (document.visibilityState === 'hidden') deactivate(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active, deactivate]);

  // Throttle do status para React (não a cada frame de análise) — §18/§35.
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => {
      const s = guideRef.current.status;
      setStatus((prev) => (prev === s ? prev : s));
    }, PITCH_DETECTION.statusIntervalMs);
    return () => clearInterval(id);
  }, [active]);

  // Limpeza total ao desmontar (§32/§35).
  useEffect(() => () => {
    try { analyzerRef.current?.stop(); } catch { /* ignore */ }
    analyzerRef.current = null;
    smootherRef.current = null;
  }, []);

  return { status, permission, error, active, guideRef, activate, deactivate, retry };
}
