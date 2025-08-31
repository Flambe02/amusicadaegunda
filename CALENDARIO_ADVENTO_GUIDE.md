# 🎄 GUIDE D'UTILISATION - Calendario do Advento

## 📱 **FONCTIONNALITÉ IMPLÉMENTÉE**

La chanson **"Calendário do Advento"** a été ajoutée au calendrier de l'avent avec les fonctionnalités suivantes :

### ✅ **Caractéristiques Principales**
- **Case spéciale** : Le jour 15 affiche le logo iOS au lieu du numéro
- **Vidéo TikTok** : S'ouvre en plein écran sur mobile
- **Interface optimisée** : Design adapté aux appareils mobiles
- **Intégration parfaite** : Compatible avec le système existant

---

## 🎯 **COMMENT UTILISER**

### **1. Accéder au Calendrier**
- Naviguez vers `/adventcalendar` dans votre application
- Le calendrier affiche 24 cases (1-24 décembre)

### **2. Identifier la Case Spéciale**
- **Jour 15** : Case avec le logo iOS (`/images/IOS Logo.png`)
- **Couleur** : Dégradé bleu-cyan (différent des autres cases)
- **Indicateur** : Icône cadeau animée en haut à droite

### **3. Ouvrir la Chanson**
- Cliquez sur la case du jour 15
- La chanson "Calendário do Advento" s'ouvre
- Informations complètes affichées (titre, artiste, description)

### **4. Voir la Vidéo TikTok**
- La vidéo TikTok s'affiche dans le modal
- **Bouton "Ver em Tela Cheia"** : Ouvre en plein écran
- **Mode plein écran** : Optimisé pour mobile

---

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Composant Modifié**
- **Fichier** : `src/pages/AdventCalendar.jsx`
- **Fonctionnalités ajoutées** :
  - Chanson spéciale intégrée
  - Modal plein écran TikTok
  - Gestion des jours spéciaux

### **Chanson Spéciale**
```javascript
const ADVENT_CALENDAR_SONG = {
  id: 'advent-calendar-special',
  title: 'Calendário do Advento',
  artist: 'A Música da Segunda',
  tiktok_video_id: '7540762684149517590', // ID de "Confissão Bancárias"
  // ... autres propriétés
};
```

### **Jour Spécial**
- **Jour 15** : Configuré comme jour spécial
- **Logo iOS** : Remplacé par `/images/IOS Logo.png`
- **Style** : Couleur et animation distinctes

---

## 📊 **BASE DE DONNÉES**

### **Script SQL**
- **Fichier** : `add-advent-calendar-song.sql`
- **Exécution** : Dans l'éditeur SQL de Supabase
- **Fonction** : Ajoute la chanson à la table `songs`

### **Structure de la Chanson**
```sql
INSERT INTO songs (
  title, 
  artist, 
  description, 
  lyrics, 
  release_date, 
  status, 
  tiktok_video_id, 
  tiktok_url, 
  hashtags
) VALUES (
  'Calendário do Advento',
  'A Música da Segunda',
  'Música especial do calendário do advento musical',
  'Calendário do advento...\nUma surpresa a cada dia...',
  '2025-12-01',
  'published',
  '7540762684149517590',
  'https://www.tiktok.com/@amusicadaegunda/video/7540762684149517590',
  ARRAY['advent', 'calendario', 'musica', 'dezembro', 'surpresa']
);
```

---

## 🎨 **INTERFACE UTILISATEUR**

### **Case du Jour 15**
- **Apparence** : Logo iOS centré
- **Couleur** : Dégradé bleu-cyan
- **Animation** : Icône cadeau qui rebondit
- **Interaction** : Clic pour ouvrir la chanson

### **Modal de la Chanson**
- **Header** : Numéro du jour + titre
- **Contenu** : Informations de la chanson
- **Vidéo TikTok** : Intégrée avec bouton plein écran
- **Actions** : Liens vers plateformes de streaming

### **Mode Plein Écran TikTok**
- **Fond** : Noir pour immersion maximale
- **Header** : Titre + bouton de fermeture
- **Vidéo** : TikTok en pleine taille d'écran
- **Mobile** : Optimisé pour les petits écrans

---

## 🚀 **FONCTIONNALITÉS AVANCÉES**

### **Gestion des États**
- **Jour verrouillé** : Cases grises avec cadenas
- **Jour normal** : Cases rouges avec chansons
- **Jour spécial** : Case bleue avec logo iOS
- **Jour vide** : Cases vertes sans contenu

### **Responsive Design**
- **Mobile** : Interface optimisée pour petits écrans
- **Tablet** : Adaptation automatique des tailles
- **Desktop** : Affichage standard avec grille

### **Animations et Transitions**
- **Hover** : Effet de zoom sur les cases
- **Clic** : Transition fluide vers le modal
- **Plein écran** : Animation d'ouverture/fermeture

---

## 🔍 **DÉPANNAGE**

### **Problèmes Courants**

#### **1. Logo iOS non affiché**
- **Vérifiez** : Le fichier `/images/IOS Logo.png` existe
- **Solution** : Vérifiez le chemin de l'image

#### **2. Vidéo TikTok ne s'ouvre pas**
- **Vérifiez** : L'ID TikTok est valide
- **Solution** : Testez l'ID dans l'URL TikTok

#### **3. Modal plein écran ne fonctionne pas**
- **Vérifiez** : JavaScript est activé
- **Solution** : Rechargez la page

### **Logs de Débogage**
```javascript
// Dans la console du navigateur
console.log('Chanson sélectionnée:', selectedSong);
console.log('Mode plein écran:', showFullscreenTikTok);
```

---

## 📝 **PERSONNALISATION**

### **Changer le Jour Spécial**
```javascript
// Dans AdventCalendar.jsx, ligne ~200
isSpecialDay={day === 15} // Changez 15 par le jour souhaité
```

### **Modifier la Chanson**
```javascript
// Dans AdventCalendar.jsx, modifiez ADVENT_CALENDAR_SONG
const ADVENT_CALENDAR_SONG = {
  title: 'Votre Titre',
  tiktok_video_id: 'Votre_ID_TikTok',
  // ... autres propriétés
};
```

### **Changer le Logo**
```javascript
// Dans AdventCalendar.jsx, ligne ~60
src="/images/Votre_Logo.png" // Changez le chemin
```

---

## 🎯 **PROCHAINES ÉTAPES**

### **Améliorations Suggérées**
1. **Plus de jours spéciaux** : Ajouter d'autres chansons uniques
2. **Animations avancées** : Effets visuels plus sophistiqués
3. **Sons et musique** : Audio lors de l'ouverture des cases
4. **Partage social** : Boutons de partage pour chaque chanson

### **Maintenance**
- **Vérification régulière** : Tester les liens TikTok
- **Mise à jour des métadonnées** : Ajouter des liens de streaming
- **Optimisation des performances** : Monitoring des temps de chargement

---

## 📞 **SUPPORT**

### **En Cas de Problème**
1. **Vérifiez la console** du navigateur pour les erreurs
2. **Testez sur différents appareils** pour la compatibilité
3. **Vérifiez la base de données** pour la cohérence des données

### **Contact**
- **Développeur** : Assistant IA
- **Date d'implémentation** : 30 août 2025
- **Version** : 1.0

---

**🎉 Félicitations ! Votre calendrier de l'avent musical est maintenant opérationnel avec la chanson spéciale "Calendário do Advento" !**
