import TvQueueIndicator from './TvQueueIndicator';

/**
 * Entête du catálogo : titre + phrase de contexte à gauche, indicateur de fila à
 * droite (seulement quand utile). Communique en < 5 s l'objet de l'écran :
 * « Escolha uma música, conheça a história e comece a cantar. »
 */
export default function TvCatalogHeader({ queueCount, festaQueueCount = 0, festaPeople, onOpenQueue }) {
  return (
    <div className="tvc-header">
      <div className="tvc-header-titles">
        <h1 className="tvc-header-title">Catálogo de músicas</h1>
        <p className="tvc-header-sub">Escolha uma música, conheça a história e comece a cantar.</p>
      </div>
      <TvQueueIndicator queueCount={queueCount} festaQueueCount={festaQueueCount} festaPeople={festaPeople} onOpen={onOpenQueue} />
    </div>
  );
}
