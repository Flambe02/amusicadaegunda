import { useEffect } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Mic, Users } from 'lucide-react';
import FocusableButton from './FocusableButton';

/**
 * Petit écran transitoire : quand une chanson est choisie SANS contexte de mode
 * préalable (ex. depuis la rangée « Para cantar agora » ou « Ver todos os
 * karaokês »), on demande explicitement Karaokê normal vs Modo Festa — jamais de
 * comportement implicite selon le composant appelant (cf. cahier des charges).
 */
export default function TvKaraokeModeChooser({ song, onChooseKaraoke, onChooseFesta, festaDisabled }) {
  useEffect(() => {
    const t = setTimeout(() => { try { SpatialNavigation.setFocus('MODECHOOSER_KARAOKE'); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="tv-modechooser">
      <p className="tv-modechooser-eyebrow">Como queres cantar</p>
      <h1 className="tv-modechooser-title">{song?.title}</h1>
      <div className="tv-modechooser-actions">
        <FocusableButton
          focusKey="MODECHOOSER_KARAOKE"
          className="tv-modechooser-card"
          ariaLabel={`Cantar ${song?.title} no karaokê`}
          onPress={onChooseKaraoke}
        >
          <Mic size={30} />
          <span className="tv-modechooser-card-title">Karaokê</span>
          <span className="tv-modechooser-card-sub">Cantar agora, sozinho ou em dueto</span>
        </FocusableButton>
        <FocusableButton
          focusKey="MODECHOOSER_FESTA"
          className={`tv-modechooser-card ${festaDisabled ? 'is-disabled' : ''}`}
          ariaLabel="Ativar Modo Festa"
          onPress={festaDisabled ? undefined : onChooseFesta}
        >
          <Users size={30} />
          <span className="tv-modechooser-card-title">Modo Festa</span>
          <span className="tv-modechooser-card-sub">
            {festaDisabled ? 'Precisa de mais músicas karaokê' : 'Todos cantam juntos, em fila'}
          </span>
        </FocusableButton>
      </div>
    </div>
  );
}
