import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

/**
 * Toast de confirmation non bloquant (jamais une modale). Auto-disparaît. Utilisé
 * pour « Adicionada à fila · posição 3 » / « Já está na fila · posição 3 ». Non
 * focusable — n'interfère jamais avec le D-pad. `nonce` force le redémarrage du
 * minuteur même si le message est identique (2 ajouts de suite).
 */
export default function TvToast({ message, nonce, onDone, duration = 2600 }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [message, nonce, onDone, duration]);

  if (!message) return null;
  return (
    <div className="tvc-toast" role="status" aria-live="polite">
      <CheckCircle2 size={20} /> {message}
    </div>
  );
}
