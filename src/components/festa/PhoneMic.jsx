import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Tv } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { CONNECTED_WITHIN_MS, createLevelPacker, joinMicChannel, packLevels, packPitches } from '@/lib/phoneMic';
import { voiceMidi } from '@/lib/karaokePitch';

/**
 * /festa?mic=CODE — le celular comme microfone du karaokê grand écran (K3, 2026-11-16).
 *
 * La TV affiche un QR code ; ici, un seul bouton « Ligar o microfone ». Le téléphone mesure
 * le volume de la voix (Web Audio, RMS) et n'envoie QUE ces nombres sur le canal
 * `mic:CODE` (src/lib/phoneMic.js) : l'audio ne quitte jamais le téléphone et rien
 * n'est stocké. L'écran reste allumé (wake lock) tant que le micro est ouvert.
 */
export default function PhoneMic({ code }) {
  useSEO({
    title: 'Microfone — A Música da Segunda',
    description: 'Use o celular como microfone do karaokê na TV.',
    robots: 'noindex, nofollow',
    url: '/festa',
  });

  const [on, setOn] = useState(false);
  const [error, setError] = useState('');
  const [tvSeen, setTvSeen] = useState(false);
  const levelRef = useRef(null);
  const chRef = useRef(null);
  const stopRef = useRef(null);
  const lastTvRef = useRef(-Infinity);

  // Canal ouvert dès l'arrivée : on sait tout de suite si la TV écoute.
  useEffect(() => {
    const ch = joinMicChannel(code, { onTv: () => { lastTvRef.current = performance.now(); } });
    chRef.current = ch;
    const id = setInterval(() => {
      setTvSeen(performance.now() - lastTvRef.current < CONNECTED_WITHIN_MS);
    }, 500);
    return () => { clearInterval(id); chRef.current = null; ch.unsubscribe(); };
  }, [code]);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setOn(false);
  }, []);
  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('O microfone só funciona numa conexão segura (https).');
      return;
    }
    // AudioContext créé et relancé PENDANT le toucher (avant tout `await`) : créé après
    // l'ouverture du micro, il reste suspendu (iPhone, Chrome) et ne mesure que des zéros.
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume?.().catch(() => {});
    try {
      // Réduction de bruit ACTIVE : elle atténue la musique qui sort de la TV et garde
      // la voix proche du téléphone.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; // assez long pour la hauteur des voix graves (K5)
      ctx.createMediaStreamSource(stream).connect(analyser); // jamais vers les haut-parleurs
      const fbuf = new Float32Array(analyser.fftSize);
      const packer = createLevelPacker();
      let raf; let stopped = false; let lock = null;
      let midi = null; let lastPitchAt = 0;
      let hello = setInterval(() => chRef.current?.send('hi', { at: Date.now() }), 2000);
      chRef.current?.send('hi', { at: Date.now() });
      // Écran allumé, sans bloquer le démarrage (la promesse peut ne jamais se résoudre).
      navigator.wakeLock?.request?.('screen').then((l) => { lock = l; }).catch(() => {});
      const onVis = async () => {
        if (document.visibilityState === 'visible' && !stopped) {
          navigator.wakeLock?.request?.('screen').then((l) => { lock = l; }).catch(() => {});
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', onVis);

      const loop = (now) => {
        if (stopped) return;
        analyser.getFloatTimeDomainData(fbuf);
        let sum = 0;
        for (let i = 0; i < fbuf.length; i += 1) sum += fbuf[i] * fbuf[i];
        const rms = Math.sqrt(sum / fbuf.length);
        // Hauteur de la voix ~22 fois par seconde (YIN coûte cher), pour la piste des notes.
        if (now - lastPitchAt >= 45) { lastPitchAt = now; midi = voiceMidi(fbuf, ctx.sampleRate); }
        if (levelRef.current) levelRef.current.style.transform = `scaleY(${Math.min(1, Math.sqrt(rms) * 2.4)})`;
        const packet = packer.push(rms, now, midi);
        if (packet) chRef.current?.send('lv', { l: packLevels(packet), p: packPitches(packet.midis) });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      stopRef.current = () => {
        stopped = true;
        cancelAnimationFrame(raf);
        clearInterval(hello); hello = null;
        document.removeEventListener('visibilitychange', onVis);
        try { lock?.release?.(); } catch { /* ignore */ }
        try { stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
        try { ctx.close(); } catch { /* ignore */ }
      };
      setOn(true);
    } catch (e) {
      try { ctx.close(); } catch { /* ignore */ }
      setError(e?.name === 'NotAllowedError'
        ? 'O microfone foi bloqueado. Permita o microfone para este site nas configurações do navegador e tente de novo.'
        : 'Não foi possível abrir o microfone.');
    }
  }, []);

  return (
    <div className="festa-page phone-mic">
      <p className="phone-mic-eyebrow">Karaokê · código {code}</p>
      <h1 className="phone-mic-title">{on ? 'Pode cantar!' : 'Seu celular é o microfone'}</h1>
      <p className={`phone-mic-tv ${tvSeen ? 'is-on' : ''}`}>
        <Tv size={16} aria-hidden="true" />
        {tvSeen ? 'Conectado à TV' : 'Procurando a TV… deixe a tela « Microfone » aberta na TV'}
      </p>

      <button
        type="button"
        className={`phone-mic-button ${on ? 'is-on' : ''}`}
        onClick={on ? stop : start}
        aria-pressed={on}
      >
        <span className="phone-mic-level" ref={levelRef} aria-hidden="true" />
        {on ? <Mic size={64} aria-hidden="true" /> : <MicOff size={64} aria-hidden="true" />}
        <span className="phone-mic-button-text">{on ? 'Microfone ligado' : 'Ligar o microfone'}</span>
      </button>

      {error && <p className="festa-error">{error}</p>}
      <p className="phone-mic-hint">
        {on
          ? 'Segure o celular perto da boca, como um microfone. Deixe esta tela aberta até o fim da música.'
          : 'O celular manda só o volume da sua voz para a TV, nunca o som. Nada é gravado.'}
      </p>
      {on && <button type="button" className="phone-mic-stop" onClick={stop}>Desligar</button>}
    </div>
  );
}
