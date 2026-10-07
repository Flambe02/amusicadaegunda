import { describe, it, expect, beforeAll } from 'vitest';
import { render, act } from '@testing-library/react';
import { init, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import FocusableButton from '../../components/FocusableButton';
import FocusRow from '../../components/FocusRow';
import { followPointer, isPointerMode, setPointerMode } from '../pointerMode';
import packageJson from '../../../../package.json';
// Chemins de fichiers : ces paquets n'exposent pas leur package.json dans `exports`.
import wrapperPackage from '../../../../node_modules/@noriginmedia/norigin-spatial-navigation/package.json';
import corePackage from '../../../../node_modules/@noriginmedia/norigin-spatial-navigation-core/package.json';

beforeAll(() => {
  init({ debug: false, visualDebug: false });
});

const frame = () => act(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));

function Screen() {
  return (
    <div data-testid="root">
      <FocusRow>
        <FocusableButton focusKey="ONE" onPress={() => {}}><span data-testid="inside-one">Um</span></FocusableButton>
        <FocusableButton focusKey="TWO" onPress={() => {}}>Dois</FocusableButton>
      </FocusRow>
    </div>
  );
}

/**
 * Le survol de l'interface grand écran (followPointer) lit `SpatialNavigation.focusableComponents`,
 * une table INTERNE de la bibliothèque, absente de sa documentation. Ces tests sont le
 * garde-fou : ils échouent — avec un message qui dit quoi faire — si une montée de
 * version la renomme ou en change la forme.
 */
describe('navigation spatiale — table interne dont dépend le survol', () => {
  const HELP = 'Le survol (src/tv/lib/pointerMode.js) ne marchera plus : adapter followPointer à la nouvelle version, ou revenir à la version figée dans package.json.';

  it('the library versions are the pinned ones (exact, no ^ or ~)', () => {
    const pinned = packageJson.dependencies['@noriginmedia/norigin-spatial-navigation'];
    expect(pinned, 'package.json doit figer une version exacte').toMatch(/^\d+\.\d+\.\d+$/);
    expect(wrapperPackage.version).toBe(pinned);
    expect(packageJson.overrides['@noriginmedia/norigin-spatial-navigation-core']).toMatch(/^\d+\.\d+\.\d+$/);
    expect(corePackage.version).toBe(packageJson.overrides['@noriginmedia/norigin-spatial-navigation-core']);
  });

  it('SpatialNavigation.focusableComponents still exists', () => {
    expect(SpatialNavigation.focusableComponents, `SpatialNavigation.focusableComponents n'existe plus. ${HELP}`).toBeTypeOf('object');
    expect(SpatialNavigation.focusableComponents, HELP).not.toBeNull();
  });

  it('each entry still has the fields the hover reads: node, focusable, trackChildren', () => {
    const { getByText, unmount } = render(<Screen />);
    const table = SpatialNavigation.focusableComponents;
    const leaf = table.ONE;
    expect(leaf, `Aucune entrée pour la clé de focus « ONE ». ${HELP}`).toBeTruthy();
    expect(leaf.node, `Le champ « node » a disparu. ${HELP}`).toBe(getByText('Um').closest('button'));
    expect(leaf.focusable, `Le champ « focusable » a disparu. ${HELP}`).toBe(true);
    expect(leaf.trackChildren, `Le champ « trackChildren » a disparu. ${HELP}`).toBe(false);
    const container = Object.values(table).find((component) => component.trackChildren);
    expect(container, `Plus aucun conteneur marqué « trackChildren ». ${HELP}`).toBeTruthy();
    unmount();
  });
});

describe('followPointer — le survol déplace le focus', () => {
  it('hovering a focusable (or anything inside it) focuses that leaf, not its container', async () => {
    const { getByTestId, getByText, unmount } = render(<Screen />);
    const stop = followPointer(getByTestId('root'));
    const one = getByText('Um').closest('button');
    const two = getByText('Dois').closest('button');

    act(() => { getByTestId('inside-one').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    await frame();
    expect(one.className).toContain('is-focused');

    act(() => { two.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    await frame();
    expect(two.className).toContain('is-focused');
    expect(one.className).not.toContain('is-focused');

    stop();
    act(() => { one.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    await frame();
    expect(two.className).toContain('is-focused'); // plus d'écouteur : rien ne bouge
    unmount();
  });

  it('pointer mode is off unless the big-screen web app turns it on (never on the TV box)', () => {
    expect(isPointerMode()).toBe(false);
    setPointerMode(true);
    expect(isPointerMode()).toBe(true);
    setPointerMode(false);
    expect(isPointerMode()).toBe(false);
  });
});
