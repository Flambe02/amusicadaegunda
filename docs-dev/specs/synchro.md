# Página de Sincronização de Karaokê — Documentação Técnica e Funcional

> Documento de referência para quem precisa entender rapidamente como funciona a
> página de sincronização de letras (Back Office / Admin) de **A Música da Segunda**.
> Escrito para uma pessoa que não escreveu o código, mas precisa compreender o
> funcionamento completo: o que existe, para que serve cada peça, e como os dados
> circulam entre o ecrã, o navegador e o Supabase.

---

## 1. Onde isto vive e como se abre

- **Componente principal:** `src/components/karaoke/KaraokeSyncTool.jsx`
- **Ponto de entrada:** dentro do Back Office (`src/pages/Admin.jsx`), cada música
  listada tem um botão/ícone "Karaokê" que chama `setKaraokeSong(song)`. Isso monta
  `<KaraokeSyncTool song={...} onClose={...} onSaved={...} />` como um **overlay de
  ecrã inteiro** (via `createPortal`, `z-[9999]`) por cima de tudo o resto.
- Cada vez que se abre uma música diferente, o componente é **desmontado e remontado
  do zero** (`key={karaokeSong.id}` no `Admin.jsx`) — ou seja, cada sessão de
  sincronização começa com estado limpo (exceto o que estiver guardado localmente,
  ver secção 6).
- Fechar o editor (`Voltar` / `Cancelar` / tecla `Esc`) chama `onClose`, que devolve o
  controlo ao Back Office. Se houver alterações não guardadas, é pedida confirmação
  antes de fechar (ver secção 6.3).

---

## 2. Propósito da ferramenta

Permite a um administrador transformar a **letra em texto simples** de uma música
(coluna `songs.lyrics`) num **ficheiro de timing sincronizado** que o leitor de
karaokê público usa para acender a letra em sincronia com o vídeo do YouTube.

Duas camadas de precisão coexistem, **sem se excluírem**:

| Camada | O que é | Onde fica guardada |
| --- | --- | --- |
| **Frase (linha)** | Cada linha da letra tem um instante de início e, opcionalmente, um instante de fim. É o modo histórico, sempre disponível. | `songs.lrc_content` (formato `.lrc`) |
| **Palavra (opcional)** | Dentro de uma linha, cada palavra individual pode ter o seu próprio início/fim, para um efeito de karaokê "bola que salta de palavra em palavra". | `songs.timing_data` (JSON estruturado) |

Uma música pode ter **algumas linhas em modo palavra e outras só em modo frase** —
chama-se a isso modo **híbrido**. Nada obriga a converter a música inteira.

---

## 3. Fluxo em dois passos: "Letra" → "Sincronizar"

Ao abrir uma música, a ferramenta começa sempre no passo **Letra**:

1. **Confirmação do título** — mostra o título da música tal como está em Supabase,
   para o administrador confirmar visualmente que abriu a música certa.
2. **Edição da letra completa** — uma caixa de texto com uma frase por linha (a
   ordem importa: é a ordem em que as frases serão cantadas). Botões:
   - **Paste** — cola diretamente da área de transferência.
   - **Guardar letra** — grava *só* a coluna `lyrics` no Supabase, sem tocar no
     timing já sincronizado. Útil para corrigir a letra sem mexer na sincronização.
   - **Sincronizar →** — avança para o passo de sincronização propriamente dito.

Ao avançar, a ferramenta faz uma coisa importante: se o texto mudou desde a última
sincronização (frases acrescentadas, corrigidas ou removidas), corre um algoritmo de
**fusão que preserva os tempos das linhas que não mudaram** (comparação por maior
subsequência comum — LCS). Ou seja, **corrigir um erro de ortografia numa linha não
obriga a ressincronizar a música inteira**: só as linhas novas ficam sem tempo.

A partir daqui entra-se no passo **Sincronizar**, que é o essencial da ferramenta.

---

