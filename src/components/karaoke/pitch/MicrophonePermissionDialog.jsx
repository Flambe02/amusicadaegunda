import { Mic, ShieldCheck } from 'lucide-react';

/**
 * Diálogo de ativação/erro do guia de tom.
 *
 * Dois modos:
 *  - 'privacy' : explicação em PT ANTES do pedido do SO (§13). O microfone só é
 *    pedido quando o utilizador toca em « Ativar microfone » (gesto explícito).
 *  - 'error'   : estados claros de falha (§34) com ações adequadas. Uma falha do
 *    guia NUNCA bloqueia o karaokê normal.
 *
 * NÃO afirma privacidade que a implementação não respeita (§13): o áudio não é
 * gravado nem enviado — coerente com microphoneService (sem destino, sem upload).
 */
const ERROR_COPY = {
  unsupported: {
    title: 'Guia de tom indisponível',
    body: 'Este dispositivo não permite o acesso ao microfone.',
  },
  denied: {
    title: 'Microfone bloqueado',
    body: 'O acesso ao microfone foi negado. Podes ativá-lo nas definições e tentar de novo.',
  },
  'no-device': {
    title: 'Sem microfone',
    body: 'Não encontrámos um microfone neste dispositivo.',
  },
  interrupted: {
    title: 'Microfone interrompido',
    body: 'O microfone foi interrompido. Tenta novamente.',
  },
  'audio-context': {
    title: 'Não foi possível iniciar',
    body: 'Não foi possível iniciar a análise de voz.',
  },
  unknown: {
    title: 'Não foi possível ativar',
    body: 'Ocorreu um erro ao ativar o guia de tom.',
  },
};

export default function MicrophonePermissionDialog({ mode, errorCode, busy, onActivate, onDismiss }) {
  const isError = mode === 'error';
  const err = isError ? (ERROR_COPY[errorCode] || ERROR_COPY.unknown) : null;

  return (
    <div className="km-confirm-overlay" role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className="km-confirm km-mic-dialog" role="dialog" aria-modal="true"
        aria-label={isError ? err.title : 'Ativar guia de tom'}>
        <span className="km-mic-dialog-badge" aria-hidden="true">
          {isError ? <Mic className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
        </span>

        {isError ? (
          <>
            <p className="km-confirm-title">{err.title}</p>
            <p className="km-confirm-body">{err.body}</p>
            <div className="km-confirm-actions">
              <button type="button" className="km-confirm-no" onClick={onDismiss}>Continuar sem guia</button>
              {errorCode !== 'unsupported' && errorCode !== 'no-device' && (
                <button type="button" className="km-confirm-yes" onClick={onActivate} disabled={busy}>
                  Tentar novamente
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="km-confirm-title">Ativar guia de tom?</p>
            <p className="km-confirm-body">
              O microfone será usado apenas para analisar a altura da sua voz durante o karaokê.
              O áudio não será gravado nem enviado ao servidor.
            </p>
            <div className="km-confirm-actions">
              <button type="button" className="km-confirm-no" onClick={onDismiss}>Agora não</button>
              <button type="button" className="km-confirm-yes" onClick={onActivate} disabled={busy}>
                <Mic className="h-4 w-4" /> Ativar microfone
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
