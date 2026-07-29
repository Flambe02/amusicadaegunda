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
}) {
  return (
    <section aria-label="Faixas locais" className="border-t border-white/10 bg-black/20 px-3 py-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <h3 className="text-[9px] font-bold uppercase tracking-wider text-white/35">Faixas locais</h3>
        <p className="text-[10px] text-emerald-300/80">{LOCAL_ONLY_NOTICE}</p>
      </div>

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
