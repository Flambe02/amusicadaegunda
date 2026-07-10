import { useEffect } from 'react';
import QRCode from 'react-qr-code';
import { PartyPopper, Users } from 'lucide-react';
import FocusableButton from './FocusableButton';
import '@/styles/tv-festa-invite.css';

/**
 * Écran d'invitation Modo Festa — affiché avant le choix de la première
 * chanson (cf. spec « Fila de músicas por telefone »). QR code + code de
 * session, liste des prénoms connectés (Realtime), et repli explicite
 * « Continuar sem fila » pour ne jamais bloquer la soirée si personne ne
 * scanne. Peut être rouvert plus tard depuis Início → Festa (même session
 * tant qu'elle est active) — cf. TvApp.jsx `openFestaInvite`.
 */
export default function TvFestaInvite({
  code, joinUrl, presentNames = [], loading = false, offline = false,
  onContinue, onBack, backInterceptorRef,
}) {
  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => { onBack?.(); return true; };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, onBack]);

  return (
    <div className="tv-festa-invite">
      <div className="tv-festa-invite-header">
        <PartyPopper size={40} strokeWidth={1.3} className="tv-festa-invite-icon" />
        <h1 className="tv-festa-invite-title">Entre na festa!</h1>
        <p className="tv-festa-invite-instruction">
          Acesse <strong>amusicadasegunda.com/festa</strong> no seu celular
        </p>
      </div>

      <div className="tv-festa-invite-body">
        <div className="tv-festa-invite-qr-block">
          {loading ? (
            <div className="tv-festa-invite-qr-placeholder">A preparar…</div>
          ) : offline || !code ? (
            <div className="tv-festa-invite-qr-placeholder">
              Não foi possível criar a sessão agora.<br />Pode continuar sem fila.
            </div>
          ) : (
            <>
              <div className="tv-festa-invite-qr" aria-hidden="true">
                <QRCode value={joinUrl} size={220} bgColor="#ffffff" fgColor="#0a0a0a" />
              </div>
              <p className="tv-festa-invite-code-label">Código</p>
              <p className="tv-festa-invite-code">{code}</p>
            </>
          )}
        </div>

        <div className="tv-festa-invite-guests">
          <p className="tv-festa-invite-guests-title">
            <Users size={18} /> Quem já entrou
          </p>
          {presentNames.length === 0 ? (
            <p className="tv-festa-invite-guests-empty">Ninguém entrou ainda — os nomes aparecem aqui na hora.</p>
          ) : (
            <ul className="tv-festa-invite-guests-list">
              {presentNames.map((name, i) => (
                <li key={`${name}-${i}`} className="tv-festa-invite-guest-pill">{name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="tv-festa-invite-actions">
        <FocusableButton
          focusKey="FESTA_INVITE_CONTINUE"
          autoFocus
          className="tv2-btn tv2-btn-karaoke tv-festa-invite-continue"
          ariaLabel="Continuar sem fila"
          onPress={onContinue}
        >
          Continuar sem fila
        </FocusableButton>
        <FocusableButton
          focusKey="FESTA_INVITE_BACK"
          className="tv-festa-invite-back"
          ariaLabel="Voltar"
          onPress={onBack}
        >
          Voltar
        </FocusableButton>
      </div>
    </div>
  );
}
