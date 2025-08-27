import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import TikTokPlayer from '../TikTokPlayer';

// Mock des icônes lucide-react
vi.mock('lucide-react', () => ({
  Volume2: ({ children, ...props }) => <div data-testid="volume-icon" {...props}>{children}</div>,
  Play: ({ children, ...props }) => <div data-testid="play-icon" {...props}>{children}</div>,
  RotateCcw: ({ children, ...props }) => <div data-testid="rotate-icon" {...props}>{children}</div>,
}));

// Mock de window.postMessage
const mockPostMessage = vi.fn();
Object.defineProperty(window, 'postMessage', {
  writable: true,
  value: mockPostMessage,
});

// Mock de createElement et appendChild pour l'iframe
const mockIframe = {
  contentWindow: {
    postMessage: mockPostMessage,
  },
  onload: vi.fn(),
  onerror: vi.fn(),
  style: {},
};

const mockContainer = {
  innerHTML: '',
  appendChild: vi.fn(),
  requestFullscreen: vi.fn(),
  webkitRequestFullscreen: vi.fn(),
};

const mockCreateElement = vi.fn(() => mockIframe);
const mockAppendChild = vi.fn();

// Mock de document.createElement
Object.defineProperty(document, 'createElement', {
  writable: true,
  value: mockCreateElement,
});

// Mock de setTimeout
vi.useFakeTimers();

