import { describe, it, expect } from 'vitest';
import { QUICK_FILTERS, filterCatalog } from '../tvCatalogFilters';

const vm = (id, extra = {}) => ({ id, title: `M${id}`, difficulty: 'easy', recommendedModes: [], raw: {}, ...extra });

describe('catálogo — filtre « Favoritas » (audit étape 6)', () => {
  it('keeps only this device’s favourites', () => {
    const vms = [vm(1), vm(2), vm(3)];
    const out = filterCatalog(vms, { quickId: 'favoritas', favorites: new Set(['3', '1']) });
    expect(out.map((v) => v.id)).toEqual([1, 3]);
  });

  it('without favourites the filter keeps nothing and is flagged to be hidden', () => {
    expect(filterCatalog([vm(1)], { quickId: 'favoritas' })).toEqual([]);
    expect(QUICK_FILTERS.find((f) => f.id === 'favoritas').needsFavorites).toBe(true);
    expect(filterCatalog([vm(1)], { quickId: 'todas' })).toHaveLength(1);
  });
});
