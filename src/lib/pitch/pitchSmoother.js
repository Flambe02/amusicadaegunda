/**
 * Suavização do pitch detetado (§20) — puro, sem React.
 *
 * As leituras cruas do YIN são ruidosas e sofrem de erros de oitava. Antes de
 * desenhar aplicamos:
 *   1. filtro de mediana (remove picos isolados);
 *   2. correção de oitava (evita o ponto saltar do fundo para o topo);
 *   3. média móvel exponencial (movimento fluido);
 *   4. histerese temporal (mantém o último valor durante um curto « hold » sem
 *      voz fiável, depois apaga).
 *
 * Trabalha em MIDI (escala logarítmica → interpolar em MIDI é perceptualmente
 * correto e simplifica a correção de oitava = ±12).
 */
import { frequencyToMidi } from './yin';

export class PitchSmoother {
  constructor(cfg) {
    this.medianWindow = cfg.medianWindow;
    this.alpha = cfg.emaAlpha;
    this.octaveToleranceCents = cfg.octaveTolerstandCents ?? cfg.octaveToleranceCents ?? 80;
    this.holdMs = cfg.holdMs;
    this.reset();
  }

  reset() {
    this._median = [];
    this._ema = null;
    this._lastValidAt = 0;
    this._value = null;
  }

  /**
   * Alimenta uma leitura crua. `frequencyHz <= 0` ou confiança/rms insuficiente
   * devem ser passados como `valid=false` para acionar o « hold ».
   * @param {number} frequencyHz
   * @param {boolean} valid
   * @param {number} nowMs  performance.now()
   * @returns {number|null} MIDI suavizado, ou null se deve estar apagado.
   */
  push(frequencyHz, valid, nowMs) {
    if (!valid || !(frequencyHz > 0)) {
      // Sem voz fiável: mantém o último valor durante holdMs, depois apaga.
      if (this._value != null && nowMs - this._lastValidAt <= this.holdMs) {
        return this._value;
      }
      this.reset();
      return null;
    }

    let midi = frequencyToMidi(frequencyHz);
    midi = this._correctOctave(midi);

    // Mediana sobre janela recente.
    this._median.push(midi);
    if (this._median.length > this.medianWindow) this._median.shift();
    const med = median(this._median);

    // EMA.
    this._ema = this._ema == null ? med : this._ema + this.alpha * (med - this._ema);
    this._value = this._ema;
    this._lastValidAt = nowMs;
    return this._value;
  }

  // Se a nova leitura estiver ~1 oitava distante do valor estável mas muito
  // perto quando corrigida por ±12, prefere a oitava plausível.
  _correctOctave(midi) {
    if (this._ema == null) return midi;
    const candidates = [midi, midi + 12, midi - 12, midi + 24, midi - 24];
    let best = midi;
    let bestDist = Math.abs(midi - this._ema);
    for (const c of candidates) {
      const d = Math.abs(c - this._ema);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    // Só aceita a correção de oitava se aproximar claramente (evita colar tudo).
    const tolSemitones = this.octaveToleranceCents / 100;
    if (best !== midi && bestDist <= (0.5 + tolSemitones)) return best;
    return midi;
  }
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
