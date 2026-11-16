import { installInviteAllowed } from '@/lib/installInvite';
// Utilitaires pour la détection PWA et iOS
export const detectIOS = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
};

export const detectStandalone = () => {
  return window.navigator.standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches;
};

export const detectPWA = () => {
  return 'serviceWorker' in navigator && 
         window.matchMedia('(display-mode: standalone)').matches;
};

export const detectSafari = () => {
  const userAgent = navigator.userAgent;
  return /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
};

export const detectMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Même règle que la bannière « Instalar o app » (src/lib/installInvite.js) : jamais à
// la première visite, silence de 30 jours après « Fechar » (audit UX du 2026-11-15).
export const shouldShowTutorial = () => {
  const ios = detectIOS();
  const standalone = detectStandalone();
  let tutorialSeen = null;
  try {
    tutorialSeen = localStorage.getItem('ios-tutorial-seen');
  } catch {
    /* stockage indisponible */
  }

  return ios && !standalone && !tutorialSeen && installInviteAllowed();
};

export const getInstallPrompt = () => {
  // Pour Chrome/Edge
  if (window.deferredPrompt) {
    return window.deferredPrompt;
  }
  
  // Pour Safari iOS
  if (detectIOS() && detectSafari()) {
    return 'ios-safari';
  }
  
  return null;
};

export const showInstallInstructions = (platform) => {
  const instructions = {
    'ios-safari': {
      title: 'Ajouter à l\'écran d\'accueil',
      steps: [
        'Appuyez sur le bouton Partager (carré avec flèche)',
        'Faites défiler et appuyez sur "Sur l\'écran d\'accueil"',
        'Appuyez sur "Ajouter"'
      ]
    },
    'android-chrome': {
      title: 'Installer l\'application',
      steps: [
        'Appuyez sur le menu (trois points)',
        'Sélectionnez "Ajouter à l\'écran d\'accueil"',
        'Appuyez sur "Ajouter"'
      ]
    },
    'desktop-chrome': {
      title: 'Installer l\'application',
      steps: [
        'Cliquez sur l\'icône d\'installation dans la barre d\'adresse',
        'Cliquez sur "Installer"'
      ]
    }
  };
  
  return instructions[platform] || instructions['ios-safari'];
};