## 4. Layout do ecrã de sincronização

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Header: Voltar · breadcrumb · pastilha de estado · Validação · Versões  │
│         · Cancelar · Guardar                                            │
├──────────────┬────────────────────────────────────────────────────────┤
│ Lista de     │  Aperçu karaokê (ocupa quase todo o espaço)             │
│ linhas       │  [vídeo pequeno flutuante no canto superior direito]    │
│ (esquerda)   │                                                          │
│              │                                                          │
├──────────────┴────────────────────────────────────────────────────────┤
│ Barra de ferramentas 1 (marcar, inserir, duplicar, apagar, undo/redo…) │
│ Barra de ferramentas 2 (velocidade, resets, shift ±100ms, calibrar…)   │
│ Edição direta da linha selecionada (texto + Tempo(s) + Fim(s))         │
│ [Painel "Sincronizar palavras" — só aparece quando ativado]            │
│ Frise temporal (drag das linhas, zoom)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

Nota de design importante: **o vídeo do YouTube é deliberadamente pequeno** (uma
janela flutuante ~144–192px no canto superior direito). O espaço grande é reservado
para o **aperçu de karaokê** (o texto que acende), porque é isso que mostra
visualmente se a sincronização está correta — não o vídeo em si.

---

## 5. Sincronização por linha (modo histórico, sempre disponível)

### 5.1 Lista de linhas (painel esquerdo)

Cada linha mostra três campos editáveis diretamente:
- **Início (s)** — em amarelo, o instante de início em segundos.
- **Fim (s)** — em verde, opcional (vazio = "até a próxima linha começar").
- **Texto** — editável a qualquer momento.

Ícones por linha (aparecem ao passar o rato):
- **T** (roxo) — abre o painel "Sincronizar palavras" para esta linha (secção 7).
- Relógio/reset — limpa o tempo desta linha para a remarcar.
- Lixo — apaga a linha.
- Um pequeno **⚠** aparece nas linhas suspeitas (ver secção 5.6).

### 5.2 Marcar o tempo de uma linha

Duas formas:
1. **Espaço mantido** — carregar em Espaço quando a frase COMEÇA e largar quando
   TERMINA. O tempo de início e o tempo de fim são ambos capturados (a duração real
   é medida pelo relógio do computador, não pelo relógio impreciso do YouTube).
2. **Enter** — marca só o início (toque rápido), sem fim explícito; útil para linhas
   curtas ou muito próximas umas das outras.

Depois de marcar, o cursor avança automaticamente para a linha seguinte.

### 5.3 Calibração do tempo de reação

Cada pessoa tem um atraso natural entre "ouvir a música começar" e "carregar em
Espaço". Botão **Calibrar**: mostra 5 flashes aleatórios (visual + sonoro), mede a
mediana do tempo de reação, e passa a subtrair esse valor automaticamente a cada
marcação seguinte. Guardado em `localStorage` (por aparelho, não por música).

### 5.4 Frise temporal (parte inferior)

Cada linha marcada aparece como um bloco na frise:
- **Arrastar o corpo do bloco** → move a linha inteira (início e, se tiver fim
  próprio, o fim também).
- **Arrastar o bordo direito** → ajusta só o fim (encurtar ou sobrepor a linha
  seguinte).
- **Clique numa zona vazia** → navega até esse instante.
- **Shift + clique** → insere uma linha vazia nesse instante exato.
- **Zoom** (botões `−`/`+`) → mais ou menos pixels por segundo.

### 5.5 Ferramentas de correção em lote

| Ferramenta | O que faz |
| --- | --- |
| **Afinar auto** ✨ | Interpola linhas sem tempo entre duas âncoras (proporcional ao número de sílabas), corrige a ordem se um arrasto a quebrou, e limpa fins inválidos. Tudo num único passo de undo. |
| **Shift All ±100ms** | Adianta/atrasa TODAS as linhas marcadas (ou só a selecionada, se "Shift All" estiver desligado). |
| **Reset From Current** | Apaga os tempos a partir da linha selecionada, preserva o resto. |
| **Reset All** | Apaga todos os tempos. |
| **Restaurar versão inicial** | Volta ao estado exato de quando esta sessão de sincronização foi aberta (não confundir com o histórico de versões em base de dados — secção 8). |
| **Velocidade (1×/0.75×/0.5×/0.25×)** | Reproduz mais devagar para passagens rápidas, sem alterar o timing gravado. |

