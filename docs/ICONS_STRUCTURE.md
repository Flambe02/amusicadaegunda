# 🎨 Structure des Icônes PWA - Música da Segunda

## 📁 Organisation des Icônes

### **Structure des dossiers :**
```
public/icons/
├── ios/                          # Icônes iOS App Store
│   └── AppIcon.appiconset/      # Bundle d'icônes iOS
├── android/                      # Icônes Android
├── pwa/                         # Icônes PWA et Web
├── apple/                       # Icônes Apple Touch (carrées)
└── watchkit/                    # Icônes Apple Watch
```

## 📱 Icônes iOS (App Store)

### **Localisation :** `public/icons/ios/AppIcon.appiconset/`

#### **iPhone :**
- `Icon-App-20x20@1x.png` (20x20)
- `Icon-App-20x20@2x.png` (40x40)
- `Icon-App-20x20@3x.png` (60x60)
- `Icon-App-29x29@1x.png` (29x29)
- `Icon-App-29x29@2x.png` (58x58)
- `Icon-App-29x29@3x.png` (87x87)
- `Icon-App-40x40@1x.png` (40x40)
- `Icon-App-40x40@2x.png` (80x80)
- `Icon-App-40x40@3x.png` (120x120)
- `Icon-App-60x60@2x.png` (120x120)
- `Icon-App-60x60@3x.png` (180x180)

#### **iPad :**
- `Icon-App-76x76@1x.png` (76x76)
- `Icon-App-76x76@2x.png` (152x152)
- `Icon-App-83.5x83.5@2x.png` (167x167)

#### **App Store :**
- `ItunesArtwork@2x.png` (1024x1024)

## 🤖 Icônes Android

### **Localisation :** `public/icons/android/`

- `ic_launcher_36.png` (36x36)
- `ic_launcher_48.png` (48x48)
- `ic_launcher_72.png` (72x72)
- `ic_launcher_96.png` (96x96)
- `ic_launcher_144.png` (144x144)
- `ic_launcher_192.png` (192x192)
- `ic_launcher_512.png` (512x512)

## 🌐 Icônes PWA et Web

### **Localisation :** `public/icons/pwa/`

#### **Favicons :**
- `favicon-16x16.png` (16x16)
- `favicon-32x32.png` (32x32)
- `favicon-48x48.png` (48x48)
- `favicon-64x64.png` (64x64)
- `favicon-256x256.png` (256x256)

#### **Icônes PWA :**
- `icon-72x72.png` (72x72)
- `icon-96x96.png` (96x96)
- `icon-128x128.png` (128x128)
- `icon-144x144.png` (144x144)
- `icon-152x152.png` (152x152)
- `icon-180x180.png` (180x180)
- `icon-192x192.png` (192x192)
- `icon-256x256.png` (256x256)
- `icon-384x384.png` (384x384)
- `icon-512x512.png` (512x512)

## 🍎 Icônes Apple Touch (Carrées)

### **Localisation :** `public/icons/apple/`

- `apple-touch-icon-57x57.png` (57x57)
- `apple-touch-icon-60x60.png` (60x60)
- `apple-touch-icon-72x72.png` (72x72)
- `apple-touch-icon-76x76.png` (76x76)
- `apple-touch-icon-114x114.png` (114x114)
- `apple-touch-icon-120x120.png` (120x120)
- `apple-touch-icon-144x144.png` (144x144)
- `apple-touch-icon-152x152.png` (152x152)
- `apple-touch-icon-180x180.png` (180x180)

## 🔧 Génération des Icônes

### **Script principal :** `scripts/generate-all-icons.js`

```bash
cd scripts
npm install
npm run generate
```

### **Script icônes manquantes :** `scripts/generate-missing-icons.js`

```bash
cd scripts
node generate-missing-icons.js
```

## 📋 Caractéristiques Techniques

### **Format :** PNG avec transparence
### **Couleur de fond :** #32a2dc (bleu thème)
### **Padding :** 10% de la taille de l'icône
### **Qualité :** Optimisée pour chaque taille

## 🌐 Intégration HTML

### **Favicons :**
```html
<link rel="icon" type="image/png" sizes="16x16" href="/icons/pwa/favicon-16x16.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/pwa/favicon-32x32.png" />
<!-- ... autres tailles ... -->
```

### **Apple Touch Icons :**
```html
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple/apple-touch-icon-180x180.png" />
<link rel="apple-touch-icon-precomposed" sizes="180x180" href="/icons/apple/apple-touch-icon-180x180.png" />
<!-- ... autres tailles ... -->
```

## 📱 Manifeste PWA

### **Fichier :** `public/manifest.json`

```json
{
  "icons": [
    {
      "src": "/icons/pwa/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    }
    // ... autres icônes ...
  ]
}
```

## ✅ Avantages de cette Structure

1. **Icônes optimisées** pour chaque plateforme
2. **Taille appropriée** pour chaque contexte d'utilisation
3. **Couleur de thème cohérente** (#32a2dc)
4. **Format PNG** avec transparence
5. **Padding automatique** pour un rendu optimal
6. **Structure organisée** et maintenable

## 🚀 Utilisation

### **Développement :**
- Les icônes sont automatiquement servies depuis `/public/icons/`
- Structure cohérente avec les standards PWA

### **Production :**
- Build automatique avec Vite
- Copie vers `docs/` pour GitHub Pages
- Optimisation automatique des assets

## 🔄 Mise à Jour

Pour régénérer toutes les icônes :

1. Modifier le logo source dans `public/images/IOS Logo.png`
2. Exécuter `npm run generate` dans `scripts/`
3. Vérifier que toutes les icônes sont générées
4. Tester sur différents appareils

---

**Dernière mise à jour :** 30 Août 2025  
**Généré par :** Script Node.js avec Sharp  
**Source :** `public/images/IOS Logo.png`
