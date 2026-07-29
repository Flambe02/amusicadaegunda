import { useEffect, useState } from 'react';
import { Mic2 } from 'lucide-react';
import FestaEnergyMic from './FestaEnergyMic';

// Après qu'une chanson quitte le statut « playing », on garde le panneau de réactions
// actif quelques secondes pour que les aplausos/tomates « de fin » atterrissent encore
// (la TV passe l'entrée en « done » et avance à la suivante).
const REACTION_GRACE_MS = 12000;

/**
 * Painel « Ao vivo » — TOUJOURS visible en haut de /festa (quelle que soit l'aba).
 * Montre qui chante MAINTENANT sur la TV et concentre les vraies interactions du
 * téléphone : aplaudir 👏, jogar tomate 🍅 et emprestar o microfone 🎤 (a TV não tem).
 *
 * Avant, ces actions étaient enterrées dans l'aba Fila et n'apparaissaient QUE ligne
 * par ligne pour l'entrée « playing » — d'où l'impression que « le portable ne sert
 * qu'à mettre son nom » (retour utilisateur 2026-07). Ici, dès qu'une música toca na
 * TV (statut `playing` posé par TvApp), le painel s'active en évidence.
 */
export default function FestaLivePanel({ queue, songsById, guestName, onApplaud, onTomato, sendEnergyReading }) {
  const playing = queue.find((q) => q.status === 'playing') || null;
  const playingId = playing?.id ?? null;

  // `reactId` = entrée réactable. Suit l'entrée qui joue ; à la fin, on la conserve
  // pendant la fenêtre de grâce (réactions « de fin ») avant de retomber sur l'écran
  // d'attente. Effet piloté par playingId uniquement (setter stable) → pas de reset
  // du minuteur à chaque nouvelle version de la fila.
  const [reactId, setReactId] = useState(playingId);
  useEffect(() => {
    if (playingId != null) { setReactId(playingId); return undefined; }
    const t = setTimeout(() => setReactId(null), REACTION_GRACE_MS);
    return () => clearTimeout(t);
  }, [playingId]);

  // Relue depuis la fila à jour (compteurs aplausos/tomates frais via Realtime). Une
  // entrée retirée (« skipped ») disparaît → find undefined → écran d'attente.
  const entry = reactId != null ? (queue.find((q) => q.id === reactId) || null) : null;

  if (!entry) {
    return (
      <div className="festa-live festa-live-idle">
        <p className="festa-live-idle-title">🎤 Ninguém cantando agora</p>
        <p className="festa-live-idle-sub">Quando começar na TV, você poderá aplaudir 👏, jogar tomate 🍅 ou emprestar seu microfone.</p>
      </div>
    );
  }

  const song = songsById.get(entry.song_id);
  const isSelf = Boolean(guestName) && entry.singer_name === guestName;

  return (
    <div className="festa-live">
      <div className="festa-live-head">
        <Mic2 size={18} className="festa-live-mic" />
        <div className="festa-live-text">
          <p className="festa-live-eyebrow">Tocando agora na TV</p>
          <p className="festa-live-song">{song?.title || 'Música'}</p>
          <p className="festa-live-singer">{isSelf ? 'É a tua vez! 🎤' : entry.singer_name}</p>
        </div>
      </div>

      {/* Réactions ouvertes à TOUT LE MONDE, y compris au chanteur sur sa propre
          chanson (décision produit 2026-07-15). L'ancienne règle « on ne s'applaudit
          pas soi-même » (`votable = canVoteFor && !isSelf`) rendait les boutons
          introuvables dans l'usage réel : en famille un SEUL téléphone circule, donc
          toutes les entrées de la fila portent le même prénom → plus personne ne
          pouvait réagir. Même logique permissive que le micro emprestado. */}
      <div className="festa-live-reactions">
        <button type="button" className="festa-vote-btn festa-vote-applause" onClick={() => onApplaud(entry.id)}>
          👏 Aplaudir{entry.applause_score > 0 ? ` (${entry.applause_score})` : ''}
        </button>
        <button type="button" className="festa-vote-btn festa-vote-tomato" onClick={() => onTomato(entry.id)}>
          🍅 Tomate{entry.tomato_score > 0 ? ` (${entry.tomato_score})` : ''}
        </button>
      </div>

      {/* Micro à distance : la TV n'a pas de micro, n'importe quel invité (y compris
          le chanteur) peut prêter le sien pendant que la música joue. */}
      {sendEnergyReading && <FestaEnergyMic entry={entry} sendEnergyReading={sendEnergyReading} />}
    </div>
  );
}