### 5.6 Deteção heurística de linhas suspeitas

Sem áudio nem IA: uma linha é marcada com **⚠** se:
- tem um "buraco" (sem tempo) entre duas linhas já marcadas — provavelmente foi
  esquecida;
- a duração é demasiado curta para o número de sílabas do texto (toque falhado);
- a duração é demasiado longa (provavelmente falta marcar a linha seguinte).

### 5.7 Undo / Redo

Todas as ações "discretas" (marcar, apagar, duplicar, inserir, repor, `Afinar auto`,
um arrasto completo de bloco) passam por um histórico dedicado (até 100 passos).
`Ctrl+Z` / `Backspace` para anular, `Ctrl+Shift+Z` / `Ctrl+Y` para refazer. A digitação
livre num campo de texto não entra neste histórico (usa o undo nativo do navegador).

### 5.8 Loop de linha ("Repetir linha")

Botão dedicado (ícone de repetição) que faz o vídeo tocar em ciclo só a linha
selecionada (do seu início ao seu fim efetivo), à velocidade escolhida. Para
automaticamente ao selecionar outra linha, e nunca continua a tocar depois de fechar
o editor.

---

## 6. Proteção do trabalho (autosave, deteção de alterações, recuperação)

Esta camada existe para que **o trabalho de sincronização nunca se perca** por um
refresh acidental, uma aba fechada, ou uma falha de rede a meio de uma gravação.

### 6.1 Pastilha de estado (canto superior direito do header)

| Estado mostrado | Significado |
| --- | --- |
| `Alterações não salvas` | Há edições desde a última gravação confirmada no servidor. |
| `Salvando…` | Gravação em curso. |
| `Salvo às HH:MM` | Última gravação confirmada com sucesso. |
| `Falha ao salvar` | A última tentativa de gravação falhou (o trabalho continua em memória e no rascunho local). |
| `Rascunho recuperado` | Um rascunho local foi restaurado depois de um refresh/fecho acidental. |

A deteção de "alterações não salvas" compara uma **assinatura** do estado atual
(`linesSignature`, em `src/hooks/useTimingDraft.js`) com a assinatura do último
estado gravado no servidor. Essa assinatura inclui o texto, o início/fim de cada
linha, **e também o timing de cada palavra** (`words[].start/end/text`) — importante,
porque uma correção só ao nível da palavra não muda o tempo da linha, mas tem de
continuar a acender a pastilha e a disparar o autosave.

### 6.2 Autosave local (rascunho)

- Guarda uma cópia local (`localStorage`, chave `karaoke-timing-draft-<songId>`)
  cerca de **12 segundos depois da última edição** — nunca durante um arrasto ou um
  Espaço mantido (o temporizador só dispara depois do gesto terminar).
- **Não escreve na base de dados.** É só uma rede de segurança local, distinta do
  histórico de versões (secção 8).
- Se a gravação no servidor falhar, o rascunho local **não é apagado**. Só é
  apagado depois de uma gravação confirmada com sucesso (manual ou restauro de
  versão).

### 6.3 Aviso ao sair com alterações por guardar

- **Fechar a aba / recarregar a página** — o navegador mostra o diálogo nativo de
  confirmação, mas só enquanto houver alterações por guardar (`useUnsavedGuard`).
- **Botão Voltar/Cancelar dentro da ferramenta** — pede confirmação explícita
  (`window.confirm`) se houver alterações por guardar, avisando que o rascunho local
  fica guardado neste aparelho.
- Se tudo estiver gravado, **não aparece nenhum aviso**.

### 6.4 Recuperação de rascunho ao reabrir a música

Ao abrir a ferramenta, se existir um rascunho local **diferente** da versão que está
no servidor para esta música, aparece uma faixa amarela no topo do ecrã:

> *"Há um rascunho local mais recente desta música"*
> **Recuperar rascunho** · **Usar versão salva**

- **Recuperar rascunho** — carrega o rascunho local para o editor.
- **Usar versão salva** — descarta o rascunho local e mantém a versão do servidor.

Nunca é feita uma substituição silenciosa: o administrador escolhe sempre.

---

## 7. Sincronização palavra-a-palavra (modo híbrido, opcional)

