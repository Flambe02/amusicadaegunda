/**
 * Serviço de microfone para o guia de tom (§14/§17).
 *
 * Responsabilidade única: abrir o microfone, montar um grafo Web Audio mínimo
 * (MediaStreamSource → AnalyserNode) e chamar um callback com o buffer no
 * domínio do tempo a cada análise. A deteção/suavização vive fora (hook).
 *
 * PRIVACIDADE / SEGURANÇA (§14/§32):
 *  - a fonte do microfone NUNCA é ligada a `ctx.destination` (sem retorno pelas
 *    colunas / sem eco);
 *  - nada é gravado, guardado ou enviado — só se lê o buffer para análise e
 *    descarta-se;
 *  - `stop()` pára todas as tracks e fecha o AudioContext.
 *
 * Não importa React. Utilizável em web/PWA/Capacitor (mesma WebView).
 */

export class MicrophonePitchAnalyzer {
  /**
   * @param {object} cfg
   * @param {number} cfg.bufferSize
   * @param {number} cfg.analysisIntervalMs
   * @param {(buffer: Float32Array, sampleRate: number, ctxTimeMs: number) => void} onFrame
   */
  constructor(cfg, onFrame) {
    this.cfg = cfg;
    this.onFrame = onFrame;
    this.stream = null;
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    this.buffer = null;
    this.timer = null;
    this._active = false;
    this._starting = false;
  }

  get isRunning() { return Boolean(this.stream); }

  /**
   * Abre o microfone e arranca a análise. Lança um Error tipado em falha:
   *  - 'unsupported'  : sem navigator.mediaDevices / getUserMedia
   *  - 'denied'       : permissão recusada (NotAllowedError)
   *  - 'no-device'    : sem microfone (NotFoundError)
   *  - 'audio-context': AudioContext não pôde iniciar
   *  - 'unknown'
   */
  async start() {
    if (this._starting || this.isRunning) return;
    this._starting = true;
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw taggedError('unsupported', 'getUserMedia indisponível');
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          },
          video: false,
        });
      } catch (err) {
        throw mapGumError(err);
      }
      this.stream = stream;

      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) { this._teardownStream(); throw taggedError('audio-context', 'AudioContext indisponível'); }
      this.ctx = new Ctor();
      // Só se pode retomar dentro de um gesto do utilizador (chamador garante-o).
      try { await this.ctx.resume?.(); } catch { /* segue mesmo suspenso */ }

      this.source = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.cfg.bufferSize;
      this.analyser.smoothingTimeConstant = 0;
      // ⚠️ NUNCA ligar a ctx.destination (sem monitorização/eco).
      this.source.connect(this.analyser);
      this.buffer = new Float32Array(this.analyser.fftSize);

      this._active = true;
      this._loop();
    } finally {
      this._starting = false;
    }
  }

  /** Pausa/retoma a análise mantendo o stream aberto (evita nova permissão). */
  setActive(active) {
    if (active === this._active) return;
    this._active = active;
    if (active && this.isRunning && !this.timer) this._loop();
    if (!active && this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  _loop() {
    if (!this._active || !this.analyser) { this.timer = null; return; }
    // getFloatTimeDomainData tem melhor suporte que a versão de bytes para YIN.
    if (this.analyser.getFloatTimeDomainData) {
      this.analyser.getFloatTimeDomainData(this.buffer);
    } else {
      // Fallback WebViews antigas: byte → float.
      const byteBuf = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(byteBuf);
      for (let i = 0; i < byteBuf.length; i += 1) this.buffer[i] = (byteBuf[i] - 128) / 128;
    }
    try {
      this.onFrame(this.buffer, this.ctx.sampleRate, (this.ctx.currentTime || 0) * 1000);
    } catch { /* nunca deixar a análise partir o loop */ }
    this.timer = setTimeout(() => this._loop(), this.cfg.analysisIntervalMs);
  }

  _teardownStream() {
    try { this.stream?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    this.stream = null;
  }

  /** Pára tudo e liberta recursos (§32). Idempotente. */
  stop() {
    this._active = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    try { this.source?.disconnect(); } catch { /* ignore */ }
    this._teardownStream();
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    this.buffer = null;
  }
}

function taggedError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function mapGumError(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return taggedError('denied', 'Permissão recusada');
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return taggedError('no-device', 'Sem microfone');
  if (name === 'NotReadableError') return taggedError('interrupted', 'Microfone ocupado');
  return taggedError('unknown', err?.message || 'Erro do microfone');
}
