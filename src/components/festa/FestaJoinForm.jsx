import { useState } from 'react';
import { PartyPopper } from 'lucide-react';

/**
 * Étape 1 de /festa — rejoindre une session. Pas de compte : juste un code
 * (pré-rempli si arrivé via le QR code, ?c=CODE) et un prénom local.
 */
export default function FestaJoinForm({ defaultCode = '', defaultName = '', onJoin, error, joining }) {
  const [code, setCode] = useState(defaultCode);
  const [name, setName] = useState(defaultName);

  const canSubmit = code.trim().length >= 4 && name.trim().length >= 1 && !joining;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onJoin(code.trim().toUpperCase(), name.trim().slice(0, 24));
  };

  return (
    <form className="festa-join" onSubmit={handleSubmit}>
      <div className="festa-join-header">
        <PartyPopper size={36} className="festa-join-icon" />
        <h1>Entre na festa!</h1>
        <p>Digite o código mostrado na TV e o seu nome para entrar na fila.</p>
      </div>

      <label className="festa-field">
        <span>Código da sessão</span>
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          maxLength={6}
          placeholder="SEGA26"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="festa-input festa-input-code"
        />
      </label>

      <label className="festa-field">
        <span>Seu nome</span>
        <input
          type="text"
          maxLength={24}
          placeholder="Como te chamam na festa?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="festa-input"
        />
      </label>

      {error && <p className="festa-error">{error}</p>}

      <button type="submit" className="festa-btn-primary" disabled={!canSubmit}>
        {joining ? 'Entrando…' : 'Entrar na festa'}
      </button>
    </form>
  );
}
