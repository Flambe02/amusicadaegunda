/**
 * waveformPeaks — réduit un AudioBuffer décodé localement en une enveloppe compacte
 * (min/max par bucket) pour un rendu canvas rapide. Aucun octet audio brut n'est
 * conservé au-delà du calcul : seule cette petite table de crêtes est gardée en mémoire.
 */

// Résolution cible : ~3ms par colonne — assez fin pour qu'un zoom serré sur un
// seul mot (quelques centaines de ms) ait encore plusieurs dizaines de colonnes
// SOURCE distinctes à afficher (au lieu de réutiliser les mêmes ~30ms/colonne
// d'avant, qui donnaient une onde "en escalier" une fois zoomée). Le nombre de
// colonnes s'adapte donc à la durée réelle du fichier ; plafonné pour rester
// raisonnable en mémoire même sur un très long fichier.
const TARGET_BUCKET_SEC = 0.003;
const MAX_BUCKETS = 200000;

/**
 * @param {AudioBuffer} audioBuffer
 * @param {number} [buckets]  nombre de colonnes de l'enveloppe — si omis, calculé
 *   automatiquement à partir de la durée pour une résolution fine et constante.
 * @returns {{ min: Float32Array, max: Float32Array, buckets: number }}
 */
export function computePeaks(audioBuffer, buckets) {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const autoBuckets = Math.min(MAX_BUCKETS, Math.max(1, Math.round(audioBuffer.duration / TARGET_BUCKET_SEC)));
  const cols = Math.max(1, Math.min(buckets || autoBuckets, length));
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