Esta camada **estende** o editor de linha existente — não é um ecrã separado.

### 7.1 Como ativar

Cada linha já marcada (com tempo de início) mostra um pequeno ícone **T** (roxo).
Clicar nele abre o painel **"Sincronizar palavras — Linha N"** por baixo da edição
da linha selecionada. Se a linha ainda não tiver palavras, a ferramenta gera
automaticamente uma **distribuição de partida** (ver secção 7.2) — nunca fica vazio.

### 7.2 Distribuição automática ("Distribuir palavras")

Função pura e determinística (`src/lib/wordDistribution.js`), **sem IA nem rede**:
1. Divide o texto da linha em palavras (por espaços, mantendo a pontuação colada).
2. Atribui a cada palavra um peso = número de letras/dígitos, com um bónus se a
   palavra terminar em pontuação (sugere uma pequena pausa), e um bónus extra na
   última palavra (nota final costuma prolongar-se ao cantar).
3. Reparte a duração da linha proporcionalmente a esses pesos, respeitando uma
   duração mínima por palavra sempre que a linha tiver espaço para isso.
4. O início e o fim da linha são **sempre preservados exatamente**.

Isto é só um **ponto de partida**. O botão "Distribuir palavras" pode ser clicado
outra vez a qualquer momento — recalcula do zero e perde correções manuais feitas
até aí (ação explícita e reversível por Ctrl+Z).

### 7.3 Correção manual das palavras

No painel de palavras:
- **Mini-frise local à linha** — cada palavra é um bloco. Arrastar o **corpo** move a
  palavra inteira; arrastar o **bordo esquerdo** ajusta só o início; o **bordo
  direito**, só o fim.
- **Navegação** — botões `‹`/`›` para selecionar a palavra anterior/seguinte, ou
  clicar diretamente num bloco.
- **Edição numérica** — campos "Início (s)" / "Fim (s)" para a palavra selecionada.
- **Reproduzir trecho / Parar repetição** — reutiliza o mesmo loop de linha da
  secção 5.8, útil para ouvir a palavra em ciclo enquanto se ajusta.
- **Velocidade** — os mesmos botões 1×/0.75×/0.5×/0.25× disponíveis aqui também.

### 7.4 Captura por toque ("Capturar tempos")

Fluxo alternativo ao arrasto manual, pensado para ir mais rápido:

1. Clicar em **Capturar tempos** (o botão fica vermelho/pulsante).
2. Tocar em reprodução (ou usar o loop).
3. Carregar em **Espaço** exatamente quando cada palavra começa a ser cantada.
4. Cada toque grava o início da PRÓXIMA palavra a capturar — e esse mesmo instante
   torna-se automaticamente o fim da palavra anterior.
5. A última palavra recebe por defeito o fim da linha (corrigível depois à mão).
6. **Esc** cancela o modo a qualquer momento, sem alterar nenhum dado já gravado.

Importante: este modo **nunca interfere** com o Espaço normal de marcação de linha
(secção 5.2) — só é ativo quando o painel de palavras está aberto e o modo de
captura foi explicitamente ligado. Assim que a captura termina (ou é cancelada), o
Espaço volta a funcionar como antes.

### 7.5 Voltar para sincronização por frase

Botão **"Voltar para frase"** — remove o timing por palavra desta linha (o timing de
frase, que nunca é apagado, volta a ser o que se vê e se usa). Reversível por
Ctrl+Z como qualquer outra ação estrutural.

### 7.6 Aperçu com o mesmo motor do público

O aperçu de karaokê (secção 4) usa exatamente o mesmo componente de desenho que o
leitor público (`KaraokeWordLine.jsx` / `KaraokeWipeLine.jsx`) — **não existem dois
motores de sincronização diferentes**. Quando a linha ativa tem palavras, aparece o
efeito "bola que salta de palavra em palavra"; senão, o efeito clássico de
preenchimento contínuo da frase inteira.

---

## 8. Guardar, versões e restauro

### 8.1 O que acontece ao clicar "Guardar"

1. Se houver **erros de validação bloqueantes** (secção 9), a gravação é recusada e
   o painel de Validação abre-se automaticamente.
