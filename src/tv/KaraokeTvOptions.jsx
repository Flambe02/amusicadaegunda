import { useEffect } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Users, Flame, Globe, RotateCcw, LogOut } from 'lucide-react';
import { FONT_SCALES, PLAYBACK_RATES, TRANSLATION_LANGS } from '@/lib/karaokeOptions';
import { OptChoiceLine, OptToggleLine, OptActionLine } from './components/TvOptionLines';

/**
 * Panneau d'options du karaoké TV — navigable au D-pad. Rendu (lazy) uniquement en
 * tvMode par KaraokePlayer → reste hors du bundle mobile.
 *
 * Ce panneau est un FOCUS BOUNDARY : Haut/Bas/←/→ ne peuvent pas en sortir (la barre
 * de transport / gear restent inatteignables tant qu'il est ouvert). Il RÉACTIVE la
 * nav spatiale à l'ouverture et la remet en PAUSE à la fermeture (retour aux touches
 * de lecture). Ordre : Tamanho → Bolinha → Dueto → Energia → Tradução → Velocidade.
 *
 * `micUnavailable` (posé par KaraokePlayer après une sonde getUserMedia ratée) → note
 * explicite au lieu d'une désactivation silencieuse du toggle « Medidor de energia ».
 */
export default function KaraokeTvOptions({ opts, setOpts, micUnavailable = false, onRestart, onExit }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'KTV_OPTS', isFocusBoundary: true, trackChildren: true, saveLastFocusedChild: true,
  });

  useEffect(() => {
    SpatialNavigation.resume();
    const t = setTimeout(() => { try { SpatialNavigation.setFocus('KTV_OPT_0'); } catch { /* ignore */ } }, 0);
    return () => { clearTimeout(t); SpatialNavigation.pause(); };
  }, []);

  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="tv-opts-overlay">
        <div ref={ref} className="tv-opts-panel">
          <h2 className="tv-opts-title">Opções</h2>
          {/* Zone scrollable : SEULES les options défilent — le footer (Recomeçar /
              Sair) reste TOUJOURS visible en bas du panneau, jamais hors écran. */}
          <div className="tv-opts-scroll">
            <OptChoiceLine focusKey="KTV_OPT_0" label="Tamanho da letra" options={FONT_SCALES} value={opts.fontScale} onChange={(v) => set({ fontScale: v })} wrap={false} />
            <OptToggleLine label="Bolinha" on={opts.showBall} onToggle={() => set({ showBall: !opts.showBall })} />
            <OptToggleLine label="Modo dueto (P1 / P2)" icon={Users} on={opts.dueto} onToggle={() => set({ dueto: !opts.dueto })} />
            {/* Medidor de energia · Beta — TENTE o microfone da TV (algumas TVs /
                soundbars / micros USB expõem uma entrada de áudio, a maioria não). Se
                não houver, o toggle volta a desligar e mostramos a nota abaixo, em vez
                de falhar em silêncio (bug 2026-07). No Modo Festa, o caminho fiável
                continua a ser o microfone do celular (jauge remoteEnergyLevel). */}
            <OptToggleLine label="Medidor de energia (microfone da TV) · Beta" icon={Flame} on={opts.energy} onToggle={() => set({ energy: !opts.energy })} />
            {micUnavailable
              ? <p className="tv-opts-note tv-opts-note-warn"><Flame size={15} /> Microfone não detectado nesta TV. No Modo Festa, use o microfone do celular.</p>
              : <p className="tv-opts-note"><Flame size={15} /> Se a sua TV tiver microfone, mede a energia ao cantar. No Modo Festa também dá para usar o do celular.</p>}
            <OptChoiceLine label="Tradução" icon={Globe} options={TRANSLATION_LANGS} value={opts.translate} onChange={(v) => set({ translate: v })} wrap />
            <OptChoiceLine label="Velocidade" options={PLAYBACK_RATES} value={opts.rate} onChange={(v) => set({ rate: v })} wrap={false} />
          </div>
          <div className="tv-opts-footer">
            <div className="tv-opts-divider" aria-hidden="true" />
            <OptActionLine focusKey="KTV_OPT_RESTART" label="Recomeçar música" icon={RotateCcw} onPress={onRestart} />
            <OptActionLine focusKey="KTV_OPT_EXIT" label="Sair do karaokê" icon={LogOut} onPress={onExit} danger />
            <p className="tv-opts-hint">Voltar para fechar</p>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
