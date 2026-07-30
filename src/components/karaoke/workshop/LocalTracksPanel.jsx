import { Music, Play, AlertTriangle, Check, ShieldCheck, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { formatOffsetSeconds } from '@/lib/audioClock';
import { formatBytes, formatDuration } from '@/lib/localAudioMetadata';
import { TRACK_ROLE, compareTrackDuration } from '@/lib/localTracks';
import {
  ROLE_UI, roleOrder, roleLabel, trackCardStatus, trackPrimaryAction, trackSecondaryActions,
  preparationProgress, preparationStage, nextWorkshopAction, syncSourceOptions, workshopSummary,
  SECTION_COPY, HELP_COPY, ALIGNMENT_COPY,
} from '@/lib/workshopUi';

// Libellé conservé pour les deux barres (calibration / vérification).
const TRACK_LABEL = Object.fromEntries(roleOrder().map((r) => [r, roleLabel(r)]));

/**
 * LocalTracksPanel — « Faixas locais » : les trois pistes audio importées à la main
 * (typiquement des stems UVR5). Import, vérification et CHOIX de piste.
 *
 * Aucune logique de timing ici : le composant affiche l'état et remonte des actions. Les
 * fichiers restent sur l'appareil — rien n'est envoyé au serveur.
 */
export default function LocalTracksPanel({
  tracks, referenceDuration,
  calibrationStatusOf, offsetOf, verificationOf,
  previewRole, syncRole,
  onPick, onRemove, onPreview, onUseForSync, onCalibrate, onCopyOriginalCalibration,
  onVerifyAlignment,
  // Calibration LIÉE À UN RÔLE (cible gelée) — étape 6.1
  calTarget, calAnchors, calAnchorOffset, onMarkCalAnchor, onApplyCalibration, onCancelCalibration,
  // Comparaison original ↔ stem — étape 6.1
  verifySession, canConfirm, onListen, onConfirmAligned, onRejectAligned,
  // Présentation guidée
  playing, hasDraft, collapsed, onToggleCollapse, detailsRole, onToggleDetails, onNextAction,
}) {
  const progress = preparationProgress(tracks, calibrationStatusOf);
  const stage = preparationStage(tracks, calibrationStatusOf, { syncRole, verificationOf });
  const next = nextWorkshopAction(tracks, calibrationStatusOf, { syncRole, verificationOf, hasDraft });
  const summary = workshopSummary(tracks, calibrationStatusOf, { syncRole, verificationOf });
  const sourceOptions = syncSourceOptions(tracks, calibrationStatusOf, { verificationOf, offsetOf });

  return (
    <section aria-label={SECTION_COPY.title} className="border-t border-white/10 bg-black/20 px-3 py-2">
      {/* ══ En-tête guidé : titre, but, progression, étapes ══ */}
      <div className="mb-2 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[12px] font-bold text-white">{SECTION_COPY.title}</h3>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
            {SECTION_COPY.progressTitle}: {progress.label}
          </span>
          <button
            type="button" onClick={onToggleCollapse} aria-expanded={!collapsed}
            className="karaoke-focusable ml-auto rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold hover:bg-white/10"
          >
            {collapsed ? 'Mostrar faixas' : 'Recolher'}
          </button>
        </div>
        <p className="text-[10px] text-emerald-300/80">{SECTION_COPY.intro}</p>
        <p className="text-[10px] text-gray-400">{SECTION_COPY.optionalNote}</p>

        {/* Étapes — présentation de l'état existant, pas un assistant rigide. */}
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
          {stage.stages.map((s) => (
            <li
              key={s.step}
              aria-current={s.active ? 'step' : undefined}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                s.active ? 'bg-app-yellow/20 text-app-yellow'
                  : s.done ? 'bg-emerald-500/15 text-emerald-200'
                  : 'bg-white/5 text-gray-500'
              }`}
            >
              {s.done ? <Check size={10} /> : <span>{s.step}.</span>} {s.label}
            </li>
          ))}
        </ol>
        {stage.blockedReason && <p className="text-[10px] text-amber-200/90">{stage.blockedReason}</p>}
      </div>

      {collapsed && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-[10px] text-gray-300">
          <p className="font-bold text-white">{summary.title}</p>
          {summary.details.length > 0 && <p className="mt-0.5 text-gray-400">{summary.details.join(' · ')}</p>}
        </div>
      )}
      {!collapsed && (
      <>


      {/* ══ Calibração da faixa selecionada — alvo CONGELADO no clique ══ */}
      {calTarget && (
        <div
          role="group"
          aria-label={`Calibrar ${TRACK_LABEL[calTarget.role]}`}
          className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-app-yellow/40 bg-app-yellow/[0.07] p-2 text-[10px]"
        >
          <span className="font-bold text-app-yellow">Calibrar · {TRACK_LABEL[calTarget.role]}</span>
          <label className="flex items-center gap-1 text-gray-300">
            YouTube
            <input
              type="number" step="0.01" readOnly value={calAnchors.canonical}
              aria-label="Ponto no YouTube em segundos"
              className="w-16 rounded border border-white/10 bg-white/5 px-1 py-0.5 outline-none"
            />s
          </label>
          <button type="button" onClick={() => onMarkCalAnchor('canonical')}
            className="karaoke-focusable rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-semibold hover:bg-white/10">
            Marcar ponto no YouTube
          </button>
          <label className="flex items-center gap-1 text-gray-300">
            Faixa
            <input
              type="number" step="0.01" readOnly value={calAnchors.local}
              aria-label="Mesmo ponto nesta faixa em segundos"
              className="w-16 rounded border border-white/10 bg-white/5 px-1 py-0.5 outline-none"
            />s
          </label>
          <button type="button" onClick={() => onMarkCalAnchor('local')}
            className="karaoke-focusable rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-semibold hover:bg-white/10">
            Marcar o mesmo ponto na faixa
          </button>
          <span className="font-bold text-app-yellow">Diferença: {formatOffsetSeconds(calAnchorOffset)}</span>
          <button type="button" onClick={() => onApplyCalibration(calAnchorOffset, 'manual-anchor')}
            disabled={calAnchorOffset === null}
            className="karaoke-focusable rounded-lg bg-emerald-600 px-2 py-1 font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
            Confirmar calibração
          </button>
          <button type="button" onClick={() => onApplyCalibration(0, 'explicit-zero')}
            className="karaoke-focusable rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-semibold hover:bg-white/10">
            Começam juntos (0 s)
          </button>
          <button type="button" onClick={onCancelCalibration}
            className="karaoke-focusable ml-auto rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-semibold hover:bg-white/10">
            Cancelar
          </button>
        </div>
      )}

      {/* ══ Comparação original ↔ faixa — as DUAS escutas são obrigatórias ══ */}
      {verifySession && (
        <div
          role="group"
          aria-label={`Verificar alinhamento de ${TRACK_LABEL[verifySession.role]}`}
          className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600/[0.07] p-2 text-[10px]"
        >
          <span className="font-bold text-emerald-200">
            Verificar alinhamento · {TRACK_LABEL[verifySession.role]}
          </span>
          <span className="text-gray-400">{ALIGNMENT_COPY}</span>
          <button type="button" onClick={() => onListen('original')} aria-pressed={verifySession.heardOriginal}
            className={`karaoke-focusable inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold ${
              verifySession.heardOriginal ? 'border-emerald-500/50 bg-emerald-600/20 text-emerald-100' : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}>
            {verifySession.heardOriginal && <Check size={10} />} Ouvir música completa
          </button>
          <button type="button" onClick={() => onListen('stem')} aria-pressed={verifySession.heardStem}
            className={`karaoke-focusable inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold ${
              verifySession.heardStem ? 'border-emerald-500/50 bg-emerald-600/20 text-emerald-100' : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}>
            {verifySession.heardStem && <Check size={10} />} Ouvir esta faixa
          </button>
          <button type="button" onClick={onConfirmAligned} disabled={!canConfirm}
            title={canConfirm ? undefined : 'Ouça as duas faixas antes de confirmar.'}
            className="karaoke-focusable rounded-lg bg-emerald-600 px-2 py-1 font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
            Está alinhada
          </button>
          <button type="button" onClick={onRejectAligned}
            className="karaoke-focusable rounded-lg border border-amber-400/40 bg-amber-500/10 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/20">
            Precisa recalibrar
          </button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {roleOrder().map((role) => {
          const ui = ROLE_UI[role];
          const track = tracks[role] || {};
          const status = calibrationStatusOf(role);
          const verification = verificationOf(role);
          const offset = offsetOf(role);
          const loaded = track.loadStatus === 'ready';
          const isPreview = previewRole === role;
          const isSync = syncRole === role;
          const isPlaying = isPreview && playing;
          const cmp = role === TRACK_ROLE.ORIGINAL
            ? { level: 'unknown', label: '' }
            : compareTrackDuration(track.duration, referenceDuration);
          const card = trackCardStatus(track, status, verification, {
            isSync, isPlaying, durationLevel: cmp.level,
          });
          const primary = trackPrimaryAction(track, status, verification, isPlaying);
          const secondary = trackSecondaryActions(track, status, verification, { isSync });
          const run = (action) => {
            if (action === 'pick' || action === 'replace') onPick(role);
            else if (action === 'calibrate' || action === 'recalibrate') onCalibrate(role);
            else if (action === 'verify') onVerifyAlignment(role);
            else if (action === 'listen' || action === 'pause') onPreview(role);
            else if (action === 'useForSync') onUseForSync(role);
            else if (action === 'remove') onRemove(role);
            else if (action === 'details') onToggleDetails(role);
          };
          const toneCls = {
            neutral: 'text-gray-400', action: 'text-app-yellow',
            ready: 'text-emerald-200', error: 'text-red-200', accent: 'text-violet-200',
          }[card.tone];

          return (
            <article
              key={role}
              className={`rounded-xl border p-2.5 ${
                isSync ? 'border-violet-400/50 bg-violet-500/[0.08]' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <header className="mb-1 flex flex-wrap items-center gap-1.5">
                <h4 className="text-[12px] font-bold text-white">{ui.cardTitle}</h4>
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-gray-300">
                  {ui.purposeBadge}
                </span>
              </header>

              <p className="mb-1 text-[10px] leading-snug text-gray-400">{ui.description}</p>
              <p className={`mb-1 text-[10px] font-semibold ${ui.required ? 'text-app-yellow/90' : 'text-gray-500'}`}>
                {ui.requirement}
              </p>

              {/* UN seul statut principal — texte + icône, jamais la couleur seule. */}
              <p aria-live="polite" className={`mb-1 inline-flex flex-wrap items-center gap-1 text-[10px] font-semibold ${toneCls}`}>
                {card.icon === 'error' || card.icon === 'warn' ? <AlertTriangle size={11} />
                  : card.icon === 'ready' ? <ShieldCheck size={11} />
                  : card.icon === 'playing' ? <Play size={11} />
                  : <Music size={11} />}
                {card.label}
                {card.badges.map((b) => (
                  <span key={b} className="rounded-full bg-violet-500/25 px-1.5 py-0.5 text-[9px] font-bold text-violet-100">{b}</span>
                ))}
              </p>

              {loaded && (
                <p className="mb-1.5 truncate text-[10px] text-gray-500" title={track.fileName}>
                  {track.fileName} · {formatDuration(track.duration)}
                </p>
              )}
              {track.error && <p className="mb-1.5 text-[10px] text-red-200">{track.error}</p>}

              {/* UNE action primaire + « Mais opções » */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button" onClick={() => run(primary.action)} disabled={primary.action === 'busy'}
                  className="karaoke-focusable inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-purple-700 disabled:opacity-40"
                >
                  {primary.label}
                </button>

                {secondary.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button" aria-label={`Mais opções para ${ui.label}`}
                        className="karaoke-focusable inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold hover:bg-white/10"
                      >
                        Mais opções <MoreHorizontal size={12} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[180px]">
                      {secondary.map((a) => (
                        <DropdownMenuItem key={a.action} onClick={() => run(a.action)}>{a.label}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Raccourci UVR — copie explicite, jamais automatique. */}
                {role !== TRACK_ROLE.ORIGINAL && loaded && status !== 'calibrated' && (
                  <button
                    type="button" onClick={() => onCopyOriginalCalibration(role)}
                    className="karaoke-focusable inline-flex min-h-[32px] items-center rounded-lg border border-app-yellow/40 bg-app-yellow/10 px-2 py-1 text-[10px] font-semibold text-app-yellow hover:bg-app-yellow/20"
                  >
                    Usar a calibração da música completa
                  </button>
                )}
              </div>

              <p className="mt-1 text-[10px] text-gray-500">{ui.recommendation}</p>

              {/* Détails techniques — utiles au diagnostic, jamais la hiérarchie principale. */}
              {detailsRole === role && (
                <dl className="mt-1.5 space-y-0.5 rounded-lg bg-black/30 p-1.5 text-[10px] text-gray-400">
                  <div><dt className="inline text-gray-500">Arquivo: </dt><dd className="inline">{track.fileName || '—'}</dd></div>
                  <div><dt className="inline text-gray-500">Duração: </dt><dd className="inline">{formatDuration(track.duration)}</dd></div>
                  <div><dt className="inline text-gray-500">Tamanho: </dt><dd className="inline">{formatBytes(track.fileSize)}</dd></div>
                  {cmp.level !== 'unknown' && (
                    <div><dt className="inline text-gray-500">Diferença de duração: </dt><dd className="inline">{cmp.label}</dd></div>
                  )}
                  <div><dt className="inline text-gray-500">Calibração: </dt><dd className="inline">{formatOffsetSeconds(offset)}</dd></div>
                  <div><dt className="inline text-gray-500">Verificação: </dt><dd className="inline">{verification || 'não verificada'}</dd></div>
                  <div><dt className="inline text-gray-500">Função interna: </dt><dd className="inline">{role}</dd></div>
                </dl>
              )}
            </article>
          );
        })}
      </div>

      {/* ══ Como usar cada faixa ══ */}
      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
        <h4 className="text-[11px] font-bold text-white">{HELP_COPY.title}</h4>
        <p className="mt-0.5 text-[10px] leading-snug text-gray-400">{HELP_COPY.body}</p>
      </div>

      {/* ══ Próxima ação ══ */}
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/[0.08] p-2">
        <button
          type="button" onClick={() => onNextAction(next)}
          className="karaoke-focusable inline-flex min-h-[36px] items-center rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700"
        >
          {next.label}
        </button>
        <span className="text-[10px] font-semibold text-gray-300">{next.sourceSummary}</span>
      </div>

      {/* ══ Configuração de sincronização (avançado) ══ */}
      <details className="mt-2 rounded-xl border border-white/10 bg-white/[0.03]">
        <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-bold text-white">
          {SECTION_COPY.advancedTitle}
        </summary>
        <div className="space-y-1 px-2 pb-2">
          <p className="text-[10px] text-gray-400">{SECTION_COPY.advancedSubtitle}</p>
          {sourceOptions.map((o) => (
            <div key={o.label} className="flex flex-wrap items-center gap-1.5">
              <button
                type="button" onClick={() => onUseForSync(o.role)} disabled={o.disabled}
                aria-pressed={syncRole === o.role}
                className={`karaoke-focusable inline-flex min-h-[32px] items-center rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-30 ${
                  syncRole === o.role ? 'border-violet-400/60 bg-violet-500/20 text-violet-100' : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                {o.label}
              </button>
              <span className="text-[10px] text-gray-500">{o.disabled && o.reason ? o.reason : o.help}</span>
            </div>
          ))}
        </div>
      </details>
      </>
      )}
    </section>
  );
}
