import { HelpCircle, Smartphone } from 'lucide-react';
import FocusableButton from './FocusableButton';

/**
 * Barre d'interaction persistante — TOUJOURS visible (rendue en dehors de la zone
 * scrollable de TvHomePage, jamais affectée par le défilement). Gauche : indice
 * télécommande statique (non focusable). Droite : action « Conecte seu celular »,
 * qui RÉUTILISE le flux d'invitation Modo Festa existant (QR + code) — cf.
 * `onConnectPhone` = `TvApp.openFestaInvite` via `onChooseMode('festa')`. Pas de
 * nouvel overlay dupliqué : ce chemin fait déjà exactement ça.
 */
export default function TvBottomInteractionBar({ onConnectPhone }) {
  return (
    <footer className="tvh-bottombar">
      <p className="tvh-bottombar-hint" aria-hidden="true">
        <HelpCircle size={18} />
        <strong>DICA</strong> Use as setas do controle para navegar e OK para selecionar.
      </p>

      <div className="tvh-bottombar-phone">
        <FocusableButton
          focusKey="HOME_PHONE_CONNECT"
          className="tvh-bottombar-phone-btn"
          ariaLabel="Conectar seu celular ao Modo Festa"
          onPress={onConnectPhone}
        >
          <Smartphone size={18} /> Conecte seu celular
        </FocusableButton>
        <span className="tvh-bottombar-url">amusicadasegunda.com</span>
      </div>
    </footer>
  );
}
