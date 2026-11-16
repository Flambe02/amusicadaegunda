import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '@/styles/bs-reactions.css';

// Durées (ms) : une volée d'applaudissements, une tomate (vol + écrasement + coulure).
const CLAP_MS = 2400;
const TOMATO_MS = 3400;
// Au plus N effets de chaque sorte à la fois : 30 tomates d'un coup ne figent pas la TV.
const MAX_LIVE = 3;

let nextId = 1;
const rand = (min, max) => min + Math.random() * (max - min);

/** Tache de tomate : un corps irrégulier, des éclaboussures et des coulures. */
function Splat({ seed }) {
  const blobs = Array.from({ length: 11 }, (_, i) => {
    const angle = (i / 11) * Math.PI * 2 + seed;
    const dist = 150 + ((i * 37 + Math.round(seed * 100)) % 90);
    return { cx: 300 + Math.cos(angle) * dist, cy: 300 + Math.sin(angle) * dist * 0.8, r: 26 + ((i * 53) % 34) };
  });
  const drips = [220, 270, 330, 385].map((x, i) => ({ x, h: 80 + ((i * 61 + Math.round(seed * 50)) % 90) }));
  const seeds = [[250, 270], [330, 250], [290, 330], [360, 320], [230, 340], [310, 290]];
  return (
    <svg className="bs-react-splat-svg" viewBox="0 0 600 600" aria-hidden="true">
      <g className="bs-react-splat-body">
        <ellipse cx="300" cy="300" rx="215" ry="180" />
        {blobs.map((b, i) => <circle key={i} cx={b.cx} cy={b.cy} r={b.r} />)}
        {drips.map((d, i) => <rect key={i} className="bs-react-drip" x={d.x - 14} y="360" width="28" height={d.h} rx="14" />)}
      </g>
      {/* Reflet : la pulpe plus claire au centre, pour un « splash » qui a du volume. */}
      <ellipse className="bs-react-splat-shine" cx="265" cy="255" rx="120" ry="78" />
      <g className="bs-react-splat-seeds">
        {seeds.map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="9" ry="5" transform={`rotate(${i * 47} ${x} ${y})`} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Réactions en direct de la plateia sur l'écran du karaokê (Festa) : chaque 👏 envoyé
 * par un téléphone fait monter une volée d'applaudissements ; chaque 🍅 lance une grosse
 * tomate qui s'écrase au milieu de l'écran et cache presque les paroles (~2 s) avant de
 * couler et disparaître (demande du 2026-11-16).
 *
 * `applause` / `tomato` : compteurs de l'entrée qui passe (Realtime, festa_queue). On ne
 * réagit qu'aux HAUSSES vues pendant que l'écran est monté — jamais aux votes passés.
 * Purement décoratif : aucun focus, aucun clic.
 */
export default function TvReactionBurst({ applause = 0, tomato = 0 }) {
  const prev = useRef({ applause, tomato });
  const [effects, setEffects] = useState([]);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const before = prev.current;
    prev.current = { applause, tomato };
    const spawned = [];
    const claps = Math.min(MAX_LIVE, Math.max(0, applause - before.applause));
    const tomatoes = Math.min(MAX_LIVE, Math.max(0, tomato - before.tomato));
    for (let i = 0; i < claps; i += 1) {
      spawned.push({
        id: nextId++, kind: 'clap', delay: i * 180,
        hands: Array.from({ length: 9 }, () => ({ x: rand(4, 92), size: rand(56, 110), delay: rand(0, 500), drift: rand(-60, 60) })),
      });
    }
    for (let i = 0; i < tomatoes; i += 1) {
      spawned.push({ id: nextId++, kind: 'tomato', delay: i * 450, x: rand(-12, 12), y: rand(-8, 8), seed: rand(0, 6), tilt: rand(-25, 25) });
    }
    if (!spawned.length) return;
    setEffects((list) => [...list, ...spawned].slice(-MAX_LIVE * 2));
    spawned.forEach((e) => {
      timers.current.push(setTimeout(() => {
        setEffects((list) => list.filter((x) => x.id !== e.id));
      }, (e.kind === 'clap' ? CLAP_MS + 500 : TOMATO_MS) + e.delay));
    });
  }, [applause, tomato]);

  if (!effects.length) return null;
  // Même racine que le lecteur karaokê (portal #tv-portal-root dans la scène), par-dessus.
  const target = (typeof document !== 'undefined' && document.getElementById('tv-portal-root')) || document.body;
  return createPortal(
    <div className="bs-react-layer" aria-hidden="true" data-testid="tv-reactions">
      {effects.map((e) => (e.kind === 'clap' ? (
        <div key={e.id} className="bs-react-clap">
          {e.hands.map((h, i) => (
            <span
              key={i}
              className="bs-react-hand"
              style={{ left: `${h.x}%`, fontSize: `${h.size}px`, animationDelay: `${e.delay + h.delay}ms`, '--drift': `${h.drift}px` }}
            >
              👏
            </span>
          ))}
        </div>
      ) : (
        <div
          key={e.id}
          className="bs-react-tomato"
          style={{ '--tx': `${e.x}%`, '--ty': `${e.y}%`, '--tilt': `${e.tilt}deg` }}
        >
          <span className="bs-react-tomato-fly" style={{ animationDelay: `${e.delay}ms` }}>🍅</span>
          <div className="bs-react-splat" style={{ animationDelay: `${e.delay + 420}ms` }}>
            <Splat seed={e.seed} />
          </div>
        </div>
      )))}
    </div>,
    target,
  );
}
