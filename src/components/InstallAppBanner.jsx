import { useState } from 'react';
import { Download, RefreshCcw, Share2, X } from 'lucide-react';
import usePWAInstall from '@/hooks/usePWAInstall';

export default function InstallAppBanner() {
  const {
    canInstall,
    isIOS,
    showIOSHint,
    updateAvailable,
    promptInstall,
    dismissIOSHint,
    applyUpdate,
  } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  const shouldRender = canInstall || showIOSHint || updateAvailable;

  const handleDismiss = () => {
    if (showIOSHint) {
      dismissIOSHint();
    }
    setDismissed(true);
  };

  if (!shouldRender || dismissed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[88px] z-[120] px-3 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm">
      <div className="pointer-events-auto rounded-[24px] border border-white/12 bg-black/78 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            {updateAvailable ? (
              <RefreshCcw className="h-5 w-5 text-[#FDE047]" />
            ) : canInstall ? (
              <Download className="h-5 w-5 text-[#FDE047]" />
            ) : (
              <Share2 className="h-5 w-5 text-[#FDE047]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {updateAvailable ? (
              <>
                <p className="text-sm font-semibold">Nova versao pronta</p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Atualize a PWA para receber o shell mobile e o cache offline mais recentes.
                </p>
              </>
            ) : canInstall ? (
              <>
                <p className="text-sm font-semibold">Instalar o app</p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Adicione a PWA a tela inicial para abrir mais rapido, receber push e manter o shell offline.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Instalar no iPhone</p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Toque em <span className="font-semibold text-white">Compartilhar</span> e depois em
                  {' '}<span className="font-semibold text-white">Adicionar a Tela de Inicio</span>.
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 transition hover:bg-white/8 hover:text-white"
            aria-label="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {updateAvailable ? (
            <button
              type="button"
              onClick={applyUpdate}
              className="min-h-[44px] flex-1 rounded-full bg-[#FDE047] px-4 text-sm font-semibold text-black transition active:scale-[0.99]"
            >
              Atualizar agora
            </button>
          ) : canInstall ? (
            <button
              type="button"
              onClick={promptInstall}
              className="min-h-[44px] flex-1 rounded-full bg-[#FDE047] px-4 text-sm font-semibold text-black transition active:scale-[0.99]"
            >
              Instalar
            </button>
          ) : null}

          {showIOSHint || updateAvailable ? (
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[44px] rounded-full border border-white/12 px-4 text-sm font-medium text-white/82 transition hover:bg-white/8"
            >
              Fechar
            </button>
          ) : null}
        </div>

        {isIOS && showIOSHint ? (
          <p className="mt-3 text-xs leading-5 text-white/48">
            O Safari nao dispara `beforeinstallprompt`, entao esse fluxo e manual.
          </p>
        ) : null}
      </div>
    </div>
  );
}
