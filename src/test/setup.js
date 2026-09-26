import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});


// jsdom n'implémente pas la capture de pointeur, que vaul (panneaux qui montent du bas)
// appelle au toucher : sans ces polyfills, Vitest relève des erreurs non gérées.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = function setPointerCapture() {};
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = function releasePointerCapture() {};
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = function hasPointerCapture() { return false; };
}
