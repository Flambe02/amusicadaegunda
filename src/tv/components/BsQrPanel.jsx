import { useEffect } from 'react';
import QRCode from 'react-qr-code';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';

/**
 * Painel « abrir no celular » : sur la box TV, un lien externe (Spotify, YouTube Music,
 * partage) ferait sortir de l'app. On montre le lien en QR code, à scanner avec le
 * téléphone. Un seul élément interactif (Fechar) : la navigation spatiale est en pause,
 * OK ferme ; le Retour est géré par l'écran parent (intercepteur) qui appelle `onClose`.
 */
export default function BsQrPanel({ title, url, onClose }) {
  useEffect(() => {
    SpatialNavigation.pause();
    const onKey = (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); SpatialNavigation.resume(); };
  }, [onClose]);

  return (
    <div className="bs-qr-overlay" role="dialog" aria-label={title}>
      <div className="bs-qr-panel">
        <h2 className="bs-qr-title">{title}</h2>
        <div className="bs-qr-code" aria-hidden="true">
          <QRCode value={url} size={300} bgColor="#FFF7F0" fgColor="#1A0710" />
        </div>
        <p className="bs-qr-hint">Aponte a câmera do celular para abrir</p>
        <button type="button" className="bs-btn bs-btn-small bs-focus is-focused" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
