# Guia de tom · Beta (guia de pitch por microfone)

Guia de afinação **opcional** do leitor de karaokê **móvel** (web / PWA / Android /
iOS Capacitor). Usa o microfone do telemóvel para detetar a altura da voz do
cantor e compará-la com uma **melodia de referência precomputada** por música.

- **Não** há pontuação/nota (nada de C, B, A, A+…). Só: **Afinado**, **Mais alto**,
  **Mais baixo**, **Sem voz**.
- **Não** grava, **não** guarda, **não** envia áudio. O microfone nunca é ligado às
  colunas (sem eco/monitorização).
- **Desativado por defeito.** O microfone só arranca após um **gesto explícito** do
  utilizador (toggle no mixer → explicação de privacidade → « Ativar microfone »).
- A **TV não é afetada** (o guia só existe no ramo móvel `!tvMode`).
- Uma música **sem** melodia de referência funciona normalmente — o guia fica
  apenas indisponível.

## Arquitetura

| Camada | Ficheiro |
|---|---|
| Config (limiares, latência, janela, escala) | `src/lib/pitch/pitchConfig.js` |
| Detetor YIN puro (partilhado com o script offline) | `src/lib/pitch/yin.js` |
| Suavização (mediana + EMA + correção de oitava + histerese) | `src/lib/pitch/pitchSmoother.js` |
| Serviço de microfone (grafo Web Audio, sem destino) | `src/lib/pitch/microphoneService.js` |
| Melodia de referência (parse + consultas) | `src/lib/pitchReference.js` |
| Carregamento da referência da música | `src/hooks/usePitchReference.js` |
| Orquestrador (micro + deteção + comparação) | `src/hooks/usePitchGuide.js` |
| Timeline em canvas + cabeçalho de estado | `src/components/karaoke/pitch/KaraokePitchGuide.jsx` |
| Pílula de estado | `src/components/karaoke/pitch/PitchStatusPill.jsx` |
| Diálogo de permissão/erro | `src/components/karaoke/pitch/MicrophonePermissionDialog.jsx` |
| Integração no leitor | `src/components/karaoke/KaraokePlayer.jsx` (ramo `!tvMode`) |
| Secção do mixer | `src/components/karaoke/KaraokeMixerSheet.jsx` |
| Estilos | `src/styles/karaoke.css` (`.km-pitch-*`) |

**Algoritmo de pitch:** YIN (diferença → CMND → limiar absoluto → interpolação
parabólica). Escolhido por ser fiável para voz monofónica (melhor que « maior bin
da FFT »).

**Suavização:** mediana (5 frames) → correção de oitava (±12 semitons) → média
móvel exponencial → histerese temporal (`holdMs`). Tudo em MIDI (log), o que torna
a interpolação percetualmente correta.

**Desempenho:** a análise corre num `setTimeout` (~28 Hz) fora do render React; os
valores de alta frequência vivem num *ref* mutável lido pelo `<canvas>` via `rAF`
(zero re-render por frame). O estado React só recebe um `status` grosso (throttle).

## Formato da melodia de referência (pitch-map)

```jsonc
{
  "version": 1,
  "source": "vocals.wav",
  "generatedAt": "2026-07-15T12:00:00.000Z",
  "notes": [
    { "startMs": 35200, "endMs": 35750, "midi": 62, "confidence": 0.94 },
    { "startMs": 35800, "endMs": 36500, "midi": 64, "confidence": 0.91 }
  ]
}
```

Guardado em Supabase (colunas adicionadas pela migração
`20260715120000_add_pitch_map_to_songs.sql`, **a aplicar na instância**):

- `songs.pitch_map` (jsonb inline) — **preferido**, sem fetch/CORS.
- `songs.pitch_reference_url` (text) — alternativa (URL para um `.json`). Se usares
  um URL externo, lembra-te do CSP `connect-src` em `public/_headers`.

## Gerir pitch-maps no admin (Módulo A — recomendado)

Já não é preciso a linha de comandos: no admin há um gestor dedicado por música.

