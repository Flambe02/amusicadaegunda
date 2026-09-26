import { describe, it, expect } from 'vitest';
import appSource from '../App.jsx?raw';

// L'invite « Activer les notifications » échouait toujours en ligne (table Supabase
// `push_subscriptions` et fonction d'envoi absentes) : elle est retirée tant que la
// chaîne n'est pas en place (TODO-apres-refonte.md §18).
describe('App — pas d\u2019invite de notifications push', () => {
  it('no longer mounts the push notification invite', () => {
    expect(appSource).not.toMatch(/import\(['"]@\/components\/PushCTA['"]\)/);
    expect(appSource).not.toMatch(/<PushCTA\b/);
  });
});
