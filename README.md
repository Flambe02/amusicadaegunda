# Música da Segunda

> Projet de découverte musicale hebdomadaire - Nova música toda segunda-feira

<!-- Force deploy - GitHub Pages reset -->

## 🎵 À propos

Música da Segunda est une application web qui présente une nouvelle musique chaque lundi, avec intégration TikTok, calendrier musical et interface moderne.

## ✨ **Funcionalidades**

- 🎵 **Música da Semana**: Nova música toda segunda-feira
- 📱 **Integração TikTok**: Vídeos integrados diretamente
- 📅 **Calendário Musical**: Visualize todas as músicas lançadas
- 🎨 **Interface Admin**: Gerencie conteúdo facilmente
- 📱 **Design Responsivo**: Funciona em todos os dispositivos
- 🌐 **100% Local**: Sem dependências externas

## 🚀 **Tecnologias**

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS + Radix UI
- **Storage**: LocalStorage + JSON (100% local)
- **Icons**: Lucide React
- **Routing**: React Router DOM

## 📦 **Instalação**

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Passos
```bash
# 1. Clone o repositório
git clone [URL_DO_REPOSITORIO]
cd MusicaDa2nda

# 2. Instale as dependências
npm install

# 3. Execute o projeto
npm run dev

# 4. Acesse no navegador
# http://localhost:5173
```

## 🎯 **Como Usar**

### **Site Público**
- **Homepage**: `/` - Música atual da semana
- **Calendário**: `/Calendar` - Todas as músicas lançadas
- **Sobre**: `/Sobre` - Informações do projeto

### **Interface Admin**
- **URL**: `/Admin`
- **Funcionalidades**:
  - ✅ Criar/editar/deletar músicas
  - ✅ Gerenciar status (rascunho, agendado, publicado)
  - ✅ Adicionar links TikTok, Spotify, Apple Music, YouTube
  - ✅ Inserir letras e descrições
  - ✅ Sistema de hashtags
  - ✅ Exportar/importar dados
  - ✅ Busca e filtros

## 🗂️ **Estrutura do Projeto**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── SongPlayer.jsx  # Player principal de música
│   ├── CountdownTimer.jsx # Contador para próxima música
│   ├── TikTokEmbed.jsx # Integração TikTok
│   └── ui/             # Componentes UI (Radix)
├── pages/              # Páginas da aplicação
│   ├── Home.jsx        # Página inicial
│   ├── Admin.jsx       # Interface administrativa
│   ├── Calendar.jsx    # Calendário musical
│   └── Sobre.jsx       # Página sobre
├── lib/                # Utilitários e configurações
│   ├── localStorage.js # Sistema de storage local
│   ├── supabase.js     # Configuration Supabase
│   └── migrationService.js # Service de migration
├── api/                # Serviços de données
│   ├── entities.js     # Entités avec fallback automatique
│   └── supabaseService.js # Service Supabase complet
└── hooks/              # Hooks personalizados
```

## 💾 **Sistema de Storage Hybride (Local + Cloud)**

### **🆕 NOUVEAU : Supabase Cloud Database**
- ✅ **Sauvegarde automatique** - Données synchronisées en temps réel
- ✅ **Base de données PostgreSQL** - Robuste et scalable
- ✅ **Sauvegarde cloud** - Vos données sont protégées
- ✅ **Synchronisation multi-appareils** - Accès depuis partout
- ✅ **API REST automatique** - Intégration facile

### **📱 Fallback localStorage**
- ✅ **Zero configuration** - Fonctionne immédiatement
- ✅ **100% local** - Sans serveurs externes
- ✅ **Portable** - Données dans le navigateur
- ✅ **Backup facile** - Export/import JSON
- ✅ **Sans limites** - Stockage local illimité

### **🔄 Migration Automatique**
- ✅ **Détection automatique** du mode de stockage
- ✅ **Migration en un clic** localStorage → Supabase
- ✅ **Fallback automatique** en cas de problème
- ✅ **Synchronisation bidirectionnelle** des données
- ✅ **Vérification d'intégrité** des données migrées

### **Comment ça fonctionne**
1. **Mode Supabase** : Données sauvegardées dans la base cloud
2. **Mode localStorage** : Données stockées localement (fallback)
3. **Migration** : Transfert automatique des données existantes
4. **Synchronisation** : Maintien des deux sources à jour

## 🎨 **Personalização**

### **Cores e Tema**
- Edite `tailwind.config.js` para personalizar cores
- Modifique `src/index.css` para estilos globais

### **Conteúdo**
- Interface admin para gerenciar músicas
- Edite dados diretamente no código se preferir
- Sistema de templates para novas músicas

## 📱 **Responsividade**

- **Mobile First** design
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Componentes adaptativos** para todos os tamanhos
- **Touch-friendly** para dispositivos móveis

## 🚀 **Deploy**

### **Build para Produção**
```bash
npm run build
```

### **Servir Build**
```bash
npm run preview
```

### **Deploy Estático**
- Netlify, Vercel, GitHub Pages
- Qualquer servidor web estático
- **Backend cloud Supabase** (optionnel)

## ☁️ **Configuration Supabase (Optionnel)**

### **1. Créer un projet Supabase**
- Allez sur [https://supabase.com](https://supabase.com)
- Créez un nouveau projet gratuit
- Choisissez la région Europe (Paris)

### **2. Configurer les variables d'environnement**
```bash
# Copiez env-example.txt vers .env
cp env-example.txt .env

