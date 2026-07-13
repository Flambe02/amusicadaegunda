/**
 * waveformPeaks — réduit un AudioBuffer décodé localement en une enveloppe compacte
 * (min/max par bucket) pour un rendu canvas rapide. Aucun octet audio brut n'est
 * conservé au-delà du calcul : seule cette petite table de crêtes est gardée en mémoire.
 */

/**
 * @param {AudioBuffer} audioBuffer
 * @param {number} buckets  nombre de colonnes de l'enveloppe (résolution)
 * @returns {{ min: Float32Array, max: Float32Array, buckets: number }}
 */
export function computePeaks(audioBuffer, buckets = 6000) {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const cols = Math.max(1, Math.min(buckets, length));
  const min = new Float32Array(cols);
  const max = new Float32Array(cols);
  const samplesPerBucket = length / cols;

  // Mixe les canaux à la volée (mono) pour l'enveloppe.
  const data = [];
  for (let c = 0; c < channels; c += 1) data.push(audioBuffer.getChannelData(c));

  for (let b = 0; b < cols; b += 1) {
    const startSample = Math.floor(b * samplesPerBucket);
    const endSample = Math.min(length, Math.floor((b + 1) * samplesPerBucket));
    let lo = 1;
    let hi = -1;
    for (let s = startSample; s < endSample; s += 1) {
      let v = 0;
      for (let c = 0; c < channels; c += 1) v += data[c][s];
      v /= channels;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (endSample <= startSample) { lo = 0; hi = 0; }
    min[b] = lo;
    max[b] = hi;
  }
  return { min, max, buckets: cols };
}
