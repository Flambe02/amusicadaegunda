import { Capacitor } from '@capacitor/core';

/**
 * Adaptateur « bouton Retour » matériel — abstraction plateforme.
 *
 * Objectif : les composants TV n'appellent JAMAIS @capacitor/app directement.
 * Aujourd'hui l'implémentation couvre Android (Capacitor) + les touches Retour
 * clavier/télécommande (Escape, Backspace, Tizen 10009, webOS 461). Demain, un
 * portage Tizen/webOS remplacera ce seul module sans toucher au reste du code TV.
 *
 * @param {() => void} handler appelé à chaque appui « Retour ».
 * @returns {() => void} fonction de désinscription.
 */
export function onBackPress(handler) {
  const cleanups = [];

  // 1) Retour matériel Android via Capacitor.
  if (Capacitor?.isNativePlatform?.()) {
    let sub;
    import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', () => handler()))
      .then((s) => { sub = s; })
      .catch(() => { /* plugin absent → on garde le fallback clavier */ });
    cleanups.push(() => { try { sub?.remove?.(); } catch { /* ignore */ } });
  }

  // 2) Fallback clavier / télécommande (web, émulateur, Tizen, webOS).
  const onKey = (e) => {
    const isBack = e.key === 'Escape' || e.key === 'Backspace'
      || e.key === 'GoBack' || e.key === 'BrowserBack'
      || e.keyCode === 10009 /* Tizen return */ || e.keyCode === 461 /* webOS back */;
    if (!isBack) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // ne pas voler le Backspace d'un champ
    e.preventDefault();
    handler();
  };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  return () => cleanups.forEach((fn) => fn());
}

/** Quitte l'application (Android). No-op ailleurs — une impl Tizen fermera via son API. */
export function exitApp() {
  if (Capacitor?.isNativePlatform?.()) {
    import('@capacitor/app').then(({ App }) => App.exitApp()).catch(() => { /* ignore */ });
  }
}
