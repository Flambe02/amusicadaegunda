import { useEffect, useState } from 'react';
import { BRAND_LOGO_SMALL } from '@/lib/imageAssets';

const ONBOARDING_KEY = 'onboarding-v1-seen';

function isStandaloneExperience() {
  if (typeof window === 'undefined') return false;

  const supportsMatchMedia = typeof window.matchMedia === 'function';
  const displayModeStandalone = supportsMatchMedia && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches
  );

  return (
    displayModeStandalone ||
    window.navigator.standalone === true ||
    document.referrer.indexOf('android-app://') === 0
  );
}

export default function StandaloneOnboarding() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isStandaloneExperience()) return undefined;

    let timeoutId = null;
    let idleId = null;

    const reveal = () => {
      try {
        if (!localStorage.getItem(ONBOARDING_KEY)) {
          setVisible(true);
        }
      } catch {}
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(reveal, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(reveal, 600);
    }

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  const handleStart = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center p-8 text-center"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}
    >
      <div className="mb-6 h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-4 border-white/20 shadow-2xl">
        <img
          src={BRAND_LOGO_SMALL}
          alt="A Música da Segunda"
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          width="96"
          height="96"
        />
      </div>

      <h1 className="mb-2 text-4xl font-black leading-tight text-white">
        A Música da Segunda
      </h1>
      <p className="mb-6 text-lg font-bold text-[#32a2dc]">
        Nova paródia toda segunda-feira
      </p>

      <p className="mb-10 max-w-xs text-base leading-relaxed text-white/70">
        Toda semana, os fatos do Brasil viram música.{' '}
        <span className="font-medium text-white/90">Humor, paródia e criatividade</span>{' '}
        sobre as notícias que todo mundo está comentando.
      </p>

      <div className="mb-10 flex w-full max-w-xs flex-col gap-3">
        {[
          { icon: '🎵', text: 'Nova música cada segunda-feira' },
          { icon: '🎡', text: 'A Roda — música aleatória surpresa' },
          { icon: '📅', text: 'Agenda com todas as paródias' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left">
            <span className="text-xl">{icon}</span>
            <span className="text-sm font-medium text-white/90">{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleStart}
        className="touch-manipulation rounded-full bg-[#32a2dc] px-12 py-4 text-xl font-black text-white shadow-2xl transition-all duration-200 active:scale-95 hover:bg-[#2891c8]"
      >
        Começar
      </button>
    </div>
  );
}
