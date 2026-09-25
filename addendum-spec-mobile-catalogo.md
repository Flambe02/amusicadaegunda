# Addendum — Spec mobile : navigation à 4 onglets, page Catálogo, Menu simplifié

Complète `spec-mobile-redesign.md`. En cas de conflit, cet addendum prévaut sur les sections 4.4, 4.5, 4.6 et sur les étapes 8, 9 et 10.
Référence visuelle : artboard « Catálogo » du canvas « A Música da Segunda — Mobile Caipivara ».
Les étapes 4b à 7 de la spec restent inchangées.

---

## A. Barre de navigation : 4 onglets

- Ordre : **Início**, **Catálogo**, **Karaokê**, **Menu**.
- Pesquisa et Roda disparaissent comme onglets : leurs fonctions sont regroupées dans Catálogo.
- Icônes : Início (maison), Catálogo (grille de 4 carrés), Karaokê (icône paroles actuelle), Menu (trois traits, à la place du « i »).
- Le bouton « i » du header de l'Início est supprimé (doublon du Menu). Le header garde la Caipivara (logo fixe), le nom et le chip de la semaine.
- Les routes existantes de Pesquisa et Roda redirigent vers `/catalogo` (pas de lien mort). `/musica` reste accessible et indexable.
- Mettre à jour la section navigation de `DESIGN.md` et les tests de `Layout`.

## B. Page Catálogo (`/catalogo`) — la scène de la Caipivara

**Principe :** un écran plein, comme une scène. La Caipivara est la seule chose qui bouge. Aucune liste sur l'écran principal.

**Composition (du haut vers le bas) :**
- Fond Stage Black, un seul halo jaune doux derrière la Caipivara, une ombre au sol sous elle.
- La Caipivara en pied, grande et centrée (≈ 250 px de large sur 390 px d'écran), jouant la boucle `caipivara-idle` en continu.
- Sous elle, une seule ligne façon sous-titre (≈ 20 px, 800) : « Toque em mim e eu escolho uma música pra você. »
- En bas, au-dessus de la nav : une barre de recherche en verre (≈ 50 px de haut, pleine largeur moins 16 px de marge) : icône loupe + « Buscar música, tema ou mês ».
- `h1` visuellement masqué : « Catálogo de músicas ».

**Tap sur la Caipivara (toute sa surface est un bouton, avec `aria-label`) :**
1. Une animation est tirée au hasard parmi les trois, jamais deux fois la même à la suite :
   - `caipivara-hat` — fouille dans le chapeau, en sort une note. Ligne : « Deixa eu procurar no chapéu… »
   - `caipivara-flip` — salto arrière. Ligne : « Segura essa! »
   - `caipivara-samba` — pirouette et pas de samba. Ligne : « Rodando a roda… »
2. La vidéo d'animation joue une fois par-dessus la boucle de repos (fondu enchaîné court), puis on revient à la boucle de repos.
3. À la fin, la ligne devient « Que tal “Titre” ? » avec deux pastilles : **Ouvir** (jaune, seul jaune de l'écran) qui ouvre la musique dans le feed Início, et **Outra** (contour) qui relance un tirage.
4. Tirage au hasard parmi toutes les musiques publiées, sans reproposer la musique qui vient d'être proposée.
5. Taps répétés pendant une animation : ignorés.

**Recherche (tap sur la barre du bas) :** un panneau monte du bas (≈ 94 % de la hauteur), fond #111217, coins 26 px, poignée en haut.
- En tête : champ de recherche (titre, manchete, paroles) + « Cancelar » à droite, façon iOS. Le clavier s'ouvre directement.
- « Por mês · année » : pastilles des seuls mois qui ont des musiques ; le mois le plus récent sélectionné par défaut (pastille blanche pleine).
- « Por tema » : pastilles des catégories réelles.
- Grille 3 colonnes de miniatures 9:16 (miniature du Short, titre en bas sur un dégradé), filtrée par le mois ou le thème choisi, ou par la recherche.
- Recherche sans résultat : phrase courte + musiques récentes en dessous. Jamais de grille vide seule.
- Fermeture : Cancelar, glissement vers le bas, Escape.
- Le lien « Ver todas as músicas » vers `/musica` apparaît en bas de la grille.

**Mouvement réduit (`prefers-reduced-motion`) :** Caipivara en image fixe (pas de boucle, pas d'animation au tap : le résultat s'affiche directement), panneau sans glissement.

**Données :** aucun nombre en dur. Si Supabase est indisponible, `content/songs.json` suffit pour la scène et la grille.

## C. Assets Caipivara à ajouter

Fichiers fournis par Florent, à placer puis à traiter comme à l'étape 1 (sans audio, MP4 + WebM, poster WebP, < 1 Mo chacun, originaux dans `design/caipivara/source/`) :
- `caipivara-hat`, `caipivara-flip`, `caipivara-samba`.
- Chaque clip doit commencer et finir dans la pose de repos. Si le début ou la fin ne raccorde pas avec la boucle `caipivara-idle`, couper le clip au plus près de la pose de repos plutôt que de laisser un saut visible.
- Les bords des vidéos se fondent dans le fond de la page (masque radial), pour qu'aucun rectangle ne soit visible.
- Chargement : la boucle de repos au chargement de la page ; les trois animations en `preload="metadata"`, puis chargées au premier tap ou quand le navigateur est inactif.

## D. Menu simplifié

- En tête : avatar Caipivara, « A Música da Segunda », « Nova música toda segunda-feira ».
- Lignes : Festa na TV, Aprender português, Sobre o projeto, Newsletter (Buttondown `amusicadasegunda`).
- Plus de lignes Roda, Pesquisa, Blog ou « Todas as músicas » (désormais dans Catálogo). Le Blog reste accessible par son URL et depuis Sobre.
- Plateformes d'écoute en pastilles neutres (pas de couleur de marque hors de leur propre lien).
- Aucun témoignage, chiffre d'audience ou presse.

---

## E. Nouvelles étapes (remplacent les étapes 8, 9 et 10)

**Étape 8 — Navigation à 4 onglets.** Section A. Redirections Pesquisa et Roda. Suppression du bouton « i » de l'Início.

**Étape 9 — Catálogo, la scène.** Section B hors recherche, avec les assets de la section C.

**Étape 10 — Catálogo, la recherche.** Panneau de recherche de la section B.

**Étape 11 — Menu simplifié.** Section D.

**Étape 12 — Vérification finale.** (ancienne étape 11, inchangée)

## F. Critères d'acceptation ajoutés

- [ ] La nav mobile a exactement 4 onglets, dans l'ordre Início, Catálogo, Karaokê, Menu.
- [ ] Les anciennes routes de Pesquisa et Roda mènent à `/catalogo`, sans erreur.
- [ ] Sur Catálogo, seule la Caipivara bouge ; aucune liste n'est visible avant l'ouverture de la recherche.
- [ ] Chaque tap joue une des trois animations, jamais deux fois la même à la suite, et propose une musique différente de la précédente.
- [ ] Aucun rectangle de vidéo n'est visible autour de la Caipivara.
- [ ] Un seul élément jaune à l'écran à tout moment.
- [ ] La recherche s'ouvre en un tap depuis le bas de l'écran, avec le clavier ouvert.
- [ ] Les mois proposés sont uniquement ceux qui ont des musiques.
- [ ] Aucune grille vide, aucun nombre en dur.
- [ ] Avec `prefers-reduced-motion`, aucune animation ne joue et le résultat s'affiche directement.
- [ ] Desktop identique à `feat/homepage-desktop`, TV identique à `main`.
