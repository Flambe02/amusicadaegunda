# Rapport de la nuit du 2026-09-26 — refonte mobile (`feat/mobile-redesign`)

Travail en autonomie, sur `feat/mobile-redesign` uniquement. Chaque étape est passée par la même porte : suite complète en une seule commande, lint, `npx vite build`, puis commit séparé, push et CI GitHub. Aucun interdit n'a été touché : pas de `main` ni de `feat/homepage-desktop` modifiés, pas de merge, pas de force-push, pas de `stash`, pas de `--no-verify`, pas de branche supprimée, ni Supabase, ni `.env`, ni `android/`, ni moteur LRC.

Les décisions prises à ta place sont dans [DECISIONS-NUIT.md](DECISIONS-NUIT.md) (§1 à §10).

---

## 1. Ce qui est fait

| # | Travail | Commit(s) | CI GitHub |
|---|---|---|---|
| 1 | Correctif CI : polyfills de capture de pointeur et vrais gestes tactiles dans les tests (0 erreur non gérée) | `f04f917b` | #340 verte |
| 2 | Catálogo : la barre du feed, manipulable (un seul composant `Scrubber.jsx`) ; titre sur sa propre ligne, puis barre, puis pause et Outra | `b0766759` | #341 verte |
| 3 | Menu final (Catálogo → `/musica` avec son sous-titre, Festa na TV, Sobre o projeto, plateformes ; sans Newsletter ; formulaire Buttondown inchangé) | déjà fait avant la nuit : `e00c6ef3`, `7080de9f`, `d2605555` | vertes |
| 4 | Portrait seulement (patch Android dans `native-patches/`, manifeste PWA, écran « Gire o celular ») | déjà fait : `676a9968`, `426b40ce` | vertes |
| 5 | Chanson sans Short : chanson complète + scène de la Caipivara | déjà fait : `27f38ccb` | verte (#340 et suivantes) |
| 6 | Étape 5 : ligne de karaokê synchronisée sur le feed | `da67b599` + mode de vérification `2a024e87` | #342 verte ; `2a024e87` : voir §5 |
| 7 | Étape 7 : lecteur karaokê mobile dans l'esprit d'O Palco, barre du bas visible | `f7998526` | #343 verte |
| 8 | Étape 12 : vérification finale, et ses deux corrections | `3897db45` | #344 verte |
| 9 | TODO : restyle mobile de `/musica` (non fait, comme demandé), plus deux constats | `05acfeec` | — |

### Détail rapide

- **CI** : la cause des 3 erreurs non gérées de #339 est corrigée côté tests uniquement. En local, la suite « en une commande » se figeait sur OneDrive. Elle tourne maintenant en une commande avec les fichiers l'un après l'autre : 73 fichiers, 1052 tests, 0 erreur non gérée. Voir DECISIONS §1.
- **Catálogo** (page et calque Ouvir) : on peut glisser pour avancer ou reculer. Le trait s'épaissit pendant le geste, le temps s'affiche (« 1:25 / 2:43 »), la zone tactile fait 24 px, le curseur est lu par les lecteurs d'écran, et les flèches font ±5 s. Titre sur 2 lignes au plus, puis ellipse. Tout tient sans défilement à 375 × 667 avec les barres de Safari (vérifié dans WebKit à 4 tailles). Un test vérifie que la barre déplace la lecture.
- **Étape 5** : la ligne s'affiche au-dessus du titre compact, avec le son actif seulement. Balayage jaune, seul jaune de la vidéo ; ligne entièrement jaune en mouvement réduit. Le timing est lu comme le lecteur karaokê, en lecture seule. **Règle appliquée : pas de ligne là où la synchro n'est pas vérifiable** (DECISIONS §2) :
  - chanson sans Short → ligne affichée (même vidéo et même timing que le lecteur karaokê) ; aujourd'hui une seule chanson : **O Croissant** ;
  - **26 Shorts → ligne masquée** jusqu'à ton test (liste au §4).
- **Étape 7** : seulement pour le lecteur ouvert depuis O Palco (desktop, TV et Modo Aprender inchangés, testés) :
  - le lecteur s'arrête au-dessus de la barre du bas, onglet Karaokê actif ; Buscar et Menu s'ouvrent par-dessus ;
  - écran « Começar » : carte 9:16 de la miniature du Short et titre blanc ; Começar est le seul jaune ;
  - fond : la miniature du Short, floue et sombre ;
  - lignes : chantées à 30 %, suivante à 72 % ;
  - barre de contrôle : « Linha anterior », pause (seul jaune), « Aprender » seulement pour une chanson avec fiche.
  - Aucun défilement à 360 × 640, 375 × 667 et 390 × 844 avec les barres de Safari.

---

## 2. Vérification finale (étape 12)

| Contrôle | Résultat |
|---|---|
| Parité desktop contre `feat/homepage-desktop` (captures pixel à pixel, 1440 × 900 et 820 × 1180 : `/`, `/karaoke`, `/musica`, page chanson, `/festa`, `/sobre`, `/apprendre`) | **Identique**. Seul écart : le compte à rebours « Próxima estreia » (une minute d'écart entre les deux captures). `/catalogo` redirige vers `/musica` sur desktop, comme décidé (addendum G.2). |
| Parité TV contre `main` (builds de production, 960 × 540 @2×, accueil, navigation, ouverture d'une chanson, écran karaokê) | **Identique**. Les seuls écarts viennent du carrousel du héros, qui tourne tout seul. |
| Un seul lecteur YouTube | **1 iframe au plus** sur le feed, après un glissement, dans le calque Ouvir, le Catálogo, Buscar, Menu et le lecteur karaokê ; 0 sur O Palco. |
| Accessibilité (axe WCAG 2.1 A/AA, 375 × 667, 9 écrans) | **0 violation** après correction de la seule trouvée : le curseur de progression du lecteur karaokê n'avait pas de valeur (`3897db45`). Aucun défilement horizontal ; cibles ≥ 44 px (la barre de 24 px de haut est pleine largeur, comme décidé). |
| Mouvement réduit | Aucune animation décorative ne tourne : feed, Catálogo, O Palco, lecteur. Les vidéos de la Caipivara laissent place au poster. |
| `/impeccable audit` (détecteur) | **0 anti-pattern.** Des avertissements de couleurs et de tailles hors palette, surtout dans du code antérieur à la refonte (`MobileRoletaApp`, `karaoke.css` historique). |
| Moteur LRC, timing, outil de synchro, dossier `supabase/` | **Inchangés** par rapport à `main`. |
| Nombres de chansons écrits en dur | Aucun. |
| O Palco sous le lecteur | Ses animations tournaient sous le lecteur ouvert ; elles sont maintenant en pause (`3897db45`). |
| **Lighthouse mobile ≥ `main`** | **Non tenu en performance** : accueil ≈ 39 contre 49, `/karaoke` ≈ 51 contre 58 (médianes locales). L'accessibilité est meilleure (100 contre 99) et le SEO égal (100). L'écart vient surtout du feed vidéo, qui est le choix produit. **CLS de 0,32 sur l'accueil** dans la plupart des mesures : non reproduit hors Lighthouse, une tentative sans effet a été annulée. Voir TODO §14 et DECISIONS §9. |

Note de dev : pendant les contrôles, l'interface TV plantait sur le serveur de dev de la nuit, à cause d'un cache Vite périmé (deux copies de React). Les builds de production de HEAD n'avaient aucune erreur. Les serveurs de dev ont été relancés avec un cache neuf, et la TV fonctionne aussi en dev.

---

## 3. Sauté ou non fait, et pourquoi

- **`/review-animations`** : cette commande ne peut être lancée que par toi (elle est bloquée pour moi). À lancer : `/review-animations`.
- **Critère Lighthouse** : non tenu (voir §2). Je n'ai rien changé en profondeur, car ce serait une décision produit (la vidéo en lecture automatique) ou une modification du HTML statique de l'accueil (SEO). Pistes dans TODO §14.
- **Restyle mobile de `/musica`** : noté dans TODO §12, non fait, comme demandé.
- Aucune étape sautée à cause d'un interdit.

---

## 4. Tes tests sur iPhone, dans l'ordre

Serveur : https://192.168.0.163:5443/ (relancé cette nuit). Si la bannière « Instalar no iPhone » apparaît en bas, ferme-la d'abord : elle recouvre les contrôles (constat noté, TODO §13).

1. **Catálogo** (pastille Caipivara) : tape sur la Caipivara.
   - Le titre est seul sur sa ligne (deux lignes au plus), puis la barre, puis pause et Outra.
   - **Glisse la barre** vers l'avant puis vers l'arrière : le temps s'affiche et la musique suit.
   - Pause, puis Outra.
   - Rien ne défile, barres de Safari affichées.
2. **Calque Ouvir** : sur le feed, icône Ouvir. Mêmes vérifications qu'au point 1.
3. **Ligne de karaokê, chanson complète** : https://192.168.0.163:5443/?musica=o-croissant, puis tap pour le son.
   - La ligne est-elle synchronisée ?
   - Le jaune balaye-t-il à la bonne vitesse ?
   - Coupe le son avec le haut-parleur : la ligne disparaît.
4. **Synchro des Shorts, chanson par chanson** : ouvre https://192.168.0.163:5443/?musica=SLUG&verificar-karaoke=1 (ce mode n'existe qu'en dev, pas en production). Glisse ensuite de semaine en semaine : le mode reste actif pendant la session.
   - Dis-moi quels Shorts sont synchronisés : je les ajouterai à `FEED_KARAOKE_SHORT_VERIFIED_SLUGS`.
   - Les 26 Shorts, du plus récent au plus ancien :

   | # | Slug |
   |---|---|
   | 1 | `ta-chovendo-de-novo` |
   | 2 | `europa-deu-vacuo-no-boi` |
   | 3 | `combo-master` |
   | 4 | `facebook-166-bilhoes` |
   | 5 | `eu-nao-sou-bolo-de-cimento` |
   | 6 | `invasao-na-libertadores` |
   | 7 | `tem-filho-na-urna-dia-dos-pais-2026` |
   | 8 | `churrasco-no-trilho` |
   | 9 | `as-patroas-do-paredao` |
   | 10 | `camarada-quer-cpf` |
   | 11 | `independencia-ou-gol` |
   | 12 | `messi-e-o-melhor-yo-no-falei` |
   | 13 | `jogador-home-office` |
   | 14 | `doze-no-bolo-trinta-e-sete-no-papel` |
   | 15 | `como-e-grande-meu-amor-pelo-zelle` |
   | 16 | `terrorista-e-o-caramba` |
   | 17 | `gelo-gelo` |
   | 18 | `dark-horse-do-brasil` |
   | 19 | `ype-ype` |
   | 20 | `6x1` |
   | 21 | `bbb26-ana-paula-renault` |
   | 22 | `datafolha-quaest` |
   | 23 | `artemis-2` |
   | 24 | `eu-sou-um-ovo` |
   | 25 | `po-ancelotti-e-eu` |
   | 26 | `sinfonia-do-vorcaro` |

5. **Karaokê** (onglet) : O Palco, puis le micro.
   - Écran « Começar » : la miniature du Short, le titre blanc, un seul jaune (Começar). La barre du bas reste visible, onglet Karaokê actif, et rien ne défile.
   - Tape Começar :
     - lignes chantées pâles (30 %), ligne suivante plus claire (72 %) ;
     - « Linha anterior » revient d'une ligne ;
     - la pause est le seul jaune ;
     - pas de bouton Aprender sur cette chanson.
   - Ouvre Buscar puis Menu pendant la lecture : ils passent par-dessus le lecteur.
   - Voltar (en haut à gauche) ferme le lecteur.
6. **Aprender dans le lecteur** : dans O Palco, fais défiler jusqu'à « Camarada Quer CPF », puis micro et Começar. Le bouton « Aprender » apparaît et ouvre la leçon.
7. **Mouvement réduit** (Réglages, Accessibilité, Mouvement, Réduire les animations) :
   - feed : la ligne de karaokê est entièrement jaune, sans balayage ;
   - O Palco : aucune animation ;
   - lecteur : pas de pulsation sur Começar.
8. **Rien de cassé ailleurs** : glissements de semaine, son, Compartilhar, Letra, História, Menu, « Gire o celular » en paysage.

---

## 5. À savoir

- La CI GitHub de chaque commit poussé est vérifiée avant de passer au suivant. Pour le dernier push (ce rapport et `2a024e87`), voir le run qui suit #344.
- Branche poussée : `origin/feat/mobile-redesign`. Rien n'est mergé.
