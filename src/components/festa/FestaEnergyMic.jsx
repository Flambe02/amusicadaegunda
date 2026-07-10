import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

const SEND_INTERVAL_MS = 150; // ~6-7 lectures/s — suffisant pour une jauge fluide, léger sur Realtime

/**
 * Micro à distance (Modo Festa) — la TV Android n'a pas de microphone, donc n'importe
 * quel téléphone présent peut prêter le sien pendant qu'une chanson joue : on mesure
 * le niveau sonore localement (RMS, Web Audio API — même approche que le medidor de
 * energia du lecteur karaoké) et on envoie seulement ce nombre (PAS l'audio) via
 * `sendEnergyReading`. Activation manuelle (bouton) — n'importe quel invité, pas
 * seulement celui identifié comme le chanteur (décision produit : plus permissif).
 */
export default function FestaEnergyMic({ entry, sendEnergyReading }) {
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');
  const stopRef = useRef(null);
  const lastSendRef = useRef(0);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setActive(false);
    setLevel(0);
  }, []);

  // Coupe automatiquement si la chanson change (évite d'envoyer une énergie qui
  // correspondrait à la mauvaise entrée de fila).
  useEffect(() => () => stop(), [entry?.id, stop]);

  const start = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let raf;
      let stopped = false;

      const loop = () => {
        if (stopped) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        setLevel(rms);
        const now = Date.now();
        if (entry && now - lastSendRef.current >= SEND_INTERVAL_MS) {
          lastSendRef.current = now;
          sendEnergyReading(entry.id, rms);
        }
        raf = requestAnimationFrame(loop);
      };
      loop();

      stopRef.current = () => {
        stopped = true;
        if (raf) cancelAnimationFrame(raf);
        try { stream.getTracks().forEach((tr) => tr.stop()); } catch { /* ignore */ }
        try { ctx.close(); } catch { /* ignore */ }
      };
      setActive(true);
    } catch {
      setError('Não foi possível aceder ao microfone.');
    }
  }, [entry, sendEnergyReading]);

  if (!entry) return null;

  return (
    <div className="festa-energy-mic">
      <button
        type="button"
        className={`festa-energy-btn ${active ? 'is-active' : ''}`}
        onClick={active ? stop : start}
      >
        {active ? <MicOff size={16} /> : <Mic size={16} />}
        {active ? 'Desativar microfone' : 'Emprestar meu microfone (a TV não tem)'}
      </button>
      {active && (
        <div className="festa-energy-bar-track" aria-hidden="true">
          <div className="festa-energy-bar-fill" style={{ width: `${Math.min(100, level * 260)}%` }} />
        </div>
      )}
      {error && <p className="festa-error">{error}</p>}
    </div>
  );
}
