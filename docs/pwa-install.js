// Script d'installation PWA pour Musica da Segunda
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null
    this.installButton = null
    this.pendingWorker = null
    this.isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    this.init()
  }

  debug(...args) {
    if (this.isLocalDev) {
      console.log(...args)
    }
  }

  debugError(...args) {
    if (this.isLocalDev) {
      console.error(...args)
    }
  }

  init() {
    this.registerServiceWorker()
    this.listenForServiceWorkerControllerChange()

    // En local, ne pas activer le flux d'installation
    if (this.isLocalDev) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            regs.forEach((r) => r.unregister())
            this.debug('DEV: Service Worker desinstalle pour eviter tout cache')
          })
          .catch(() => {})
      }
      return
    }

    this.listenForInstallPrompt()
    this.createInstallButton()
  }

  async registerServiceWorker() {
    if (this.isLocalDev) {
      this.debug('DEV mode: Service Worker desactive pour eviter les conflits HMR')
      return
    }

    // Eviter l'enregistrement du SW dans l'app native Capacitor
    const isNativeCapacitor =
      typeof window !== 'undefined' &&
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform() === true

    if (isNativeCapacitor) {
      return
    }

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')

        // Verifier les mises a jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.pendingWorker = newWorker
              this.showUpdateNotification()
            }
          })
        })
      } catch (error) {
        this.debugError('Erreur enregistrement Service Worker:', error)
      }
    }
  }

  listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.deferredPrompt = e

      if (this.installButton) {
        this.installButton.setAttribute('aria-hidden', 'false')
        this.installButton.setAttribute('data-visible', 'true')

        setTimeout(() => {
          if (this.installButton.getAttribute('data-visible') === 'true') {
            this.installButton.setAttribute('aria-live', 'polite')
          }
        }, 2000)
      }
    })
  }

  createInstallButton() {
    const linkElem = document.createElement('link')
    linkElem.rel = 'stylesheet'
    linkElem.href = '/pwa-install.css'
    document.head.appendChild(linkElem)

    this.installButton = document.createElement('button')
    this.installButton.className = 'pwa-install-button'
    this.installButton.setAttribute('type', 'button')
    this.installButton.setAttribute('aria-label', 'Instalar aplicacao como PWA')
    this.installButton.setAttribute('role', 'button')
    this.installButton.textContent = 'Instalar App'

    this.installButton.setAttribute('aria-hidden', 'true')
    this.installButton.setAttribute('data-visible', 'false')

    document.body.appendChild(this.installButton)

    this.installButton.addEventListener('click', () => {
      this.installPWA()
    })

    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.installButton.setAttribute('aria-hidden', 'true')
      this.installButton.setAttribute('data-visible', 'false')
    }
  }

  async installPWA() {
    if (!this.deferredPrompt) return

    this.deferredPrompt.prompt()

    const { outcome } = await this.deferredPrompt.userChoice
    if (outcome === 'accepted') {
      this.installButton.setAttribute('aria-hidden', 'true')
      this.installButton.setAttribute('data-visible', 'false')

      this.showSuccessNotification()
      this.activatePushNotifications()
    }

    this.deferredPrompt = null
  }

  // Les notifications doivent etre activees manuellement par l'utilisateur
  async activatePushNotifications() {
    this.debug('Push notifications: activation manuelle uniquement')
  }

  showUpdateNotification() {
    const existing = document.getElementById('pwa-update-banner')
    if (existing) return

    const banner = document.createElement('div')
    banner.id = 'pwa-update-banner'
    banner.setAttribute('role', 'alert')
    banner.style.cssText = [
      'position:fixed', 'bottom:16px', 'left:50%', 'transform:translateX(-50%)',
      'background:#0f172a', 'color:#fff', 'padding:12px 20px', 'border-radius:12px',
      'display:flex', 'align-items:center', 'gap:12px', 'z-index:9999',
      'font-family:system-ui,sans-serif', 'font-size:14px',
      'box-shadow:0 4px 20px rgba(0,0,0,0.3)', 'max-width:90vw'
    ].join(';')

    const msg = document.createElement('span')
    msg.textContent = 'Nova versão disponível!'

    const btn = document.createElement('button')
    btn.textContent = 'Atualizar'
    btn.style.cssText = [
      'background:#32a2dc', 'color:#fff', 'border:none', 'border-radius:8px',
      'padding:6px 14px', 'cursor:pointer', 'font-size:13px', 'font-weight:600',
      'white-space:nowrap'
    ].join(';')
    btn.addEventListener('click', () => {
      banner.remove()
      if (this.pendingWorker) {
        this.pendingWorker.postMessage({ type: 'SKIP_WAITING' })
      }
    })

    const close = document.createElement('button')
    close.textContent = '✕'
    close.setAttribute('aria-label', 'Fechar')
    close.style.cssText = [
      'background:transparent', 'color:#94a3b8', 'border:none',
      'cursor:pointer', 'font-size:14px', 'padding:0 2px'
    ].join(';')
    close.addEventListener('click', () => banner.remove())

    banner.appendChild(msg)
    banner.appendChild(btn)
    banner.appendChild(close)
    document.body.appendChild(banner)
  }

  listenForServiceWorkerControllerChange() {
    if (!('serviceWorker' in navigator)) return

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }

  showSuccessNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Musica da Segunda', {
        body: 'App instalada com sucesso!',
        icon: '/icons/pwa/icon-192x192.png',
        badge: '/icons/pwa/icon-72x72.png'
      })
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PWAInstaller()
  })
} else {
  new PWAInstaller()
}

// Conversion Base64 vers Uint8Array (reserve pour usage push)
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const getVAPIDKey = () => {
  if (typeof window !== 'undefined' && window.__VAPID_PUBLIC_KEY__) {
    return window.__VAPID_PUBLIC_KEY__
  }
  return 'BIp5mr-_lJ_hhA009N0VFN-48799w_Bzx7Itz4PVFAPZHG9A8Odpbg2aa_gbGZIB-Xej1mFCEOodyQY2H0jUJXI'
}

void urlBase64ToUint8Array
void getVAPIDKey
