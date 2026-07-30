import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, ListChecks, RotateCcw, Sparkles, X } from 'lucide-react';
import { listEntries, markKnown, markToReview } from '@/lib/vocabNotebook';
import '@/styles/karaoke.css';

/**
 * Carnet de vocabulaire — Modo Aprender (bêta, §6.4 de la spec).
 *
 * Bottom-sheet indépendant de tout contexte karaoké/paroles : portalé directement
 * dans `document.body` avec un z-index au-dessus de TOUT (karaoke overlay z-9999,
 * son mixer z-10000, l'overlay des paroles z-50) — il doit rester ouvrable depuis
 * les deux points d'entrée (mode lecture dans LyricsDialog, mode karaoké), qui ne
 * vivent pas au même niveau d'empilement.
 *
 * Réutilise volontairement le même squelette (overlay, poignée, Escape, bouton
 * « retour » Android, piège de focus) que KaraokeMixerSheet plutôt qu'un Dialog
 * Radix : ce squelette est celui déjà éprouvé pour flotter par-dessus le lecteur
 * karaoké dans cet écosystème d'overlays empilés.
 *
 * Deux piles de révision seulement (`to_review` / `known`), sans répétition
 * espacée — comme conçu pour cette bêta (§6.4).
 */
export default function VocabNotebookSheet({ onClose }) {
  const panelRef = useRef(null);
  const [tab, setTab] = useState('lista'); // 'lista' | 'revisao'

  // Escape + bouton « voltar » Android + piège de focus — même logique que
  // KaraokeMixerSheet (proven pattern dans ce même empilement d'overlays).
  useEffect(() => {
    const previousActive = document.activeElement;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const focusable = panel?.querySelector('button, input, [tabindex]:not([tabindex="-1"])');
      (focusable || panel)?.focus?.();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); onClose(); return; }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const nodes = panel.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    let removeBackListener = null;
    import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', () => onClose()))
      .then((handle) => { removeBackListener = () => handle.remove(); })
      .catch(() => { /* web/PWA puro : Escape + toque bastam */ });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      if (removeBackListener) removeBackListener();
      if (previousActive && typeof previousActive.focus === 'function') previousActive.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="km-sheet-overlay"
      style={{ zIndex: 10050 }}
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Caderno de vocabulário" tabIndex={-1} className="km-sheet">
        <div className="km-sheet-handle-zone"><span className="km-sheet-handle" aria-hidden="true" /></div>

        <div className="km-sheet-head">
          <h2 className="km-sheet-title">Caderno de vocabulário</h2>
          <button type="button" className="km-icon-btn" onClick={onClose} aria-label="Fechar caderno">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="vocab-tabs" role="tablist" aria-label="Modo do caderno">
          <button type="button" role="tab" aria-selected={tab === 'lista'}
            className={`vocab-tab ${tab === 'lista' ? 'is-on' : ''}`} onClick={() => setTab('lista')}>
            <ListChecks className="h-4 w-4" /> Lista
          </button>
          <button type="button" role="tab" aria-selected={tab === 'revisao'}
            className={`vocab-tab ${tab === 'revisao' ? 'is-on' : ''}`} onClick={() => setTab('revisao')}>
            <RotateCcw className="h-4 w-4" /> Revisão
          </button>
        </div>

        <div className="km-sheet-body">
          {tab === 'lista' ? <VocabListView /> : <VocabReviewView />}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function VocabListView() {
  // Live à chaque rendu de cet onglet : reflète immédiatement un tap fait dans
  // le karaoké juste avant l'ouverture, et un classement fait dans l'onglet Révision.
  const entries = listEntries();

  if (entries.length === 0) {
    return (
      <div className="vocab-empty">
        <BookOpen className="h-8 w-8 text-white/25" aria-hidden="true" />
        <p>O caderno está vazio.</p>
        <p className="km-help">Toque numa expressão em destaque durante o karaokê para guardá-la aqui.</p>
      </div>
    );
  }

  return (
    <ul className="vocab-list">
      {entries.map((e) => (
        <li key={`${e.songSlug}|${e.expressionId}`} className="vocab-list-item">
          <div className="vocab-list-item-head">
            <span className="vocab-term">{e.term}</span>
            {e.review === 'known' && <Check className="h-3.5 w-3.5 text-emerald-400" aria-label="Já sabe" />}
          </div>
          <p className="vocab-meaning">{e.meaningFr}</p>
          <p className="vocab-source">{e.songTitle}</p>
        </li>
      ))}
    </ul>
  );
}

function VocabReviewView() {
  // Instantané pris à l'ouverture de l'onglet : la file de révision ne bouge pas
  // sous les pieds de l'utilisateur pendant qu'il la parcourt (flashcards classiques).
  const queue = useMemo(() => listEntries({ review: 'to_review' }), []);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = queue[index] || null;

  const advance = useCallback(() => {
    setRevealed(false);
    setIndex((i) => i + 1);
  }, []);

  const handleKnown = useCallback(() => {
    if (!current) return;
    markKnown(current.expressionId, current.songSlug);
    advance();
  }, [current, advance]);

  const handleToReview = useCallback(() => {
    if (!current) return;
    markToReview(current.expressionId, current.songSlug);
    advance();
  }, [current, advance]);

  if (queue.length === 0) {
    return (
      <div className="vocab-empty">
        <Sparkles className="h-8 w-8 text-white/25" aria-hidden="true" />
        <p>Nada para rever por agora.</p>
        <p className="km-help">As expressões guardadas aparecem aqui até você marcar « Já sei ».</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="vocab-empty">
        <Check className="h-8 w-8 text-emerald-400" aria-hidden="true" />
        <p>Revisão concluída!</p>
        <p className="km-help">Você passou pelas {queue.length} expressões desta sessão.</p>
      </div>
    );
  }

  return (
    <div className="vocab-review">
      <p className="km-help" aria-live="off">{index + 1} / {queue.length}</p>
      <button
        type="button"
        className="vocab-card"
        onClick={() => setRevealed((r) => !r)}
        aria-expanded={revealed}
      >
        <span className="vocab-card-term">{current.term}</span>
        {revealed ? (
          <span className="vocab-card-meaning">{current.meaningFr}</span>
        ) : (
          <span className="vocab-card-hint">Toque para revelar</span>
        )}
      </button>
      <div className="vocab-review-actions">
        <button type="button" className="vocab-action vocab-action--review" onClick={handleToReview}>
          <RotateCcw className="h-4 w-4" /> A revisar
        </button>
        <button type="button" className="vocab-action vocab-action--known" onClick={handleKnown}>
          <Check className="h-4 w-4" /> Já sei
        </button>
      </div>
    </div>
  );
}
