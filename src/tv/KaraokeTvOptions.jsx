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
 */
export default function KaraokeTvOptions({ opts, setOpts, onRestart, onExit }) {
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
          <OptChoiceLine focusKey="KTV_OPT_0" label="Tamanho da letra" options={FONT_SCALES} value={opts.fontScale} onChange={(v) => set({ fontScale: v })} wrap={false} />
          <OptToggleLine label="Bolinha" on={opts.showBall} onToggle={() => set({ showBall: !opts.showBall })} />
          <OptToggleLine label="Modo dueto (P1 / P2)" icon={Users} on={opts.dueto} onToggle={() => set({ dueto: !opts.dueto })} />
          <OptToggleLine label="Medidor de energia" icon={Flame} on={opts.energy} onToggle={() => set({ energy: !opts.energy })} />
          <OptChoiceLine label="Tradução" icon={Globe} options={TRANSLATION_LANGS} value={opts.translate} onChange={(v) => set({ translate: v })} wrap />
          <OptChoiceLine label="Velocidade" options={PLAYBACK_RATES} value={opts.rate} onChange={(v) => set({ rate: v })} wrap={false} />
          <div className="tv-opts-divider" aria-hidden="true" />
          <OptActionLine focusKey="KTV_OPT_RESTART" label="Recomeçar música" icon={RotateCcw} onPress={onRestart} />
          <OptActionLine focusKey="KTV_OPT_EXIT" label="Sair do karaokê" icon={LogOut} onPress={onExit} danger />
          <p className="tv-opts-hint">Voltar para fechar</p>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