2. Constrói o `.lrc` a partir das linhas (formato de compatibilidade, sempre
   escrito).
3. Se pelo menos uma linha tiver palavras, constrói também o JSON estruturado
   (`timing_data` + `timing_mode: 'word'` ou `'hybrid'`). Se nenhuma linha tiver
   palavras, estes dois campos **não são tocados** — a música continua puramente em
   modo linha.
4. Grava tudo na tabela `songs` (colunas `lrc_content`, `karaoke_synced_at`,
   `timing_data`, `timing_mode`, e opcionalmente `lyrics` se a opção "Atualizar
   letra também" estiver marcada).
5. Cria uma **versão durável** na tabela `song_timing_versions` (ver 8.2).
6. Limpa o rascunho local, atualiza a pastilha para "Salvo às HH:MM".

Uma proteção anti-duplo-clique impede duas gravações em paralelo.

### 8.2 Histórico de versões (`song_timing_versions`)

Tabela **apenas para administradores** (RLS restrita, igual à política já existente
em `songs`), que guarda cada gravação:

| Coluna | Conteúdo |
| --- | --- |
| `version_number` | Número sequencial por música. |
| `lrc_content` | Cópia do `.lrc` nesse momento. |
| `timing_data` / `timing_mode` | Cópia do timing estruturado, se existir. |
| `source` | `manual_save` \| `publish` \| `restore` \| `migration` |
| `note` | Nota livre (ex.: "Restaurado de #7"). |
| `created_at` / `created_by` | Data e utilizador. |

Regra importante: **o autosave local (secção 6.2) nunca cria uma versão aqui.** Só
um clique em "Guardar" (ou um restauro) cria uma versão nova — isto evita encher o
histórico com dezenas de entradas insignificantes.

### 8.3 Painel "Versões" e restauro

Botão **Versões** no header abre um painel com a lista (mais recente primeiro),
mostrando número, data, origem e modo de timing. Botão **Restaurar** por cada linha:

1. Pede confirmação.
2. Carrega o conteúdo dessa versão (incluindo palavras, se tiver) para o editor.
3. **Grava-o de volta em `songs`** (não é só uma prévia local).
4. **Cria uma NOVA versão** com `source: 'restore'` — o histórico **nunca é
   apagado**, e a própria restauração pode ser desfeita restaurando uma versão
   anterior outra vez.

Se a migração de base de dados ainda não tiver sido aplicada, o painel mostra uma
mensagem clara em vez de rebentar (ver secção 10).

---

## 9. Validação de timing (não destrutiva)

Botão **Validação** no header mostra um painel com todos os problemas detetados
(`src/lib/timingValidation.js`), agrupados por gravidade:

| Nível | Exemplos | Bloqueia gravação? |
| --- | --- | --- |
| **Erro** | fim antes do início, início negativo, palavra fora dos limites da linha, palavra fora de ordem | **Sim** |
| **Aviso** | duração quase nula, linha sem tempo entre duas linhas marcadas, palavras sobrepostas, linha em "modo palavra" sem palavras | Não |
| **Informação** | silêncio invulgarmente longo entre duas frases | Não |

Cada linha do painel mostra a mensagem e o timestamp; clicar nela **seleciona e
centra** a linha em causa no editor (lista + frise). A ferramenta **nunca corrige
nada sozinha** — só assinala; a correção é sempre manual.

---

## 10. Modelo de dados (resumo técnico)

### Colunas em `songs` (todas opcionais/aditivas — nenhuma música antiga é afetada)

| Coluna | Tipo | Uso |
| --- | --- | --- |
| `lyrics` | text | Letra em texto simples (fonte da sincronização). |
| `lrc_content` | text | Ficheiro `.lrc` (compatibilidade — sempre escrito). |
| `karaoke_synced_at` | timestamptz | Data da última sincronização. |
| `timing_mode` | text, default `'line'` | `line` \| `word` \| `hybrid`. |
| `timing_data` | jsonb | Timing estruturado (linhas + palavras). `NULL` = usar só `lrc_content`. |
| `timing_version` | integer, default 1 | Versão do esquema do JSON estruturado. |

### Tabela `song_timing_versions`

Histórico *append-only* (nunca se apaga uma linha), com RLS restrita a
administradores. Ver estrutura completa em
`supabase/migrations/20260712170000_add_hybrid_timing.sql`.

### Prioridade de leitura (lecteur público e aperçu admin usam a MESMA regra)

```
Se timing_data existir e for válido
  → usar o timing estruturado (linha + palavra quando presente)
Senão
  → usar lrc_content (comportamento histórico, inalterado)
```

Implementada numa única função (`resolveSongTiming`, em `src/lib/timingModel.js`),
chamada tanto pelo leitor de karaokê público como pelo aperçu do editor — não há
duas implementações a manter em paralelo.

### Formato JSON estruturado (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "timingMode": "hybrid",
  "lines": [
    {
      "id": "l4",
      "text": "O Brasil levantou",
      "start": 18.49,
      "end": 23.78,
      "singer": null,
      "timingMode": "word",
      "words": [
        { "id": "w1", "text": "O", "start": 18.49, "end": 18.6 },
        { "id": "w2", "text": "Brasil", "start": 18.6, "end": 20.65 },
        { "id": "w3", "text": "levantou", "start": 20.65, "end": 23.57 }
      ]
    }
  ]
}
```

---

## 11. Atalhos de teclado (resumo)

Desativados enquanto um campo de texto/número está focado.

| Tecla | Ação | Contexto |
| --- | --- | --- |
| `Espaço` (manter) | Marca início + fim da linha selecionada | Normal |
| `Espaço` (toque) | Captura o início da próxima palavra | Só quando "Capturar tempos" está ativo |
| `Enter` | Marca só o início da linha selecionada | Normal |
| `Backspace` / `Ctrl+Z` | Anular | Sempre |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Refazer | Sempre |
| `←` | Recuar 3 segundos | Normal |
| `P` / `K` | Play/Pausa | Normal |
| `S` | Alternar velocidade de reprodução | Normal |
| `Esc` | Cancelar captura de palavras (se ativa) ou fechar o editor | — |

---

## 12. O que NÃO existe (por decisão de produto)

- Sem inteligência artificial ou alinhamento automático por áudio (o antigo sistema
  "Whisper" foi removido deliberadamente e não deve ser reintroduzido).
- Sem conversão obrigatória do catálogo inteiro — cada música pode ficar
  indefinidamente em modo linha, ou ter só algumas linhas em modo palavra.
- A distribuição automática de palavras **nunca é apresentada como sincronização
  exata** — é sempre um ponto de partida corrigível.
- Sem múltiplos utilizadores em simultâneo na mesma música (não há bloqueio
  colaborativo) — assume-se um administrador de cada vez.

---

## 13. Ficheiros-chave para quem for mexer no código

| Ficheiro | Responsabilidade |
| --- | --- |
| `src/components/karaoke/KaraokeSyncTool.jsx` | Todo o ecrã de sincronização (UI + lógica). |
| `src/lib/lrc.js` | Parser/serializer do formato `.lrc` (linha). |
| `src/lib/timingModel.js` | Modelo estruturado (linha+palavra), `resolveSongTiming`. |
| `src/lib/wordDistribution.js` | Distribuição automática determinística de palavras. |
| `src/lib/timingValidation.js` | Regras de validação (erros/avisos/info). |
| `src/lib/timingVersions.js` | CRUD do histórico de versões em Supabase. |
| `src/hooks/useTimingDraft.js` | Rascunho local + assinatura de "sujo". |
| `src/hooks/useUnsavedGuard.js` | Aviso `beforeunload`. |
| `src/components/karaoke/KaraokeWipeLine.jsx` | Efeito de preenchimento por FRASE (partilhado com o leitor público). |
| `src/components/karaoke/KaraokeWordLine.jsx` | Efeito de preenchimento por PALAVRA (partilhado com o leitor público). |
| `src/components/karaoke/KaraokePlayer.jsx` | Leitor público — consome o mesmo `resolveSongTiming`. |
| `supabase/migrations/20260712170000_add_hybrid_timing.sql` | Migração que adiciona as colunas/tabela descritas na secção 10. |
| `docs/product-audit.md` | Auditoria técnica completa + histórico de decisões desta funcionalidade. |
