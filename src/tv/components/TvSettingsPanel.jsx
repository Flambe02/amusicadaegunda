import { useEffect } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Users, Flame, Globe, LogOut } from 'lucide-react';
import { FONT_SCALES, PLAYBACK_RATES, TRANSLATION_LANGS } from '@/lib/karaokeOptions';
import { OptChoiceLine, OptToggleLine } from './TvOptionLines';

function ExitLine({ onPress }) {
  const { ref, focused } = useFocusable({ focusKey: 'HSET_EXIT', onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-label="Sair do aplicativo"
      className={`tv2-settings-exit ${focused ? 'is-focused' : ''}`}
    >
      <LogOut size={18} /> Sair do aplicativo
    </button>
  );
}

/**
 * Panneau de réglages de l'accueil TV — ouvert par l'avatar (HOME_SETTINGS).
 * Même source de vérité que KaraokePlayer (src/lib/karaokeOptions.js) : un
 * changement ici est relu au prochain lancement du karaokê (localStorage).
 *
 * FOCUS BOUNDARY : tant qu'il est monté, les flèches ne peuvent pas atteindre le
 * hero/les rails derrière. La nav spatiale de l'accueil n'est JAMAIS mise en pause
 * (contrairement au karaokê) — inutile de la réactiver ici. La fermeture (Retour)
 * et la restauration du focus sur l'avatar sont gérées par TvHome.
 */
export default function TvSettingsPanel({ opts, setOpts, onExitApp }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'HOME_SETTINGS_PANEL', isFocusBoundary: true, trackChildren: true, saveLastFocusedChild: true,
  });

  useEffect(() => {
    const t = setTimeout(() => { try { SpatialNavigation.setFocus('HSET_0'); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);

  const set = (patch) => setOpts((o) => ({ ...o, ...patch }));

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="tv2-settings-overlay">
        <div ref={ref} className="tv2-settings-panel">
          <h2 className="tv2-settings-h">Configurações do karaokê</h2>
          {/* Zone scrollable : SEULES les options défilent — la section Aplicativo
              (Sair) reste TOUJOURS visible en bas, jamais hors écran. */}
          <div className="tv2-settings-scroll">
            <OptChoiceLine focusKey="HSET_0" label="Tamanho da letra" options={FONT_SCALES} value={opts.fontScale} onChange={(v) => set({ fontScale: v })} wrap={false} />
            <OptToggleLine focusKey="HSET_1" label="Bolinha" on={opts.showBall} onToggle={() => set({ showBall: !opts.showBall })} />
            <OptToggleLine focusKey="HSET_2" label="Modo dueto (P1 / P2)" icon={Users} on={opts.dueto} onToggle={() => set({ dueto: !opts.dueto })} />
            {/* PAS de toggle « Medidor de energia » sur TV (pas de micro — le toggle
                se désactivait silencieusement). L'énergie vient du celular en Modo Festa. */}
            <p className="tv-opts-note"><Flame size={15} /> Medidor de energia: disponível no Modo Festa, usando o microfone do celular.</p>
            <OptChoiceLine focusKey="HSET_4" label="Tradução" icon={Globe} options={TRANSLATION_LANGS} value={opts.translate} onChange={(v) => set({ translate: v })} wrap />
            <OptChoiceLine focusKey="HSET_5" label="Velocidade" options={PLAYBACK_RATES} value={opts.rate} onChange={(v) => set({ rate: v })} wrap={false} />
          </div>

          <div className="tv2-settings-footer">
            <h2 className="tv2-settings-h tv2-settings-h-app">Aplicativo</h2>
            <ExitLine onPress={onExitApp} />
            <p className="tv2-settings-hint">Voltar para fechar</p>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
