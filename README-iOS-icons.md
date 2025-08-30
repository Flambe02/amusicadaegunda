# Modification du Logo iOS - Música da Segunda

## Objectif
Modifier le logo de l'application pour qu'il remplisse totalement l'espace carré sur iOS, en désactivant l'arrondi automatique.

## Modifications effectuées

### 1. Fichiers HTML mis à jour
- `public/index.html` : Ajout des balises `apple-touch-icon-precomposed`
- `docs/index.html` : Ajout des balises `apple-touch-icon-precomposed`

### 2. Nouveau logo carré
- `public/images/logo-square.svg` : Version SVG du logo qui remplit totalement l'espace carré
- Design avec fond dégradé bleu et notes musicales blanches
- Aucun arrondi - forme parfaitement carrée

### 3. Outils de génération
- `scripts/create-square-logo.html` : Générateur d'icônes PNG dans le navigateur
- `scripts/generate-ios-icons.js` : Script Node.js pour créer des icônes (placeholder)

## Comment utiliser

### Option 1 : Générateur HTML (Recommandé)
1. Ouvrir `scripts/create-square-logo.html` dans un navigateur
2. Cliquer sur "Générer les icônes"
3. Télécharger chaque taille d'icône
4. Remplacer les fichiers dans `public/images/`

### Option 2 : Conversion SVG manuelle
1. Utiliser un outil comme Inkscape, GIMP ou Photoshop
2. Ouvrir `public/images/logo-square.svg`
3. Exporter en PNG aux tailles suivantes :
   - 57x57, 60x60, 72x72, 76x76
   - 114x114, 120x120, 144x144, 152x152, 180x180

## Tailles d'icônes iOS requises
```html
<link rel="apple-touch-icon-precomposed" sizes="57x57" href="/images/icon-57x57.png" />
<link rel="apple-touch-icon-precomposed" sizes="60x60" href="/images/icon-60x60.png" />
<link rel="apple-touch-icon-precomposed" sizes="72x72" href="/images/icon-72x72.png" />
<link rel="apple-touch-icon-precomposed" sizes="76x76" href="/images/icon-76x76.png" />
<link rel="apple-touch-icon-precomposed" sizes="114x114" href="/images/icon-114x114.png" />
<link rel="apple-touch-icon-precomposed" sizes="120x120" href="/images/icon-120x120.png" />
<link rel="apple-touch-icon-precomposed" sizes="144x144" href="/images/icon-144x144.png" />
<link rel="apple-touch-icon-precomposed" sizes="152x152" href="/images/icon-152x152.png" />
<link rel="apple-touch-icon-precomposed" sizes="180x180" href="/images/icon-180x180.png" />
```

## Pourquoi `apple-touch-icon-precomposed` ?

- **`apple-touch-icon`** : iOS applique automatiquement un arrondi et des effets
- **`apple-touch-icon-precomposed`** : Désactive l'arrondi automatique, affichage carré pur
- Permet un contrôle total sur l'apparence de l'icône

## Déploiement

Après avoir généré les nouvelles icônes :

1. Remplacer les fichiers dans `public/images/`
2. Mettre à jour les références dans `public/index.html` et `docs/index.html`
3. Reconstruire et déployer :
   ```bash
   npm run build
   # Copier dist/ vers docs/
   git add .
   git commit -m "Update iOS icons to square format"
   git push
   ```

## Résultat attendu

Sur iOS, l'icône de l'application apparaîtra maintenant :
- ✅ Forme parfaitement carrée
- ✅ Remplit totalement l'espace disponible
- ✅ Aucun arrondi automatique
- ✅ Design musical conservé avec fond dégradé bleu

## Notes techniques

- Le logo utilise un dégradé bleu (#32a2dc → #1e40af) pour la cohérence avec le thème
- Les notes musicales sont en blanc avec différentes opacités pour la profondeur
- Éléments décoratifs dans les coins pour un design équilibré
- Format SVG pour une qualité optimale à toutes les tailles
