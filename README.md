# 🎵 Música da Segunda

**Descubra música nova toda segunda-feira!**

Um projeto web moderno para compartilhar e descobrir música semanalmente, com integração TikTok, calendário musical interativo e interface admin completa.

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
│   └── localStorage.js # Sistema de storage local
├── api/                # Serviços de dados
│   └── entities.js     # Entidades e operações CRUD
└── hooks/              # Hooks personalizados
```

## 💾 **Sistema de Storage Local**

### **Vantagens**
- ✅ **Zero configuração** - Funciona imediatamente
- ✅ **100% local** - Sem servidores externos
- ✅ **Portável** - Dados ficam no navegador
- ✅ **Backup fácil** - Export/import JSON
- ✅ **Sem limites** - Armazenamento local ilimitado

### **Como Funciona**
- Dados salvos no `localStorage` do navegador
- Estrutura JSON simples e legível
- Backup automático com export/import
- Inicialização com dados de exemplo

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
- **Sem backend necessário!**

## 🔧 **Desenvolvimento**

### **Scripts Disponíveis**
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Verificar código
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
- ✅ **Sistema de storage** local
- ✅ **Integração TikTok** ativa
- ✅ **Design responsivo** implementado
- ✅ **Calendário musical** funcional

---

**🎵 Música da Segunda - Descubra música nova toda segunda-feira! 🎵**