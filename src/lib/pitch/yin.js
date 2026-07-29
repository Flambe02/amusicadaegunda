/**
 * Detetor de pitch monofónico YIN (autocorrelação melhorada).
 *
 * Implementação pura, sem dependências e sem imports de app (`@/…`) — é
 * PARTILHADA entre o navegador (guia de tom em tempo real) e o script offline
 * `scripts/generate-pitch-map.cjs` (via `import()` dinâmico). Não importar nada
 * daqui que puxe React/Vite.
 *
 * YIN (de Cheveigné & Kawahara, 2002): mais fiável para voz do que « maior bin
 * da FFT » (§18). Passos: função de diferença → diferença média cumulativa
 * normalizada → limiar absoluto → interpolação parabólica.
 *
 * Nada aqui grava nem envia áudio: só recebe um Float32Array já capturado.
 */

/** Converte frequência (Hz) para número MIDI (pode ser fracionário). */
export function frequencyToMidi(frequencyHz) {
  return 69 + 12 * Math.log2(frequencyHz / 440);
}

/** Converte número MIDI para frequência (Hz). */
export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Diferença em cents entre duas frequências (positivo = f1 mais aguda). */
export function centsBetween(f1, f2) {
  return 1200 * Math.log2(f1 / f2);
}

/**
 * Deteta o pitch de um buffer de áudio mono.
 *
 * @param {Float32Array} buffer  amostras no domínio do tempo (−1..1)
 * @param {number} sampleRate    taxa de amostragem (Hz)
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.15]  limiar absoluto YIN
 * @param {number} [opts.minFrequencyHz=70]
 * @param {number} [opts.maxFrequencyHz=1100]
 * @returns {{ frequencyHz: number, probability: number, rms: number }}
 *   frequencyHz = 0 se não houver pitch fiável. probability ∈ 0..1 (confiança).
 */
export function detectPitch(buffer, sampleRate, opts = {}) {
  const threshold = opts.threshold ?? 0.15;
  const minFreq = opts.minFrequencyHz ?? 70;
  const maxFreq = opts.maxFrequencyHz ?? 1100;

  const size = buffer.length;
  const rms = computeRms(buffer);

  // tau (atraso em amostras) corresponde a uma frequência = sampleRate / tau.
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(Math.floor(size / 2), Math.ceil(sampleRate / minFreq));
  if (tauMax <= tauMin) return { frequencyHz: 0, probability: 0, rms };

  // 1) Função de diferença d(tau).
  const diff = new Float32Array(tauMax + 1);
  for (let tau = tauMin; tau <= tauMax; tau += 1) {
    let sum = 0;
    for (let i = 0; i < size - tauMax; i += 1) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // 2) Diferença média cumulativa normalizada d'(tau).
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[tauMin] = 1;
  let runningSum = 0;
  for (let tau = tauMin + 1; tau <= tauMax; tau += 1) {
    runningSum += diff[tau];
    cmnd[tau] = runningSum > 0 ? (diff[tau] * (tau - tauMin)) / runningSum : 1;
  }

  // 3) Limiar absoluto: primeiro mínimo local abaixo do limiar.
  let tauEstimate = -1;
  for (let tau = tauMin + 1; tau <= tauMax; tau += 1) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 <= tauMax && cmnd[tau + 1] < cmnd[tau]) tau += 1;
      tauEstimate = tau;
      break;
    }
  }
  // Sem cruzamento do limiar → escolhe o mínimo global (menos fiável).
  if (tauEstimate === -1) {
    let best = tauMin + 1;
    for (let tau = tauMin + 2; tau <= tauMax; tau += 1) {
      if (cmnd[tau] < cmnd[best]) best = tau;
    }
    tauEstimate = best;
    // Se nem o mínimo global é convincente, desiste.
    if (cmnd[tauEstimate] >= 0.6) return { frequencyHz: 0, probability: 0, rms };
  }

  // 4) Interpolação parabólica para refinar o tau.
  const betterTau = parabolicInterpolation(cmnd, tauEstimate, tauMax);
  const frequencyHz = sampleRate / betterTau;
  if (frequencyHz < minFreq || frequencyHz > maxFreq) {
    return { frequencyHz: 0, probability: 0, rms };
  }

  // Confiança: 1 − d'(tau) dá uma medida útil (mínimo profundo → alta confiança).
  const probability = Math.max(0, Math.min(1, 1 - cmnd[tauEstimate]));
  return { frequencyHz, probability, rms };
}

function computeRms(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

function parabolicInterpolation(arr, tau, tauMax) {
  const x0 = tau > 0 ? tau - 1 : tau;
  const x2 = tau + 1 <= tauMax ? tau + 1 : tau;
  if (x0 === tau) return arr[tau] <= arr[x2] ? tau : x2;
  if (x2 === tau) return arr[tau] <= arr[x0] ? tau : x0;
  const s0 = arr[x0];
  const s1 = arr[tau];
  const s2 = arr[x2];
  const denom = 2 * (2 * s1 - s2 - s0);
  if (denom === 0) return tau;
  return tau + (s2 - s0) / denom;
}
