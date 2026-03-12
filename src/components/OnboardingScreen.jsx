import { useState, useEffect } from 'react';
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

export default function OnboardingScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage indisponível (modo privado restrito)
    }
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
      {/* Logo */}
      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl mb-6 flex-shrink-0">
        <img
          src={BRAND_LOGO_SMALL}
          alt="A Música da Segunda"
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          width="96"
          height="96"
        />
      </div>

      {/* Título */}
      <h1 className="text-4xl font-black text-white mb-2 leading-tight">
        A Música da Segunda
      </h1>
      <p className="text-[#32a2dc] font-bold text-lg mb-6">
        Nova paródia toda segunda-feira
      </p>

      {/* Descrição */}
      <p className="text-white/70 text-base max-w-xs leading-relaxed mb-10">
        Toda semana, os fatos do Brasil viram música.{' '}
        <span className="text-white/90 font-medium">Humor, paródia e criatividade</span>{' '}
        sobre as notícias que todo mundo está comentando.
      </p>

      {/* Features rápidas */}
      <div className="flex flex-col gap-3 w-full max-w-xs mb-10">
        {[
          { icon: '🎵', text: 'Nova música cada segunda-feira' },
          { icon: '🎡', text: 'A Roda — música aleatória surpresa' },
          { icon: '📅', text: 'Agenda com todas as paródias' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 text-left">
            <span className="text-xl flex-shrink-0">{icon}</span>
            <span className="text-white/90 text-sm font-medium">{text}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleStart}
        className="bg-[#32a2dc] hover:bg-[#2891c8] text-white font-black text-xl px-12 py-4 rounded-full shadow-2xl active:scale-95 transition-all duration-200 touch-manipulation"
      >
        Começar
      </button>
    </div>
  );
}