describe('TikTokPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPostMessage.mockClear();
    
    // Mock de containerRef.current
    vi.spyOn(React, 'useRef').mockReturnValue({
      current: mockContainer,
    });
  });

  describe('Rendu initial', () => {
    it('devrait afficher l\'overlay "Activer le son" quand muted', () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      expect(screen.getByText('Ativar Som')).toBeInTheDocument();
      expect(screen.getByTestId('volume-icon')).toBeInTheDocument();
    });

    it('devrait afficher l\'état de chargement initialement', () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      expect(screen.getByText('Carregando TikTok...')).toBeInTheDocument();
      expect(screen.getByTestId('rotate-icon')).toBeInTheDocument();
    });

    it('devrait afficher le bouton plein écran', () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      expect(screen.getByLabelText('Tela cheia')).toBeInTheDocument();
    });
  });

  describe('Gestion des messages postMessage', () => {
    it('devrait ignorer les messages d\'origine non autorisée', () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      const event = new MessageEvent('message', {
        origin: 'https://malicious-site.com',
        data: { event: 'onPlayerReady' }
      });
      
      window.dispatchEvent(event);
      
      // L'état de chargement devrait rester actif
      expect(screen.getByText('Carregando TikTok...')).toBeInTheDocument();
    });

    it('devrait traiter onPlayerReady correctement', async () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      const event = new MessageEvent('message', {
        origin: 'https://www.tiktok.com',
        data: { event: 'onPlayerReady' }
      });
      
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando TikTok...')).not.toBeInTheDocument();
      });
    });

    it('devrait traiter onStateChange:0 et relancer la vidéo', async () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      // Simuler onPlayerReady d'abord
      const readyEvent = new MessageEvent('message', {
        origin: 'https://www.tiktok.com',
        data: { event: 'onPlayerReady' }
      });
      window.dispatchEvent(readyEvent);
      
      // Simuler onStateChange:0 (fin de vidéo)
      const stateEvent = new MessageEvent('message', {
        origin: 'https://www.tiktok.com',
        data: { event: 'onStateChange', info: 0 }
      });
      
      window.dispatchEvent(stateEvent);
      
      // Avancer le temps pour déclencher le setTimeout
      vi.advanceTimersByTime(150);
      
      // Vérifier que les messages ont été envoyés
      expect(mockPostMessage).toHaveBeenCalledWith(
        { method: 'seekTo', value: 0 },
        'https://www.tiktok.com'
      );
    });

    it('devrait traiter onMute correctement', async () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      const event = new MessageEvent('message', {
        origin: 'https://www.tiktok.com',
        data: { event: 'onMute', info: 1 }
      });
      
      window.dispatchEvent(event);
      
      // L'overlay devrait être visible car muted
      expect(screen.getByText('Ativar Som')).toBeInTheDocument();
    });

    it('devrait traiter onError correctement', async () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      const event = new MessageEvent('message', {
        origin: 'https://www.tiktok.com',
        data: { event: 'onError', info: 'Network error' }
      });
      
      window.dispatchEvent(event);
      
      await waitFor(() => {
        expect(screen.getByText('Erro no player TikTok')).toBeInTheDocument();
      });
    });
  });

  describe('Interactions utilisateur', () => {
    it('devrait activer le son et relancer la vidéo au clic sur l\'overlay', async () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      // Simuler onPlayerReady
      const readyEvent = new MessageEvent('message', {
        origin: 'https://www.tiktok.com',
        data: { event: 'onPlayerReady' }
      });
      window.dispatchEvent(readyEvent);
      
      // Cliquer sur le bouton "Activer le son"
      const unmuteButton = screen.getByText('Ativar Som');
      fireEvent.click(unmuteButton);
      
      // Vérifier que les messages ont été envoyés
      expect(mockPostMessage).toHaveBeenCalledWith(
        { method: 'unMute', value: undefined },
        'https://www.tiktok.com'
      );
      expect(mockPostMessage).toHaveBeenCalledWith(
        { method: 'seekTo', value: 0 },
        'https://www.tiktok.com'
      );
      expect(mockPostMessage).toHaveBeenCalledWith(
        { method: 'play', value: undefined },
        'https://www.tiktok.com'
      );
    });

    it('devrait basculer en plein écran au clic sur le bouton', () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      const fullscreenButton = screen.getByLabelText('Tela cheia');
      fireEvent.click(fullscreenButton);
      
      expect(mockContainer.requestFullscreen).toHaveBeenCalled();
    });
  });

  describe('Validation des props', () => {
    it('devrait afficher un fallback si pas d\'ID', () => {
      render(<TikTokPlayer postId="" />);
      
      expect(screen.getByText('Vídeo TikTok não disponível')).toBeInTheDocument();
      expect(screen.getByText('ID da vídeo não fornecido ou inválido')).toBeInTheDocument();
    });

    it('devrait gérer les props controls et autoPlay', () => {
      render(
        <TikTokPlayer 
          postId="7467353900979424534" 
          controls={1} 
          autoPlay={false} 
        />
      );
      
      // Le composant devrait se rendre sans erreur
      expect(screen.getByText('Carregando TikTok...')).toBeInTheDocument();
    });
  });

  describe('Accessibilité', () => {
    it('devrait avoir des labels ARIA appropriés', () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      const unmuteButton = screen.getByLabelText('Ativar o som e reproduzir vídeo');
      const fullscreenButton = screen.getByLabelText('Tela cheia');
      
      expect(unmuteButton).toBeInTheDocument();
      expect(fullscreenButton).toBeInTheDocument();
    });

    it('devrait avoir des attributs aria-pressed appropriés', () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      const unmuteButton = screen.getByLabelText('Ativar o som e reproduzir vídeo');
      const fullscreenButton = screen.getByLabelText('Tela cheia');
      
      expect(unmuteButton).toHaveAttribute('aria-pressed', 'false');
      expect(fullscreenButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Gestion d\'erreur', () => {
    it('devrait afficher un lien de fallback en cas d\'erreur', async () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      // Simuler une erreur
      const errorEvent = new MessageEvent('message', {
        origin: 'https://www.tiktok.com',
        data: { event: 'onError', info: 'Network error' }
      });
      
      window.dispatchEvent(errorEvent);
      
      await waitFor(() => {
        expect(screen.getByText('Abrir no TikTok')).toBeInTheDocument();
      });
    });

    it('devrait gérer le timeout de sécurité', async () => {
      render(<TikTokPlayer postId="7467353900979424534" />);
      
      // Avancer le temps au-delà du timeout (15s)
      vi.advanceTimersByTime(16000);
      
      await waitFor(() => {
        expect(screen.getByText('Timeout ao carregar TikTok')).toBeInTheDocument();
      });
    });
  });
});
