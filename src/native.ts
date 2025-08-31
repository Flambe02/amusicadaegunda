import { Capacitor } from '@capacitor/core'

/**
 * Détecte si l'application s'exécute en mode natif (Android/iOS)
 * @returns true si natif, false si web
 */
export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform?.() === true
  } catch {
    return false
  }
}

/**
 * Détecte la plateforme spécifique
 * @returns 'android' | 'ios' | 'web'
 */
export const getPlatform = (): 'android' | 'ios' | 'web' => {
  try {
    if (Capacitor.isNativePlatform?.()) {
      return Capacitor.getPlatform() as 'android' | 'ios'
    }
    return 'web'
  } catch {
    return 'web'
  }
}

/**
 * Vérifie si une fonctionnalité Capacitor est disponible
 * @param pluginName Nom du plugin Capacitor
 * @returns true si disponible
 */
export const isPluginAvailable = (pluginName: string): boolean => {
  try {
    return Capacitor.isPluginAvailable?.(pluginName) === true
  } catch {
    return false
  }
}
