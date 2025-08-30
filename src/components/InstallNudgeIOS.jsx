import React from 'react';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true;

export default function InstallNudgeIOS({ onOpenTutorial }) {
  if (!isIOS() || isStandalone()) return null;
  return (
    <div style={{ padding:12, border:'1px solid #eee', borderRadius:12 }}>
      Pour activer les notifications, installe d'abord l'app sur l'écran d'accueil.
      <div style={{ marginTop:8 }}>
        <button onClick={onOpenTutorial} style={{ padding:'8px 12px', borderRadius:8 }}>
          Comment installer
        </button>
      </div>
    </div>
  );
}
