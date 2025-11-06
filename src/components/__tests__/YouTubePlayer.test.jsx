import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import YouTubePlayer from '../YouTubePlayer';

// Supprimer les console.warn en mode test
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  
  // Mock window.location.origin pour les tests
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      origin: 'https://www.amusicadasegunda.com',
    },
  });
});

describe('YouTubePlayer', () => {
  it('should render nothing when videoId is not provided', () => {
    const { container } = render(<YouTubePlayer />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when videoId is empty string', () => {
    const { container } = render(<YouTubePlayer videoId="" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when videoId is null', () => {
    const { container } = render(<YouTubePlayer videoId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render iframe when videoId is provided', () => {
    render(<YouTubePlayer videoId="dQw4w9WgXcQ" title="Test Video" />);
    const iframe = screen.getByTitle('Test Video');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));
  });

  it('should use youtube-nocookie.com domain for privacy', () => {
    render(<YouTubePlayer videoId="test123" />);
    const iframe = screen.getByTitle('YouTube Video');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube-nocookie.com'));
  });

  it('should include correct YouTube parameters', () => {
    render(<YouTubePlayer videoId="test123" />);
    const iframe = screen.getByTitle('YouTube Video');
    const src = iframe.getAttribute('src');
    expect(src).toContain('rel=0');
    expect(src).toContain('modestbranding=1');
    expect(src).toContain('playsinline=1');
    expect(src).toContain('controls=1');
    expect(src).toContain('enablejsapi=1');
  });

  it('should include origin parameter when window.location.origin is available', () => {
    render(<YouTubePlayer videoId="test123" />);
    const iframe = screen.getByTitle('YouTube Video');
    const src = iframe.getAttribute('src');
    expect(src).toContain('origin=');
    expect(src).toContain(encodeURIComponent('https://www.amusicadasegunda.com'));
  });

  it('should have correct iframe attributes for accessibility and security', () => {
    render(<YouTubePlayer videoId="test123" title="My Video" />);
    const iframe = screen.getByTitle('My Video');
    
    expect(iframe).toHaveAttribute('allow', expect.stringContaining('autoplay'));
    expect(iframe).toHaveAttribute('allow', expect.stringContaining('picture-in-picture'));
    expect(iframe).toHaveAttribute('referrerPolicy', 'strict-origin-when-cross-origin');
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(iframe).toHaveAttribute('allowFullScreen');
  });

  it('should render container with correct aspect ratio (16:9)', () => {
    const { container } = render(<YouTubePlayer videoId="test123" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle({ paddingBottom: '56.25%' }); // 16:9 aspect ratio
  });

  it('should accept custom className', () => {
    const { container } = render(<YouTubePlayer videoId="test123" className="custom-class" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });
});

