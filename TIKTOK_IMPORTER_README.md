# 🚀 Importateur Automatique TikTok - Música da Segunda

## 📋 Vue d'ensemble

L'importateur automatique TikTok permet de récupérer et importer automatiquement toutes les vidéos du compte @amusicadasegunda dans votre base de données locale, en évitant les doublons.

## ✨ Fonctionnalités

- 🔍 **Détection automatique** des vidéos déjà importées
- 📱 **Import en lot** de toutes les nouvelles vidéos TikTok
- 📊 **Statistiques en temps réel** de l'importation
- 🎯 **Génération automatique** des métadonnées de base
- 📅 **Définition automatique** de la prochaine date de lundi
- 🚫 **Prévention des doublons** basée sur l'ID TikTok

## 🛠️ Installation et Configuration

### 1. Fichiers créés

- `src/utils/tiktokImporter.js` - Logique d'importation
- `src/components/TikTokImporter.jsx` - Interface utilisateur
- `src/utils/testImporter.js` - Scripts de test

### 2. Intégration dans Admin

Le composant est automatiquement intégré dans la page Admin, juste après la barre de recherche.

## 📱 Comment utiliser

### Interface Graphique (Recommandé)

1. **Accédez à la page Admin** de votre application
2. **Localisez la section "Importação Automática TikTok"**
3. **Cliquez sur "Importar Todas as Vídeos"**
4. **Attendez la confirmation** de l'importation
5. **Vérifiez les résultats** affichés

### Console JavaScript (Développement)

```javascript
// Vérifier les statistiques
await window.testTikTokImporter.testStats();

// Importer toutes les vidéos
await window.testTikTokImporter.testImport();

// Test complet
await window.testTikTokImporter.runTests();
```

## 🔧 Configuration des Vidéos

### Ajouter de Nouvelles Vidéos

Pour ajouter de nouvelles vidéos TikTok, modifiez le fichier `src/utils/tiktokImporter.js` :

```javascript
const knownVideos = [
  'https://www.tiktok.com/@amusicadasegunda/video/7540762684149517590',
  'https://www.tiktok.com/@amusicadasegunda/video/7539613899209903382',
  // Ajoutez ici vos nouvelles URLs TikTok
  'https://www.tiktok.com/@amusicadasegunda/video/NEW_VIDEO_ID',
];
```

### Format des URLs

Les URLs doivent suivre ce format :
```
https://www.tiktok.com/@amusicadasegunda/video/VIDEO_ID
```

## 📊 Métadonnées Générées

Chaque vidéo importée reçoit automatiquement :

- **Titre** : `Música da Segunda - [DATE]`
- **Artiste** : `A Música da Segunda`
- **Description** : Description générique
- **Date de sortie** : Prochaine date de lundi
- **Status** : `draft` (modifiable manuellement)
- **Hashtags** : Tags par défaut
- **Date de publication TikTok** : Date actuelle

## 🚨 Limitations et Notes

### Limitations Techniques

- **Pas d'API TikTok officielle** : TikTok n'offre pas d'API publique
- **Import manuel des URLs** : Vous devez ajouter manuellement les nouvelles URLs
- **Métadonnées simulées** : Les descriptions et titres sont générés automatiquement

### Solutions Alternatives

Pour une importation plus avancée, considérez :

1. **Services tiers** : RapidAPI, ScrapingBee, etc.
2. **Webhooks** : Intégration avec des services d'automatisation
3. **API non officielles** : Solutions communautaires (utilisation à vos risques)

## 🧪 Tests et Débogage

### Vérifier le Fonctionnement

1. **Ouvrez la console du navigateur** (F12)
2. **Accédez à la page Admin**
3. **Vérifiez les logs** de l'importateur
4. **Testez les fonctions** via la console

### Logs de Débogage

L'importateur génère des logs détaillés :

```
📱 2 vidéos déjà importées
🚀 Début de l'importation automatique...
⚠️ Vidéo 7540762684149517590 déjà importée, ignorée
✅ Vidéo 7539613899209903382 importada com sucesso!
🎉 Importação concluída! 1 nova(s) vídeo(s) importada(s)
```

## 🔄 Mise à Jour et Maintenance

### Mise à Jour Régulière

1. **Vérifiez régulièrement** le compte TikTok @amusicadasegunda
2. **Ajoutez les nouvelles URLs** dans le fichier de configuration
3. **Testez l'importation** après chaque modification
4. **Vérifiez la cohérence** des données importées

### Sauvegarde

- **Exportez régulièrement** vos données via l'interface Admin
- **Sauvegardez** le fichier `tiktokImporter.js` modifié
- **Documentez** les nouvelles vidéos ajoutées

## 📞 Support et Dépannage

### Problèmes Courants

1. **Vidéo non importée** : Vérifiez le format de l'URL
2. **Erreur d'importation** : Vérifiez la console pour les détails
3. **Doublons** : L'importateur les évite automatiquement

### Logs d'Erreur

En cas de problème, vérifiez :

- **Console du navigateur** pour les erreurs JavaScript
- **Logs de l'importateur** pour les détails d'importation
- **Base de données locale** pour la cohérence des données

## 🎯 Prochaines Étapes

### Améliorations Futures

- [ ] **API TikTok officielle** (quand disponible)
- [ ] **Import automatique** via webhooks
- [ ] **Métadonnées enrichies** (vues, likes, commentaires)
- [ ] **Planification automatique** des publications
- [ **Intégration multi-plateforme** (Instagram, YouTube)

### Contribution

Pour contribuer à l'amélioration de l'importateur :

1. **Testez** les nouvelles fonctionnalités
2. **Signalez** les bugs et problèmes
3. **Proposez** des améliorations
4. **Partagez** vos expériences d'utilisation

---

**Version** : 1.0.0  
**Dernière mise à jour** : Janvier 2025  
**Maintenu par** : Équipe Música da Segunda
