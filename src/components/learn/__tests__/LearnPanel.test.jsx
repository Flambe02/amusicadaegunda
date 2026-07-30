import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LearnPanel from '@/components/learn/LearnPanel';
import { CAMARADA_SONG, OVO_SONG } from '@/lib/__tests__/fixtures/pilotSongs';

/**
 * Vérifie le mode lecture active contre la SEGMENTATION RÉELLE des deux chansons
 * pilotes (fixtures extraites de Supabase), et non contre des paroles inventées.
 */

// Le panneau charge sa fiche en import dynamique : on attend son premier rendu utile.
const renderPanel = async (song, slug) => {
  render(<LearnPanel song={song} slug={slug} />);
  await screen.findByText(/Touchez une ligne/i, {}, { timeout: 3000 });
};

describe('LearnPanel — Camarada Quer CPF (timing par LRC)', () => {
  it('affiche toutes les lignes en portugais, sans aucune traduction visible au départ', async () => {
    await renderPanel(CAMARADA_SONG, 'camarada-quer-cpf');

    expect(screen.getByText('Victor chegou no Brasil')).toBeInTheDocument();
    // La chute est répétée dans le LRC (lignes 59 et 61) : les deux occurrences sont
    // rendues, chacune comme sa propre entrée tappable.
    expect(screen.getAllByText('Pode assinar no cartório')).toHaveLength(2);
    // Critère 2 : rien n'est révélé tant qu'on n'a pas tapé
    expect(screen.queryByText('Victor est arrivé au Brésil')).not.toBeInTheDocument();
  });

  it('révèle la traduction française exacte au tap, et la garde ouverte', async () => {
    const user = userEvent.setup();
    await renderPanel(CAMARADA_SONG, 'camarada-quer-cpf');

    const ligne = screen.getByText('Victor chegou no Brasil').closest('button');
    expect(ligne).toHaveAttribute('aria-expanded', 'false');

    await user.click(ligne);
    expect(screen.getByText('Victor est arrivé au Brésil')).toBeInTheDocument();
    expect(ligne).toHaveAttribute('aria-expanded', 'true');

    // §6.2 : pas de refermeture automatique quand on ouvre une autre ligne
    await user.click(screen.getByText('Queria virar cria').closest('button'));
    expect(screen.getByText('Victor est arrivé au Brésil')).toBeInTheDocument();
    expect(screen.getByText('Il voulait devenir un gars du coin')).toBeInTheDocument();
  });

  it('affiche les trois expressions et le contexte culturel, toujours visibles', async () => {
    await renderPanel(CAMARADA_SONG, 'camarada-quer-cpf');

    // Critère 3 — section expressions
    expect(screen.getByText('CPF')).toBeInTheDocument();
    expect(screen.getByText('jeitinho brasileiro')).toBeInTheDocument();
    expect(screen.getByText('malandro')).toBeInTheDocument();
    expect(screen.getAllByText('courant').length).toBe(2);
    expect(screen.getByText('familier')).toBeInTheDocument();

    // Critère 3 — contexte culturel, sans interaction préalable
    expect(screen.getByText(/supposé espion russe/i)).toBeInTheDocument();
  });

  it('marque discrètement les lignes porteuses d\'une expression', async () => {
    await renderPanel(CAMARADA_SONG, 'camarada-quer-cpf');

    const avecExpression = screen.getByText('Fez estágio de malandro').closest('button');
    expect(within(avecExpression).getByLabelText(/expression à connaître/i)).toBeInTheDocument();

    const sansExpression = screen.getByText('Victor chegou no Brasil').closest('button');
    expect(within(sansExpression).queryByLabelText(/expression à connaître/i)).toBeNull();
  });
});

describe('LearnPanel — Eu Sou um Ovo (timing_data structuré + plages multi-lignes)', () => {
  it('regroupe une plage multi-lignes sous une seule traduction', async () => {
    const user = userEvent.setup();
    await renderPanel(OVO_SONG, 'eu-sou-um-ovo');

    // LRC 54-56 : « Feijão » / « Limão » / « Meu irmão » = une seule idée
    const bouton = screen.getByText('Feijão').closest('button');
    expect(within(bouton).getByText('Limão')).toBeInTheDocument();
    expect(within(bouton).getByText('Meu irmão')).toBeInTheDocument();

    await user.click(bouton);
    // Une traduction pour le groupe, pas trois
    expect(screen.getAllByText('Haricots, citron, mon frère')).toHaveLength(1);
  });

  it('rejoue la même traduction sur un motif répété sans la dupliquer dans la fiche', async () => {
    const user = userEvent.setup();
    await renderPanel(OVO_SONG, 'eu-sou-um-ovo');

    // « Cadê / Cadê / Cadê meu sentido » apparaît deux fois (LRC 11-13 puis 14-16)
    const groupes = screen.getAllByText('Cadê meu sentido').map((n) => n.closest('button'));
    expect(groupes).toHaveLength(2);

    await user.click(groupes[0]);
    await user.click(groupes[1]);
    expect(screen.getAllByText('Où, où, où est passé mon sens')).toHaveLength(2);
  });

  it('affiche ses propres expressions', async () => {
    await renderPanel(OVO_SONG, 'eu-sou-um-ovo');
    expect(screen.getByText('cadê')).toBeInTheDocument();
    expect(screen.getByText('não tem tempero')).toBeInTheDocument();
    expect(screen.getByText('vitrine')).toBeInTheDocument();
    expect(screen.getByText(/ovo de páscoa/i)).toBeInTheDocument();
  });
});

describe('LearnPanel — dégradations', () => {
  it('refuse d\'afficher des traductions décalées si les paroles ne correspondent plus', async () => {
    // Chanson resynchronisée : une ligne LRC retirée depuis la rédaction de la fiche
    const tronquee = {
      ...CAMARADA_SONG,
      lrc_content: CAMARADA_SONG.lrc_content.split('\n').slice(0, 61).join('\n'),
    };
    render(<LearnPanel song={tronquee} slug="camarada-quer-cpf" />);
    expect(await screen.findByText(/Mode Aprender indisponible/i)).toBeInTheDocument();
    expect(screen.queryByText('Victor est arrivé au Brésil')).not.toBeInTheDocument();
  });

  it('dégrade proprement quand la chanson n\'a aucune donnée de synchronisation', async () => {
    // Cas réel du repli statique content/songs.json (pas de lrc_content)
    const sansLrc = { ...CAMARADA_SONG, lrc_content: null, timing_data: null };
    render(<LearnPanel song={sansLrc} slug="camarada-quer-cpf" />);
    expect(await screen.findByText(/Mode Aprender indisponible/i)).toBeInTheDocument();
  });
});
