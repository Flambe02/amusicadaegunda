import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import YouTubeEmbed from '../YouTubeEmbed';

describe('YouTubeEmbed', () => {
  it('uses youtubeMusicUrl first by default', () => {
    render(
      <YouTubeEmbed
        youtubeMusicUrl="https://youtube.com/shorts/UpycJUeiuKo"
        youtubeUrl="https://music.youtube.com/watch?v=HGuJY8DvIxg"
        title="Test video"
      />
    );

    const iframe = screen.getByTitle('Test video');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('/embed/UpycJUeiuKo'));
  });

  it('uses youtubeUrl first when preferWatchUrl is enabled', () => {
    render(
      <YouTubeEmbed
        youtubeMusicUrl="https://youtube.com/shorts/UpycJUeiuKo"
        youtubeUrl="https://music.youtube.com/watch?v=HGuJY8DvIxg"
        title="Canonical video"
        preferWatchUrl
      />
    );

    const iframe = screen.getByTitle('Canonical video');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('/embed/HGuJY8DvIxg'));
  });
});

