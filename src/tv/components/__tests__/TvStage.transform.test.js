import { describe, it, expect } from 'vitest';
import { computeTransform, TV_STAGE_MIN_WIDTH } from '../TvStage';

describe('TvStage — hauteur logique 1080, largeur variable', () => {
  it.each([
    [960, 540, 0.5],
    [1280, 720, 1280 / 1920],
    [1920, 1080, 1],
    [3840, 2160, 2],
  ])('16:9 (%i×%i): exactly the 1920 stage of before, no band — nothing changes on a TV box', (w, h, scale) => {
    const t = computeTransform(w, h);
    expect(t.width).toBe(1920);
    expect(t.scale).toBeCloseTo(scale, 10);
    expect(t.offsetX).toBeCloseTo(0, 6);
    expect(t.offsetY).toBeCloseTo(0, 6);
  });

  it.each([
    [1280, 800, 1728],
    [1440, 900, 1728],
    [2560, 1080, 2560],
    [3440, 1440, 2580],
  ])('wider or taller than 16:9 (%i×%i): the stage takes the whole width (%i logical px), no band', (w, h, width) => {
    const t = computeTransform(w, h);
    expect(t.width).toBe(width);
    expect(t.scale).toBeCloseTo(h / 1080, 10);
    expect(Math.abs(w - t.width * t.scale)).toBeLessThan(1);
    expect(t.offsetY).toBeCloseTo(0, 6);
  });

  it('too narrow for the layout (4:3, portrait): minimum logical width, bands above and below', () => {
    const t = computeTransform(1024, 768);
    expect(t.width).toBe(TV_STAGE_MIN_WIDTH);
    expect(t.scale).toBeCloseTo(1024 / TV_STAGE_MIN_WIDTH, 10);
    expect(t.offsetX).toBeCloseTo(0, 6);
    expect(t.offsetY).toBeGreaterThan(0);
    expect(t.offsetY * 2 + 1080 * t.scale).toBeCloseTo(768, 6);
  });

  it('no size yet: the 1920 stage at scale 1', () => {
    expect(computeTransform(0, 0)).toEqual({ scale: 1, offsetX: 0, offsetY: 0, width: 1920 });
  });
});
