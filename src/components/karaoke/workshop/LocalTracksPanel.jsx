import { Music, Upload, Trash2, Play, Crosshair, RotateCcw, AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import { formatOffsetSeconds } from '@/lib/audioClock';
import { formatBytes, formatDuration } from '@/lib/localAudioMetadata';
import {
  TRACK_ROLE, TRACK_LABEL, trackStatusLabel, compareTrackDuration,
  canUseForSync, canReviewWithTrack, LOCAL_ONLY_NOTICE, ALIGNMENT_HINT,
} from '@/lib/localTracks';

const ROLES = [TRACK_ROLE.ORIGINAL, TRACK_ROLE.INSTRUMENTAL, TRACK_ROLE.VOCALS];

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
}) {
  return (
    <section aria-label="Faixas locais" className="border-t border-white/10 bg-black/20 px-3 py-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <h3 className="text-[9px] font-bold uppercase tracking-wider text-white/35">Faixas locais</h3>
        <p className="text-[10px] text-emerald-300/80">{LOCAL_ONLY_NOTICE}</p>
      </div>

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
          <span className="text-gray-400">{ALIGNMENT_HINT}</span>
          <button type="button" onClick={() => onListen('original')} aria-pressed={verifySession.heardOriginal}
            className={`karaoke-focusable inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold ${
              verifySession.heardOriginal ? 'border-emerald-500/50 bg-emerald-600/20 text-emerald-100' : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}>
            {verifySession.heardOriginal && <Check size={10} />} Ouvir original
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
        {ROLES.map((role) => {
          const track = tracks[role] || {};
          const status = calibrationStatusOf(role);
          const verification = verificationOf(role);
          const offset = offsetOf(role);
          const loaded = track.loadStatus === 'ready';
          const calibrated = canUseForSync(track, status);
          const isPreview = previewRole === role;
          const isSync = syncRole === role;
          const cmp = role === TRACK_ROLE.ORIGINAL
            ? { level: 'unknown', label: '' }
            : compareTrackDuration(track.duration, referenceDuration);
          const statusLabel = trackStatusLabel(track, status, verification);

          return (
            <article
              key={role}
              className={`rounded-xl border p-2.5 ${
                isSync ? 'border-violet-400/50 bg-violet-500/10'
                  : isPreview ? 'border-purple-400/40 bg-purple-500/[0.07]'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <header className="mb-1.5 flex items-center gap-1.5">
                <Music size={13} className="shrink-0 text-violet-300" />
                <h4 className="text-[12px] font-bold text-white">{TRACK_LABEL[role]}</h4>
                {isPreview && (
                  <span className="rounded-full bg-purple-500/25 px-1.5 py-0.5 text-[9px] font-bold text-purple-100">
                    Fonte de reprodução
                  </span>
                )}
                {isSync && (
                  <span className="rounded-full bg-violet-500/30 px-1.5 py-0.5 text-[9px] font-bold text-violet-100">
                    Fonte de sincronização
                  </span>
                )}
              </header>

              {/* État textuel — jamais une couleur seule */}
              <p
                aria-live="polite"
                className={`mb-1 inline-flex items-center gap-1 text-[10px] font-semibold ${
                  track.loadStatus === 'error' ? 'text-red-200'
                    : calibrated && verification !== 'pending' ? 'text-emerald-200'
                    : calibrated ? 'text-amber-200'
                    : loaded ? 'text-amber-200'
                    : 'text-gray-500'
                }`}
              >
                {track.loadStatus === 'error' && <AlertTriangle size={11} />}
                {calibrated && verification !== 'pending' && <ShieldCheck size={11} />}
                {statusLabel}
                {calibrated && <span className="text-gray-400">· {formatOffsetSeconds(offset)}</span>}
              </p>

              {loaded && (
                <dl className="mb-1.5 space-y-0.5 text-[10px] text-gray-400">
                  <div className="flex gap-1 truncate">
                    <dt className="sr-only">Arquivo</dt>
                    <dd className="truncate font-semibold text-gray-200">{track.fileName}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="sr-only">Duração</dt>
                    <dd>{formatDuration(track.duration)}</dd>
                    <dt className="sr-only">Tamanho</dt>
                    <dd>{formatBytes(track.fileSize)}</dd>
                  </div>
                  {role !== TRACK_ROLE.ORIGINAL && cmp.level !== 'unknown' && (
                    <div>
                      <dt className="sr-only">Comparação de duração</dt>
                      <dd className={cmp.level === 'ok' ? 'text-emerald-300/80' : 'text-amber-200'}>
                        {cmp.label}
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {track.error && <p className="mb-1.5 text-[10px] text-red-200">{track.error}</p>}

              <div className="flex flex-wrap gap-1">
                <button
                  type="button" onClick={() => onPick(role)}
                  className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold hover:bg-white/10"
                >
                  <Upload size={11} /> {loaded ? 'Trocar arquivo' : 'Selecionar arquivo'}
                </button>

                {loaded && (
                  <>
                    <button
                      type="button" onClick={() => onPreview(role)} aria-pressed={isPreview}
                      className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold hover:bg-white/10"
                    >
                      <Play size={11} /> Ouvir
                    </button>
                    <button
                      type="button" onClick={() => onUseForSync(role)}
                      aria-pressed={isSync} disabled={!calibrated}
                      title={calibrated ? 'Usar esta faixa para sincronizar' : 'Calibre esta faixa primeiro.'}
                      className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold hover:bg-white/10 disabled:opacity-30"
                    >
                      <Crosshair size={11} /> Usar para sincronização
                    </button>
                    <button
                      type="button" onClick={() => onCalibrate(role)}
                      className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold hover:bg-white/10"
                    >
                      <RotateCcw size={11} /> {calibrated ? 'Refazer calibração' : 'Calibrar'}
                    </button>

                    {/* Raccourci UVR : copier la calibration de l'original, sur confirmation */}
                    {role !== TRACK_ROLE.ORIGINAL && !calibrated && (
                      <button
                        type="button" onClick={() => onCopyOriginalCalibration(role)}
                        className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-app-yellow/40 bg-app-yellow/10 px-2 py-1 text-[10px] font-semibold text-app-yellow hover:bg-app-yellow/20"
                      >
                        Usar a calibração do áudio original
                      </button>
                    )}

                    {/* Vérification manuelle d'alignement */}
                    {role !== TRACK_ROLE.ORIGINAL && calibrated && verification === 'pending' && (
                      <button
                        type="button" onClick={() => onVerifyAlignment(role)}
                        title={ALIGNMENT_HINT}
                        className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-600/15 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-600/25"
                      >
                        <Check size={11} /> Verificar alinhamento
                      </button>
                    )}

                    <button
                      type="button" onClick={() => onRemove(role)}
                      className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold hover:bg-white/10"
                    >
                      <Trash2 size={11} /> Remover
                    </button>
                  </>
                )}
              </div>

              {loaded && !calibrated && (
                <p className="mt-1 text-[10px] text-amber-200/90">
                  Calibre esta faixa para ouvir a frase no ponto correto.
                </p>
              )}
              {role !== TRACK_ROLE.ORIGINAL && calibrated && verification === 'pending' && (
                <p className="mt-1 text-[10px] text-amber-200/90">{ALIGNMENT_HINT}</p>
              )}
              {loaded && calibrated && !canReviewWithTrack(track, calibrationStatusOf(role)) && (
                <p className="mt-1 text-[10px] text-amber-200/90">Faixa indisponível para revisão.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
