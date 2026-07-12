import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { SearchX, FilterX, WifiOff } from 'lucide-react';
import FocusableButton from './FocusableButton';

// États vides / erreur du catálogo (filtre sans résultat, recherche sans résultat,
// échec de chargement). Chaque variante porte son message + ses actions, cf. cahier
// des charges. Les boutons sont dans leur propre groupe de focus.
const VARIANTS = {
  'empty-filter': {
    icon: FilterX,
    title: 'Nenhuma música encontrada com esses filtros.',
    sub: null,
    actions: [
      { id: 'clear', label: 'Limpar filtros', primary: true },
      { id: 'back', label: 'Voltar ao catálogo' },
    ],
  },
  'empty-search': {
    icon: SearchX,
    title: 'Não encontramos essa música.',
    sub: 'Tente buscar pelo tema, personagem ou uma palavra da letra.',
    actions: [
      { id: 'clear', label: 'Limpar busca', primary: true },
      { id: 'back', label: 'Voltar ao catálogo' },
    ],
  },
  error: {
    icon: WifiOff,
    title: 'Não foi possível carregar o catálogo.',
    sub: null,
    actions: [
      { id: 'retry', label: 'Tentar novamente', primary: true },
      { id: 'offline', label: 'Usar catálogo offline' },
    ],
  },
};

export default function TvEmptyCatalogState({ variant = 'empty-filter', onAction }) {
  const cfg = VARIANTS[variant] || VARIANTS['empty-filter'];
  const Icon = cfg.icon;
  const { ref, focusKey } = useFocusable({
    focusKey: 'CAT_EMPTY', trackChildren: true, saveLastFocusedChild: true, autoRestoreFocus: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="tvc-empty">
        <Icon size={54} strokeWidth={1.4} className="tvc-empty-icon" aria-hidden="true" />
        <p className="tvc-empty-title">{cfg.title}</p>
        {cfg.sub && <p className="tvc-empty-sub">{cfg.sub}</p>}
        <div className="tvc-empty-actions">
          {cfg.actions.map((a) => (
            <FocusableButton
              key={a.id}
              focusKey={`CAT_EMPTY_${a.id.toUpperCase()}`}
              className={`tvc-empty-btn ${a.primary ? 'is-primary' : ''}`}
              ariaLabel={a.label}
              onPress={() => onAction(a.id)}
            >
              {a.label}
            </FocusableButton>
          ))}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
