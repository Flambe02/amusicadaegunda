/**
 * Configuração centralizada do « Guia de tom · Beta ».
 *
 * TODOS os limiares de deteção, comparação e latência vivem aqui para serem
 * fáceis de afinar sem tocar na lógica (§21/§22/§24). Nenhum valor está
 * espalhado pelos componentes.
 *
 * Nota importante de produto: NÃO existe pontuação/nota (C, B, A…). O guia só
 * mostra Afinado / Mais alto / Mais baixo / Sem voz. Manter simples e familiar.
 */

// ── Deteção de pitch (YIN) ──
export const PITCH_DETECTION = {
  // Tamanho do buffer de análise (potência de 2). 2048 dá boa resolução grave
  // sem custar demasiado num telemóvel Android médio.
  bufferSize: 2048,
  // Limiar YIN (quanto menor, mais exigente). 0.15 é robusto para voz.
  yinThreshold: 0.15,
  // Faixa de canto humana plausível (Hz). Fora disto → ignorado (§19).
  minFrequencyHz: 70,
  maxFrequencyHz: 1100,
  // Confiança mínima (0..1) para aceitar uma leitura (§19).
  minConfidence: 0.7,
  // RMS mínimo do sinal para considerar que há voz (silêncio → « Sem voz »).
  minRms: 0.012,
  // Intervalo de análise de áudio (ms). 35 ms ≈ 28 leituras/seg.
  analysisIntervalMs: 35,
  // Intervalo de atualização do estado React (ms) — separado da análise para
  // NÃO re-renderizar a cada leitura (§18/§35).
  statusIntervalMs: 90,
};

// ── Suavização (§20) ──
export const PITCH_SMOOTHING = {
  medianWindow: 5,        // janela do filtro de mediana (frames)
  emaAlpha: 0.35,         // fator da média móvel exponencial (0..1)
  // Correção de oitava: se a nova leitura saltar ~1 oitava mas estiver perto
  // do valor estável a menos essa oitava, preferimos a oitava plausível.
  octaveTolerstandCents: 80,
  // Se não houver voz fiável durante este tempo, apagamos o ponto (ms).
  holdMs: 220,
};

// ── Comparação afinado / desafinado (§21) ──
export const PITCH_COMPARISON = {
  inTuneCents: 35,        // |Δ| ≤ 35 cents → Afinado
  slightlyOffCents: 70,   // 35..70 → ligeiramente fora (ainda amarelo suave)
  // acima de 70 → claramente fora (Mais alto / Mais baixo)
};

// ── Compensação de latência da análise (§22) ──
// Microfone + reprodução + Web Audio introduzem atraso. Este valor NÃO altera
// os dados de sincronização das letras nem o pitch-map; é só para a comparação.
export const PITCH_LATENCY = {
  // Valor por defeito por plataforma (ms). Afinável; exposto só em dev.
  defaultMs: 120,
  webMs: 120,
  capacitorAndroidMs: 140,
  capacitorIosMs: 110,
};

// ── Janela temporal do guia visual (§23) ──
export const PITCH_WINDOW = {
  beforeMs: 1500,         // 1,5 s antes do playhead
  afterMs: 3500,          // 3,5 s depois
  playheadRatio: 0.45,    // playhead a ~45% da largura
  minNoteWidthPx: 6,      // largura mínima de uma barra de nota
};

// ── Escala vertical (§24) ──
export const PITCH_SCALE = {
  minRangeSemitones: 8,   // amplitude mínima visível
  paddingSemitones: 2,    // margem acima/abaixo
  // Suavização da transição de escala (0..1, quanto menor mais lento).
  scaleEaseAlpha: 0.08,
};

/**
 * Latência de análise adequada à plataforma atual.
 * @param {'web'|'android'|'ios'} platform
 */
export function pitchLatencyForPlatform(platform) {
  if (platform === 'android') return PITCH_LATENCY.capacitorAndroidMs;
  if (platform === 'ios') return PITCH_LATENCY.capacitorIosMs;
  return PITCH_LATENCY.webMs;
}
