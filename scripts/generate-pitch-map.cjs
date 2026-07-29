#!/usr/bin/env node
/**
 * Gera um pitch-map (melodia de referência) para o « Guia de tom · Beta » a
 * partir de um ficheiro `vocals.wav` (stem vocal isolado da música).
 *
 * Fluxo (§12): vocals.wav → análise de pitch (YIN) → remove frames de baixa
 * confiança → suaviza → funde frames estáveis consecutivos em notas → exporta
 * pitch-map.json (startMs, endMs, midi, confidence).
 *
 * ISOLADO em /scripts — NENHUMA dependência pesada entra na app móvel. Reutiliza
 * o MESMO detetor YIN puro da app (src/lib/pitch/yin.js) por `import()` dinâmico,
 * e traz um leitor WAV mínimo (PCM 16/24/32-bit int e 32-bit float) sem deps npm.
 *
 * Uso:
 *   node scripts/generate-pitch-map.cjs --in vocals.wav [--out pitch-map.json]
 *   node scripts/generate-pitch-map.cjs --in vocals.wav --slug messi-e-o-melhor --write-supabase
 *
 * --write-supabase escreve `songs.pitch_map` (precisa de VITE_SUPABASE_URL +
 * SUPABASE_SERVICE_KEY no .env — service role, como os outros scripts).
 *
 * Nota de alinhamento: o pitch-map fica alinhado ao INÍCIO do vocals.wav. Se o
 * áudio da música (YouTube) começar num instante diferente, ajusta o offset com
 * --offset-ms N (adicionado a todos os tempos) ou afina `pitchInputLatencyMs`.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// ── Args ──
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--write-supabase') out.writeSupabase = true;
    else if (a.startsWith('--')) { out[a.slice(2)] = argv[i + 1]; i += 1; }
  }
  return out;
}

// ── Leitor WAV mínimo (RIFF/WAVE PCM não comprimido) ──
function readWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Ficheiro não é WAV RIFF/WAVE (converte com ffmpeg para PCM wav).');
  }
  let offset = 12;
  let fmt = null;
  let dataOffset = -1;
  let dataLen = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bitsPerSample: buffer.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      dataOffset = body;
      dataLen = size;
    }
    offset = body + size + (size % 2); // chunks alinhados a 2 bytes
  }
  if (!fmt || dataOffset < 0) throw new Error('WAV sem chunks fmt/data válidos.');

  const { channels, sampleRate, bitsPerSample, audioFormat } = fmt;
  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.floor(dataLen / (bytesPerSample * channels));
  const mono = new Float32Array(frameCount);
  const isFloat = audioFormat === 3;

  for (let i = 0; i < frameCount; i += 1) {
    let sum = 0;
    for (let c = 0; c < channels; c += 1) {
      const p = dataOffset + (i * channels + c) * bytesPerSample;
      let v;
      if (isFloat) v = buffer.readFloatLE(p);
      else if (bitsPerSample === 16) v = buffer.readInt16LE(p) / 32768;
      else if (bitsPerSample === 24) {
        const raw = buffer.readUInt8(p) | (buffer.readUInt8(p + 1) << 8) | (buffer.readInt8(p + 2) << 16);
        v = raw / 8388608;
      } else if (bitsPerSample === 32) v = buffer.readInt32LE(p) / 2147483648;
      else if (bitsPerSample === 8) v = (buffer.readUInt8(p) - 128) / 128;
      else throw new Error(`bitsPerSample não suportado: ${bitsPerSample}`);
      sum += v;
    }
    mono[i] = sum / channels; // mistura para mono
  }
  return { samples: mono, sampleRate };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.in) {
    console.error('Uso: node scripts/generate-pitch-map.cjs --in vocals.wav [--out pitch-map.json] [--slug <slug> --write-supabase] [--offset-ms N]');
    process.exitCode = 1;
    return;
  }

  // Reutiliza o MESMO construtor de pitch-map da app (fonte única da lógica).
  const builderUrl = pathToFileURL(path.resolve(__dirname, '../src/lib/pitch/pitchMapBuilder.js')).href;
  const { buildPitchMap } = await import(builderUrl);

  const inPath = path.resolve(args.in);
  console.log(`▶ A ler ${inPath}…`);
  const { samples, sampleRate } = readWav(fs.readFileSync(inPath));
  console.log(`  ${(samples.length / sampleRate).toFixed(1)}s @ ${sampleRate}Hz`);

  const pitchMap = buildPitchMap(samples, sampleRate, {
    source: path.basename(inPath),
    minConfidence: Number(args['min-confidence'] || 0.8),
    minRms: Number(args['min-rms'] || 0.01),
    offsetMs: Number(args['offset-ms'] || 0),
  });
  delete pitchMap.stats; // o ficheiro guardado não precisa das estatísticas
  console.log(`✔ ${pitchMap.notes.length} notas geradas.`);

  // 4) Escrita.
  const outPath = path.resolve(args.out || inPath.replace(/\.[^.]+$/, '.pitch-map.json'));
  fs.writeFileSync(outPath, JSON.stringify(pitchMap, null, 2));
  console.log(`✔ Escrito ${outPath}`);

  if (args.writeSupabase) {
    if (!args.slug) throw new Error('--write-supabase requer --slug <slug da música>.');
    await writeToSupabase(args.slug, pitchMap);
  }
}

async function writeToSupabase(slug, pitchMap) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Faltam VITE_SUPABASE_URL / SUPABASE_SERVICE_KEY no .env.');
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, key);

  // Deriva o slug do título como o resto dos scripts (esta instância pode não ter coluna slug).
  const { data: songs, error } = await supabase.from('songs').select('id, title, slug');
  if (error) throw error;
  const norm = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const target = norm(slug);
  const match = songs.find((s) => norm(s.slug) === target || norm(s.title) === target);
  if (!match) throw new Error(`Nenhuma música corresponde ao slug « ${slug} ».`);

  const { error: upErr } = await supabase.from('songs').update({ pitch_map: pitchMap }).eq('id', match.id);
  if (upErr) throw upErr;
  console.log(`✔ Supabase: songs.pitch_map atualizado para « ${match.title} » (id ${match.id}).`);
}

main().catch((err) => { console.error('❌', err.message); process.exitCode = 1; });
