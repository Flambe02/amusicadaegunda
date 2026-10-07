import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import TvSongVisualPanel from '../TvSongVisualPanel';
import detailCss from '@/styles/tv-song-detail.css?raw';
import tvCss from '@/styles/tv.css?raw';

beforeAll(() => { init({ debug: false, visualDebug: false }); });

const panel = (props) => render(
  <TvSongVisualPanel
    artSrc="/poster.jpg" teaserThumb="/thumb.jpg" durationLabel="0:30" hasTeaser
    playing={false} videoVisible={false} error={false}
    hostRef={{ current: null }} progressRef={{ current: null }} wrapRef={{ current: null }} focusHolderRef={{ current: null }}
    onPlayTeaser={() => {}} onStopTeaser={() => {}}
    {...props}
  />
);
const rule = (css, selector) => {
  const start = css.indexOf(`${selector} {`);
  return start < 0 ? '' : css.slice(start, css.indexOf('}', start));
};

describe('Prévia do clipe — affiche d\'abord, jamais d\'écran noir', () => {
  it('idle: the poster and the teaser strip, no player', () => {
    const { container } = panel();
    expect(container.querySelector('.tvd-visual-art img').getAttribute('src')).toBe('/poster.jpg');
    expect(container.querySelector('.tvd-teaser')).toBeTruthy();
    expect(container.querySelector('.tvd-visual-player')).toBeNull();
  });

  it('playing but not started: the poster stays, the player is hidden over it, the wait cue is armed', () => {
    const { container } = panel({ playing: true });
    expect(container.querySelector('.tvd-visual-art img')).toBeTruthy();
    expect(container.querySelector('.tvd-visual-player').className).toContain('is-hidden');
    expect(container.querySelector('.tvd-visual-wait').getAttribute('data-active')).toBe('true');
  });

  it('PLAYING: the player is revealed, the wait cue fades, the poster is still mounted (no jump)', () => {
    const { container } = panel({ playing: true, videoVisible: true });
    expect(container.querySelector('.tvd-visual-player').className).not.toContain('is-hidden');
    expect(container.querySelector('.tvd-visual-wait').getAttribute('data-active')).toBe('false');
    expect(container.querySelector('.tvd-visual-art img')).toBeTruthy();
  });

  it('the same poster element survives the start of the teaser (never unmounted)', () => {
    const view = panel();
    const before = view.container.querySelector('.tvd-visual-art img');
    view.rerender(
      <TvSongVisualPanel
        artSrc="/poster.jpg" teaserThumb="/thumb.jpg" durationLabel="0:30" hasTeaser
        playing videoVisible={false} error={false}
        hostRef={{ current: null }} progressRef={{ current: null }} wrapRef={{ current: null }} focusHolderRef={{ current: null }}
        onPlayTeaser={() => {}} onStopTeaser={() => {}}
      />
    );
    expect(view.container.querySelector('.tvd-visual-art img')).toBe(before);
  });
});

describe('CSS du grand écran — règles du lecteur et de l\'attente', () => {
  it('the hidden player uses opacity and clip-path — never visibility:hidden nor display:none', () => {
    const hidden = rule(detailCss, '.tvd-visual-player.is-hidden');
    expect(hidden).toMatch(/opacity:\s*0/);
    expect(hidden).toMatch(/clip-path:/);
    for (const selector of ['.tvd-visual-player.is-hidden', '.tvd-visual-player', '.tvd-visual-host', '.tvd-visual-player iframe']) {
      expect(rule(detailCss, selector)).not.toMatch(/visibility\s*:\s*hidden|display\s*:\s*none/);
    }
  });

  it('the teaser wait cue shows nothing before 400 ms', () => {
    expect(rule(detailCss, ".tvd-visual-wait[data-active='true']")).toMatch(/transition:\s*opacity 200ms ease-out 400ms/);
    expect(rule(detailCss, '.tvd-visual-wait')).toMatch(/opacity:\s*0/);
  });

  it('the boot and karaoke wait cue (tv-wait) shows nothing before 400 ms', () => {
    expect(rule(tvCss, '.tv-wait > *')).toMatch(/animation:\s*tv-wait-in 240ms ease-out 400ms both/);
  });
});