# Remplissez vos vraies clés Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon-supabase
```

### **3. Créer la base de données**
- Dans l'éditeur SQL de Supabase
- Exécutez le script `database-schema.sql`
- Vos tables seront créées automatiquement

### **4. Migrer vos données**
- Allez sur `/Admin` dans votre app
- Cliquez sur "Migrar para Supabase"
- Vos données localStorage seront transférées

## 🔧 **Desenvolvimento**

### **Scripts Disponíveis**
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Verificar código
```

## 📱 **Mobile Development (Capacitor)**

### **Pré-requisitos Mobile**
- Android Studio (pour Android)
- Xcode (pour iOS - macOS uniquement)
- Node.js 18+ et npm

### **Scripts Capacitor**
```bash
# Initialisation et configuration
npm run cap:init     # Initialiser Capacitor
npm run cap:add:android  # Ajouter la plateforme Android
npm run cap:add:ios      # Ajouter la plateforme iOS

# Synchronisation et build
npm run cap:sync     # Synchroniser le code web avec les plateformes
npm run cap:copy     # Copier les assets web
npm run cap:open:android  # Ouvrir dans Android Studio
npm run cap:open:ios      # Ouvrir dans Xcode

# Génération d'icônes
npm run icons:android     # Générer les icônes Android
npm run icons:ios         # Générer les icônes iOS

# CI/CD
npm run ci:android        # Build complet pour CI (Android)
```

### **Workflow de développement mobile**
```bash
# 1. Build de l'app web
npm run build

# 2. Synchroniser avec Capacitor
npm run cap:sync

# 3. Ouvrir dans l'IDE natif
npm run cap:open:android  # ou npm run cap:open:ios
```

### **Configuration Appflow (CI/CD)**
- `capacitor.config.json` : Configuration Capacitor
- `appflow.config.json` : Configuration Ionic Appflow
- Les plateformes `android/` et `ios/` sont générées localement
- **Important** : Ne pas committer les dossiers `android/` et `ios/` (ajoutés au .gitignore)

### **Rollback Capacitor**
Si vous devez retirer Capacitor :
```bash
# Supprimer les dépendances
npm uninstall @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios cordova-res

# Supprimer les fichiers de config
rm capacitor.config.json appflow.config.json

# Supprimer les plateformes
rm -rf android/ ios/
```

### **Estrutura de Dados**
```javascript
// Exemplo de música
{
  id: 1,
  title: "Confissões Bancárias",
  artist: "A Música da Segunda",
  description: "Uma música sobre confissões bancárias",
  lyrics: "Letra da música...",
  release_date: "2025-08-25",
  status: "published", // draft, scheduled, published, archived
  tiktok_video_id: "7540762684149517590",
  tiktok_url: "https://www.tiktok.com/@...",
  spotify_url: "https://open.spotify.com/...",
  apple_music_url: "https://music.apple.com/...",
  youtube_url: "https://youtube.com/...",
  cover_image: "url_da_imagem",
  hashtags: ["humor", "musica", "trending"],
  created_at: "2025-01-27T10:00:00.000Z",
  updated_at: "2025-01-27T10:00:00.000Z"
}
```

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 **Suporte**

- **Issues**: Abra uma issue no GitHub
- **Documentação**: Consulte este README
- **Admin**: Use a interface `/Admin` para gerenciar conteúdo

## 🎉 **Status do Projeto**

- ✅ **Site público** funcionando
- ✅ **Interface admin** completa
- ✅ **Sistema de storage hybride** (local + cloud)
- ✅ **Base de données Supabase** configurée
- ✅ **Migration automatique** localStorage → Supabase
- ✅ **Sauvegarde cloud** avec fallback local
- ✅ **Integração TikTok** ativa
- ✅ **Design responsivo** implementado
- ✅ **Calendário musical** funcional
- ✅ **Synchronisation temps réel** (avec Supabase)

---

**🎵 Música da Segunda - Descubra música nova toda segunda-feira! 🎵**