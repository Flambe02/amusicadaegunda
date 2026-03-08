import { useState, useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';

// Digit flip card — animates when value changes
function FlipDigit({ value, label }) {
  const [current, setCurrent] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      setFlipping(true);
      const t = setTimeout(() => {
        setCurrent(value);
        setFlipping(false);
        prevRef.current = value;
      }, 220);
      return () => clearTimeout(t);
    }
  }, [value]);

  const display = String(current).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative w-14 h-16 perspective-[200px]"
        style={{ perspective: '200px' }}
      >
        {/* Card face */}
        <div
          className={`absolute inset-0 bg-[#1a2744] rounded-xl flex items-center justify-center shadow-lg transition-transform duration-[220ms] ease-in-out ${flipping ? 'scale-y-0' : 'scale-y-100'}`}
          style={{ transformOrigin: 'center', backfaceVisibility: 'hidden' }}
        >
          <span className="text-3xl font-black text-white tabular-nums leading-none">
            {display}
          </span>
        </div>
        {/* Separator line (classic flip-clock look) */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-black/20 z-10" />
      </div>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

export default function CountdownTimer({ compact = false }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay) % 7 || 7;

      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0);

      const difference = nextMonday - now;

      if (difference > 0) {
        return {
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60),
        };
      }
      return null;
    };

    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, []);

  // ── Compact mode (mobile Home) ──────────────────────────────────────────────
  if (compact) {
    if (!timeLeft) {
      return (
        <div className="flex items-center justify-center gap-2 py-1">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            🎵 Nova música disponível!
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center gap-3 py-1">
        <Timer className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
        <span className="text-white/60 text-xs">próxima:</span>
        {[
          { v: timeLeft.d, u: 'd' },
          { v: timeLeft.h, u: 'h' },
          { v: timeLeft.m, u: 'm' },
        ].map(({ v, u }) => (
          <span key={u} className="text-xs font-bold text-white">
            {v}<span className="text-white/50 font-normal">{u}</span>
          </span>
        ))}
      </div>
    );
  }

  // ── Full mode (desktop) — flip cards ───────────────────────────────────────
  if (!timeLeft) {
    return (
      <div className="bg-[#f8f5f2] rounded-3xl p-5 shadow-lg text-center">
        <h3 className="text-lg font-bold text-gray-800">É Segunda-feira!</h3>
        <p className="text-gray-600">A nova música já está disponível!</p>
      </div>
    );
  }

  const units = [
    { key: 'd', value: timeLeft.d, label: 'dias' },
    { key: 'h', value: timeLeft.h, label: 'horas' },
    { key: 'm', value: timeLeft.m, label: 'min' },
    { key: 's', value: timeLeft.s, label: 'seg' },
  ];

  return (
    <div className="bg-[#f8f5f2] rounded-3xl p-5 shadow-lg">
      <div className="flex items-center justify-center gap-3 mb-4">
        <Timer className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-700">Próxima música em...</h3>
      </div>
      <div className="flex items-end justify-center gap-2">
        {units.map(({ key, value, label }, i) => (
          <div key={key} className="flex items-start gap-2">
            <FlipDigit value={value} label={label} />
            {i < units.length - 1 && (
              <span className="text-2xl font-black text-gray-400 mt-1 leading-none select-none">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
