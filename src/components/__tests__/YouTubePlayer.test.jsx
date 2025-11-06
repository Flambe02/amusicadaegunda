import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import YouTubePlayer from '../YouTubePlayer';

// Supprimer les console.warn en mode test
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
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

  it('should render iframe when videoId is provided', () => {
    render(<YouTubePlayer videoId="dQw4w9WgXcQ" title="Test Video" />);
    const iframe = screen.getByTitle('Test Video');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));
  });

  it('should use youtube-nocookie.com domain', () => {
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
  });
});

