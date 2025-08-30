import React from 'react';
import { enablePush, shouldShowPushCTA, optOutPushForever, PUSH_VERSION, testPush, isMobile } from '../lib/push';

export default function PushCTA({ locale = 'fr', className = '' }) {
  // default to pt-BR for this app
  locale = 'pt-BR';
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { 
    console.log('🔍 PushCTA mounted, PUSH_VERSION:', PUSH_VERSION);
    const testResult = testPush();
    console.log('🧪 Test result:', testResult);
    
    // Debug de la détection mobile/desktop
    const mobileCheck = isMobile();
    console.log('📱 Détection mobile:', mobileCheck);
    console.log('🖥️ User Agent:', navigator.userAgent);
    
    // V2.0.0: Désactiver complètement les notifications push
    console.log('🚫 V2.0.0: Notifications push désactivées pour tous les appareils');
    setVisible(false);
    return;
  }, []);

  if (!visible) return null;

  // Sur desktop, afficher un message informatif
  if (!isMobile()) {
    return (
      <div className={className} style={{ display:'flex', gap:8, alignItems:'center', padding:'10px 14px', borderRadius:8, background:'#f3f4f6', color:'#6b7280', fontSize:'14px' }}>
        📱 <span>Instale o app para receber notificações automáticas</span>
      </div>
    );
  }

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
