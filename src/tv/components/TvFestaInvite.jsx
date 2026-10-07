import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Mic } from 'lucide-react';
import FocusableButton from './FocusableButton';
import FocusRow from './FocusRow';
import '@/styles/bs-festa.css';

// Places de la rangée « Quem já entrou » : vides (pointillés) tant que personne n'est là.
const SEATS = 6;
const initialOf = (name) => (String(name || '').trim().charAt(0) || '?').toUpperCase();

/**
 * Salle d'attente du Modo Festa — maquette design/bigscreen/03-festa.png.
 * À gauche : « Chama a galera », les trois étapes, qui est déjà entré, « Começar a
 * cantar » et « Encerrar Festa ». À droite, la carte claire : le QR code de la session,
 * le code de la salle et l'adresse pour entrer sans caméra (amusicadasegunda.com/festa).
 *
 * Les invités n'ont pas d'avatar, seulement un prénom : un rond avec l'initiale.
 * Sans session (hors ligne), la fête peut commencer sans fila, comme avant.
 *
 * Retour : `onBack` (TvApp garde la session ouverte si quelqu'un a rejoint). « Encerrar
 * Festa » demande une confirmation, puis `onEnd` ferme la session.
 */
export default function TvFestaInvite({
  code, joinUrl, presentNames = [], loading = false, offline = false, queuedCount = 0,
  onContinue, onBack, onEnd, backInterceptorRef,
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (confirming) { setConfirming(false); return true; }
      onBack?.();
      return true;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, onBack, confirming]);

  // Le focus suit l'état : « Continuar » quand la confirmation s'ouvre, « Começar a
  // cantar » sinon.
  useEffect(() => {
    // Après le démontage des anciens boutons : la navigation spatiale replace d'abord le
    // focus sur leur parent, qui disparaît lui aussi.
    const id = setTimeout(() => {
      try { SpatialNavigation.setFocus(confirming ? 'FESTA_END_CANCEL' : 'FESTA_INVITE_CONTINUE'); } catch { /* ignore */ }
    }, 80);
    return () => clearTimeout(id);
  }, [confirming]);

  const seats = Array.from({ length: Math.max(SEATS, presentNames.length) }, (_, index) => presentNames[index] || null);
  const hasSession = Boolean(code) && !offline && !loading;

  return (
    <div className="bs-screen bs-festa">
      <span className="bs-festa-badge">Modo Festa</span>

      <div className="bs-festa-main">
        <h1 className="bs-festa-title">Chama a galera</h1>
        <p className="bs-festa-lead">Cada um entra pelo celular, escolhe a música e entra na fila. A TV cuida do resto.</p>

        <ol className="bs-festa-steps">
          <li><span className="bs-festa-step-n">1</span>Aponte a câmera para o código</li>
          <li><span className="bs-festa-step-n">2</span>Escreva seu nome</li>
          <li><span className="bs-festa-step-n">3</span>Escolha a música e entre na fila</li>
        </ol>

        <p className="bs-festa-guests-head">
          <span className="bs-festa-guests-title">Quem já entrou</span>
          <span className="bs-festa-guests-hint" aria-live="polite">
            {presentNames.length === 0
              ? 'Esperando a galera chegar'
              : `${presentNames.length} ${presentNames.length === 1 ? 'pessoa' : 'pessoas'}${queuedCount > 0 ? ` · ${queuedCount} ${queuedCount === 1 ? 'música' : 'músicas'} na fila` : ''}`}
          </span>
        </p>
        <ul className="bs-festa-seats">
          {seats.map((name, index) => (
            <li key={name ? `${name}-${index}` : `vazio-${index}`} className={`bs-festa-seat ${name ? 'is-taken' : ''}`}>
              <span className="bs-festa-seat-circle" aria-hidden={!name}>{name ? initialOf(name) : ''}</span>
              <span className="bs-festa-seat-name">{name || ''}</span>
            </li>
          ))}
        </ul>

        {/* `key` : chaque bloc est RECRÉÉ, pas réutilisé — la navigation spatiale enregistre la
            clé de focus au montage. */}
        {confirming ? (
          <FocusRow key="confirm" className="bs-festa-actions" focusKey="FESTA_END_CONFIRM">
            <span className="bs-festa-confirm">Encerrar a Festa?</span>
            <FocusableButton focusKey="FESTA_END_CANCEL" className="bs-btn bs-focus" onPress={() => setConfirming(false)}>
              Continuar
            </FocusableButton>
            <FocusableButton focusKey="FESTA_END_OK" className="bs-btn bs-btn-pink bs-focus" onPress={onEnd}>
              Encerrar
            </FocusableButton>
          </FocusRow>
        ) : (
          <FocusRow key="actions" className="bs-festa-actions" focusKey="FESTA_ACTIONS">
            <FocusableButton
              focusKey="FESTA_INVITE_CONTINUE"
              className="bs-btn bs-btn-primary bs-btn-pink bs-festa-start bs-focus"
              ariaLabel="Começar a cantar"
              onPress={onContinue}
            >
              <Mic size={28} aria-hidden="true" /> Começar a cantar
            </FocusableButton>
            <FocusableButton focusKey="FESTA_INVITE_BACK" className="bs-btn bs-focus" ariaLabel="Encerrar Festa" onPress={() => (onEnd ? setConfirming(true) : onBack?.())}>
              Encerrar Festa
            </FocusableButton>
          </FocusRow>
        )}
      </div>

      <aside className="bs-festa-qr-card" aria-label="Entrar na festa">
        <div className="bs-festa-qr">
          {hasSession ? (
            <QRCode value={joinUrl} size={388} bgColor="#FFF7F0" fgColor="#1A0710" />
          ) : (
            <p className="bs-festa-qr-empty">
              {loading ? 'A preparar…' : <>Não foi possível criar a sessão agora.<br />Pode começar sem fila.</>}
            </p>
          )}
        </div>
        {hasSession && (
          <>
            <p className="bs-festa-code-label">Código da sala</p>
            <p className="bs-festa-code">{code}</p>
            <p className="bs-festa-nocam">Sem câmera? Abra <strong>amusicadasegunda.com/festa</strong> no celular e digite o código.</p>
          </>
        )}
      </aside>
    </div>
  );
}
