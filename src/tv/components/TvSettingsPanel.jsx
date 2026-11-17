import { useEffect } from 'react';
import { WHATSAPP_CHANNEL_URL } from '@/lib/whatsappChannel';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Users, Flame, Globe, LogOut, X } from 'lucide-react';
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

/** Ordinateur : fermer à la souris (sur la TV, la touche Voltar suffit). */
function CloseButton({ onPress }) {
  const { ref, focused } = useFocusable({ focusKey: 'HSET_CLOSE', onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-label="Fechar os ajustes"
      className={`tv2-settings-close ${focused ? 'is-focused' : ''}`}
    >
      <X size={22} aria-hidden="true" /> Fechar
    </button>
  );
}

/** Lien discret vers une page du site (Sobre, Blog) ou vers le canal WhatsApp. */
function SiteLink({ focusKey, label, onPress }) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onPress });
  return (
    <button ref={ref} type="button" onClick={onPress} className={`tv2-settings-link ${focused ? 'is-focused' : ''}`}>
      {label}
    </button>
  );
}

/**
 * Panneau « Ajustes » de l'interface grand écran (bouton roue dentée de la barre).
 * Même source de vérité que KaraokePlayer (src/lib/karaokeOptions.js) : un
 * changement ici est relu au prochain lancement du karaokê (localStorage).
 *
 * Ordinateur (`web`, audit grand écran étape 4, 2026-11-16) : bouton « Fechar » et clic
 * hors du panneau pour fermer, pas de « Sair do aplicativo » (sans effet hors de l'app),
 * pas de « microfone da TV », aide « Esc » au lieu de « Voltar ».
 *
 * FOCUS BOUNDARY : tant qu'il est monté, les flèches ne peuvent pas atteindre l'écran
 * derrière. La fermeture (Retour / Échap) et le retour du focus sont gérés par TvApp.
 */
export default function TvSettingsPanel({ opts, setOpts, onExitApp, onOpenSitePage, onClose, web = false }) {
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
      {/* Clic sur le fond assombri = fermer (ordinateur). */}
      <div
        className="tv2-settings-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        role="presentation"
      >
        <div ref={ref} className="tv2-settings-panel" role="dialog" aria-modal="true" aria-labelledby="tv2-settings-title">
          <div className="tv2-settings-top">
            <h2 id="tv2-settings-title" className="tv2-settings-h">Ajustes</h2>
            {web && onClose && <CloseButton onPress={onClose} />}
          </div>
          <p className="tv2-settings-sub">Valem para o karaokê neste aparelho.</p>
          {/* Zone scrollable : SEULES les options défilent — la section Aplicativo
              reste TOUJOURS visible en bas, jamais hors écran. */}
          <div className="tv2-settings-scroll">
            <OptChoiceLine focusKey="HSET_0" label="Tamanho da letra" help="O tamanho da letra na tela." options={FONT_SCALES} value={opts.fontScale} onChange={(v) => set({ fontScale: v })} wrap={false} />
            <OptToggleLine focusKey="HSET_1" label="Bolinha" help="Uma bolinha pula de palavra em palavra e marca o ritmo." on={opts.showBall} onToggle={() => set({ showBall: !opts.showBall })} />
            <OptToggleLine focusKey="HSET_2" label="Modo dueto (P1 / P2)" help="Cada linha da letra mostra quem canta: P1 ou P2." icon={Users} on={opts.dueto} onToggle={() => set({ dueto: !opts.dueto })} />
            {/* Medidor de energia · Beta — sonde le microfone DE LA TV au lancement du
                karaokê. Sur ordinateur, le micro se règle dans « Antes de cantar ». */}
            {!web && (
              <OptToggleLine focusKey="HSET_3" label="Medidor de energia (microfone da TV) · Beta" help="Se a sua TV tiver microfone, mede a energia ao cantar. No Modo Festa também dá para usar o do celular." icon={Flame} on={opts.energy} onToggle={() => set({ energy: !opts.energy })} />
            )}
            <OptChoiceLine focusKey="HSET_4" label="Tradução" help="Mostra a tradução embaixo de cada linha, quando existe." icon={Globe} options={TRANSLATION_LANGS} value={opts.translate} onChange={(v) => set({ translate: v })} wrap />
            <OptChoiceLine focusKey="HSET_5" label="Velocidade" help="Mais devagar para treinar a letra." options={PLAYBACK_RATES} value={opts.rate} onChange={(v) => set({ rate: v })} wrap={false} />
          </div>

          <div className="tv2-settings-footer">
            <h2 className="tv2-settings-h tv2-settings-h-app">Aplicativo</h2>
            {onOpenSitePage && (
              <div className="tv2-settings-links">
                {/* Pages secondaires du site, dans cet ordre, Privacidade en dernier. Sur
                    ordinateur on y va ; sur la box, un QR code à ouvrir au téléphone. */}
                <SiteLink focusKey="HSET_SOBRE" label="Sobre o projeto" onPress={() => onOpenSitePage('Sobre o projeto', '/sobre/')} />
                <SiteLink focusKey="HSET_BLOG" label="Blog" onPress={() => onOpenSitePage('Blog', '/blog/')} />
                <SiteLink focusKey="HSET_GUIA" label="Guia: o que é paródia musical?" onPress={() => onOpenSitePage('Guia: o que é paródia musical?', '/guia/')} />
                {WHATSAPP_CHANNEL_URL && (
                  <SiteLink focusKey="HSET_WHATSAPP" label="Canal no WhatsApp" onPress={() => onOpenSitePage('Canal no WhatsApp', WHATSAPP_CHANNEL_URL)} />
                )}
                {/* Page de téléchargement de l'app TV : utile sur ordinateur, pas sur la box. */}
                {web && <SiteLink focusKey="HSET_TV" label="App para TV" onPress={() => onOpenSitePage('App para TV', '/tv/')} />}
                <SiteLink focusKey="HSET_PRIVACY" label="Privacidade" onPress={() => onOpenSitePage('Política de Privacidade', '/privacy/')} />
              </div>
            )}
            {/* « Sair do aplicativo » ne fait rien dans un navigateur (B6) : TV seulement. */}
            {!web && <ExitLine onPress={onExitApp} />}
            <p className="tv2-settings-hint">{web ? 'Esc ou clique fora para fechar' : 'Voltar para fechar'}</p>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
