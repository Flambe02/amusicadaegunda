# Música da Segunda 🎵

Site web pour découvrir une nouvelle musique chaque lundi. Une dose hebdomadaire de découvertes musicales !

## 🚀 Fonctionnalités

- **Música da Semana** : Nouvelle musique chaque lundi
- **Lecteur TikTok** : Intégration native des vidéos TikTok
- **Paroles** : Affichage des paroles des chansons
- **Partage** : Partage facile sur les réseaux sociaux
- **Responsive** : Optimisé pour mobile, tablette et desktop
- **Design Moderne** : Interface élégante avec Tailwind CSS

## 🛠️ Technologies

- **Frontend** : React 18 + Vite
- **Styling** : Tailwind CSS + Radix UI
- **Routing** : React Router DOM
- **Icons** : Lucide React
- **Date** : date-fns

## 📱 Installation et Lancement

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser la production
npm run preview
```

## 🌐 Accès

- **Développement** : http://localhost:5173
- **Production** : Construit dans le dossier `dist/`

## 🎯 Structure du Projet

```
src/
├── components/          # Composants React réutilisables
│   ├── SongPlayer.jsx  # Lecteur principal de musique
│   ├── SongCard.jsx    # Carte de musique
│   ├── TikTokEmbed.jsx # Intégration TikTok
│   └── ui/             # Composants UI (Radix)
├── pages/              # Pages de l'application
│   ├── Home.jsx        # Page d'accueil
│   ├── Calendar.jsx    # Calendrier
│   └── Layout.jsx      # Layout principal
├── api/                # Client API local
└── hooks/              # Hooks React personnalisés
```

## 🔧 Configuration

Le site utilise actuellement des données mockées pour la démonstration. Pour connecter à votre propre backend :

1. Modifiez `src/api/base44Client.js`
2. Remplacez les données mockées par vos appels API
3. Adaptez la structure des données dans `entities.js`

## 📱 Responsive Design

- **Mobile** : Optimisé pour les petits écrans
- **Tablette** : Adaptation automatique
- **Desktop** : Interface complète

## 🎨 Personnalisation

- **Couleurs** : Modifiez les variables dans `tailwind.config.js`
- **Thème** : Support du mode sombre intégré
- **Animations** : Utilise Framer Motion pour les transitions

## 🚀 Déploiement

```bash
# Construire
npm run build

# Le dossier dist/ contient votre site prêt pour la production
```

## 📄 Licence

Projet personnel - Tous droits réservés

---

**Música da Segunda** - Découvrez la musique autrement ! 🎵✨