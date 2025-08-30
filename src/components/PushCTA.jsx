import React from 'react';
import { enablePush, shouldShowPushCTA, optOutPushForever } from '../lib/push';

export default function PushCTA({ locale = 'fr', className = '' }) {
  // default to pt-BR for this app
  locale = 'pt-BR';
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { setVisible(shouldShowPushCTA()); }, []);

  if (!visible) return null;

  return (
    <div className={className} style={{ display:'flex', gap:8, alignItems:'center' }}>
      <button
        aria-label="Activer les notifications"
        disabled={busy}
        onClick={async () => {
          try { 
            setBusy(true); 
            await enablePush({ locale }); 
            toast('Notificações ativadas ✔'); 
            setVisible(false); 
          }
          catch (e) { 
            console.error('Push activation error:', e); 
            console.error('Error details:', {
              message: e.message,
              stack: e.stack,
              name: e.name
            });
            toast('Não foi possível ativar'); 
          }
          finally { 
            setBusy(false); 
          }
        }}
        style={{ padding:'10px 14px', borderRadius:9999 }}
      >
        🔔 Avise-me das novas músicas
      </button>
      <button
        aria-label="Ne plus proposer les notifications"
        onClick={() => { optOutPushForever(); setVisible(false); toast('Ok, on ne proposera plus.'); }}
        style={{ background:'transparent', border:'none', textDecoration:'underline', fontSize:12 }}
      >
        Não mostrar novamente
      </button>
    </div>
  );
}

// Minimal toast helper (no dep)
function toast(msg) {
  try { alert(msg); } catch {}
}
