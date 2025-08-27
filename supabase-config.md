# 🔧 Configuration Supabase - Música da Segunda

## 📋 **Étapes de Configuration**

### **1. Créer un compte Supabase**
- Allez sur [https://supabase.com](https://supabase.com)
- Cliquez sur "Start your project"
- Connectez-vous avec GitHub ou créez un compte

### **2. Créer un nouveau projet**
- Cliquez sur "New Project"
- Choisissez votre organisation
- Nom du projet : `musica-da-segunda`
- Base de données : PostgreSQL (gratuit)
- Région : Europe (Paris) pour de meilleures performances

### **3. Récupérer les clés API**
- Dans votre projet, allez dans **Settings > API**
- Copiez :
  - **Project URL** → `VITE_SUPABASE_URL`
  - **anon public** → `VITE_SUPABASE_ANON_KEY`

### **4. Créer le fichier .env**
Créez un fichier `.env` à la racine du projet avec :

```bash
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon-supabase
```

### **5. Créer les tables SQL**
Dans l'éditeur SQL de Supabase, exécutez le script SQL fourni dans `database-schema.sql`

## 🎯 **Prochaines étapes**
Une fois configuré, nous pourrons :
1. Migrer vos données localStorage vers Supabase
2. Activer la synchronisation automatique
3. Implémenter la sauvegarde cloud
4. Ajouter l'authentification utilisateur