**Onde:** na lista de músicas, o ícone **♪ (Guia de tom)** ao lado do microfone
(amarelo quando já existe pitch-map, com o nº de notas no tooltip); também no
painel de edição da música (botão **« Guia de tom »**) e nas ações do drawer.

**Fluxo no modal:**
1. **Vocais (local)** — « Escolher vocais (wav/mp3) ». O ficheiro **nunca é enviado**
   (só a análise JSON é guardada); é memorizado neste aparelho (File System Access
   + IndexedDB, chave `vocals-<songId>`) para reabrir com 1 clique.
2. **Gerar** — a análise YIN corre num **Web Worker** (não bloqueia a UI), com barra
   de progresso. « Avançado »: offset ms, confiança mínima.
3. **Prévia** — piano-roll de todas as notas + playhead ao ouvir; estatísticas
   (nº de notas, % cantado, extensão vocal ex.: `C3–G4`).
4. **Ações** — **Guardar no Supabase** (`songs.pitch_map`), Importar/Descarregar
   JSON, Remover do Supabase.

O motor de análise é partilhado com o script CLI (`buildPitchMap`), por isso o
resultado é idêntico.

## Pré-alinhar a sincronização por áudio (Módulo B-v1)

No **outro** módulo (a sincronização de letras, não o guia de tom): depois de
carregar os **vocais locais** no outro editor de sincronização, aparece o botão
**« Pré-alinhar com áudio »**. Ele deteta as **frases cantadas** (sinal vocal, não
texto) e preenche os tempos:
- se o nº de segmentos == nº de linhas → atribuição **1:1**;
- senão → **snap** dos marcadores existentes ao início de frase mais próximo.

É um **rascunho**: aplica ao editor (com undo/redo), **nunca guarda sozinho** — o
teu « Guardar » habitual é que persiste. Fica ao **nível frase** (o mot-a-mot
continua a ser trabalho do estúdio da bola). Fluxo recomendado: carrega o
**stem vocal** (não o mix) para a onda mostrar só a voz e o snap ser mais preciso.

## Como adicionar um pitch-map a uma música nova (CLI, alternativa)

1. Obtém o **stem vocal isolado** da música em WAV PCM (ex.: separação de vozes →
   `vocals.wav`). Se não estiver em WAV: `ffmpeg -i vocals.mp3 vocals.wav`.
2. Gera o pitch-map (não precisa de dependências extra):
   ```bash
   npm run pitch:map -- --in vocals.wav --out messi.pitch-map.json
   ```
3. (Opcional) Escreve diretamente em Supabase (precisa de `VITE_SUPABASE_URL` +
   `SUPABASE_SERVICE_KEY` no `.env`, tal como os outros scripts):
   ```bash
   npm run pitch:map -- --in vocals.wav --slug messi-e-o-melhor --write-supabase
   ```
   Senão, copia o conteúdo do `.json` para a coluna `songs.pitch_map` da música.
4. Abre o karaokê da música no telemóvel → Mixer → **Guia de tom · Beta**.

### Alinhamento

O pitch-map fica alinhado ao **início do `vocals.wav`**. Se o áudio da música
(YouTube) começar noutro instante, usa `--offset-ms N` (somado a todos os tempos)
ao gerar. Ajustes finos de latência micro↔reprodução vivem em
`pitchConfig.PITCH_LATENCY` (separado do `lyricsOffsetMs` das letras).

Opções do script: `--min-confidence` (0.8), `--min-rms` (0.01), `--offset-ms` (0).

## Limitações conhecidas

- A geração offline é uma extração de melodia **simples** (YIN + fusão de frames);
  funciona bem em vozes limpas e monofónicas. Coros/harmonias densas produzem
  notas menos fiáveis — reveja o `.json` se necessário.
- O detetor em tempo real é **monofónico** (uma voz). Vários cantores em simultâneo
  degradam a leitura.
- Sem `vocals.wav`, o guia fica indisponível (por design). Não se extrai a melodia
  do instrumental em tempo real no telemóvel.
- A precisão do alinhamento depende de o `vocals.wav` corresponder ao áudio tocado.
