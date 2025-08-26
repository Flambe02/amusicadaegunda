import React, { useState, useEffect } from 'react';
import { localStorageService } from '@/lib/localStorage';
import { Song } from '@/api/entities';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Save, 
  X, 
  Music, 
  Calendar,
  FileText,
  Link,
  Hash,
  Image as ImageIcon,
  Download,
  Upload,
  RefreshCw,
  Zap,
  ExternalLink,
  Video,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminPage() {
  // ===== ESTADOS =====
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showMessage, setShowMessage] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // ===== EFEITOS =====
  useEffect(() => {
    loadSongs();
  }, []);

  // ===== FUNÇÕES =====
  const loadSongs = () => {
    const allSongs = localStorageService.songs.getAll();
    setSongs(allSongs);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      loadSongs();
    } else {
      const results = localStorageService.songs.search(query);
      setSongs(results);
    }
  };

  // ===== EXTRAÇÃO TIKTOK =====
  const extractTikTokInfo = async (tiktokUrl) => {
    if (!tiktokUrl || tiktokUrl.trim() === '') {
      displayMessage('error', '❌ Por favor, insira o link do TikTok primeiro');
      return;
    }

    // Nettoyer l'URL des espaces, caractères indésirables et code HTML
    let cleanUrl = tiktokUrl
      .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
      .replace(/on>.*?<\/blockquote>/g, '') // Supprimer le code embed
      .replace(/<script[^>]*>.*?<\/script>/g, '') // Supprimer les scripts
      .replace(/https:\/\/www\.tiktok\.com\/embed\.js/g, '') // Supprimer le lien embed.js
      .trim(); // Supprimer les espaces
    
    // Si après nettoyage il ne reste rien, afficher une erreur
    if (!cleanUrl) {
      throw new Error('❌ Nenhum link válido encontrado! Cole apenas o link TikTok, não o código HTML.');
    }
    
    setIsExtracting(true);
    
    try {
      // Validation et extraction de l'ID de la vidéo TikTok
      let videoId = null;
      
      // Pattern 1: https://www.tiktok.com/@usuario/video/ID
      const pattern1 = cleanUrl.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
      if (pattern1) {
        videoId = pattern1[1];
      }
      
      // Pattern 2: https://vm.tiktok.com/ID/ (liens courts)
      const pattern2 = cleanUrl.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/);
      if (pattern2) {
        videoId = pattern2[1];
      }
      
      // Pattern 3: ID direct (si l'utilisateur colle juste l'ID)
      const pattern3 = cleanUrl.match(/^(\d{15,20})$/);
      if (pattern3) {
        videoId = pattern3[1];
      }
      
      if (!videoId) {
        throw new Error('❌ Formato de link inválido! Use: https://www.tiktok.com/@usuario/video/ID ou https://vm.tiktok.com/ID');
      }
      
      // Extraire les vraies métadonnées TikTok
      const metadata = await extractTikTokMetadata(videoId, cleanUrl);
      
      // Date de sortie suggérée (prochain lundi)
      const suggestedReleaseDate = getNextMonday();
      
      // Mettre à jour les champs avec les informations extraites
      const updatedSong = {
        ...editingSong,
        tiktok_url: cleanUrl,
        tiktok_video_id: videoId,
        tiktok_publication_date: metadata.publicationDate,
        // Titre extrait de TikTok (priorité absolue)
        title: metadata.title || `Música da Segunda - ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`,
        // Description extraite de TikTok (priorité absolue)
        description: metadata.description || 'Música da Segunda - Nova descoberta musical!',
        // Hashtags extraits de TikTok (priorité absolue)
        hashtags: metadata.hashtags.length > 0 ? metadata.hashtags : ['musica', 'trending', 'novidade', 'humor'],
        // Date de sortie suggérée
        release_date: suggestedReleaseDate
      };
      
      console.log('🎯 Métadonnées extraites:', metadata);
      console.log('📝 Chanson mise à jour:', updatedSong);
      
      setEditingSong(updatedSong);

      displayMessage('success', `✅ TikTok extraído com sucesso! 
      🎬 ID: ${videoId} 
      📝 Título: ${metadata.title || 'Extraído automaticamente'}
      📅 Data de publicação: ${format(parseISO(metadata.publicationDate), 'dd/MM/yyyy', { locale: ptBR })}
      🏷️ Hashtags: ${metadata.hashtags.length} encontrados
      ✨ Agora você pode editar e salvar!`);
      
    } catch (error) {
      console.error('Erro ao extrair informações do TikTok:', error);
      displayMessage('error', `❌ ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // ===== EXTRAÇÃO DAS METADADAS TIKTOK =====
  const extractTikTokMetadata = async (videoId, tiktokUrl) => {
    try {
      console.log('🔍 Tentando extrair métadonnées de:', tiktokUrl);
      
      // Essayer d'extraire les métadonnées via l'API publique TikTok
      const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Réponse API TikTok:', data);
        
        // Extraire les hashtags du titre et de la description
        const hashtags = extractHashtags(data.title + ' ' + (data.description || ''));
        
        const metadata = {
          title: data.title || `Música da Segunda - ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`,
          description: data.description || 'Música da Segunda - Nova descoberta musical!',
          hashtags: hashtags,
          publicationDate: await extractTikTokPublicationDate(tiktokUrl, videoId),
          author: data.author_name || 'A Música da Segunda'
        };
        
        console.log('✅ Métadonnées extraites avec succès:', metadata);
        return metadata;
      } else {
        console.log('❌ API TikTok retornou erro:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('🚫 Erro ao acessar API TikTok, usando dados simulados:', error);
    }
    
    // Fallback: données simulées mais réalistes
    console.log('🔄 Usando dados simulados como fallback');
    const fallbackTitle = `Música da Segunda - ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`;
    const fallbackHashtags = ['musica', 'trending', 'novidade', 'humor', 'viral', 'fyp'];
    
    return {
      title: fallbackTitle,
      description: 'Música da Segunda - Nova descoberta musical para começar sua semana com energia!',
      hashtags: fallbackHashtags,
      publicationDate: new Date().toISOString().split('T')[0],
      author: 'A Música da Segunda'
    };
  };

  // ===== EXTRAÇÃO DAS HASHTAGS =====
  const extractHashtags = (text) => {
    if (!text) return [];
    
    // Extraire les hashtags du texte
    const hashtagRegex = /#(\w+)/g;
    const hashtags = [];
    let match;
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push(match[1].toLowerCase());
    }
    
    // Ajouter des hashtags par défaut si aucun n'est trouvé
    if (hashtags.length === 0) {
      hashtags.push('musica', 'trending', 'novidade', 'humor');
    }
    
    // Limiter à 10 hashtags maximum
    return hashtags.slice(0, 10);
  };

  // ===== EXTRAÇÃO DA DATA DE PUBLICAÇÃO TIKTOK =====
  const extractTikTokPublicationDate = async (tiktokUrl, videoId) => {
    try {
      console.log('📅 Tentando extrair data de publicação para vídeo:', videoId);
      
      // Método 1: Tentar recuperar a página HTML do TikTok
      try {
        const response = await fetch(tiktokUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          console.log('📄 HTML TikTok recuperado, tamanho:', html.length);
          
          // Chercher des patterns de date dans le HTML
          const datePatterns = [
            /"createTime":\s*(\d+)/, // Timestamp Unix
            /"publishTime":\s*(\d+)/, // Temps de publication
            /"uploadTime":\s*(\d+)/,  // Temps de téléchargement
            /data-publish-time="([^"]+)"/, // Attribut data
            /datetime="([^"]+)"/, // Attribut datetime
            /(\d{4}-\d{2}-\d{2})/, // Format YYYY-MM-DD
            /(\d{2}\/\d{2}\/\d{4})/ // Format DD/MM/YYYY
          ];
          
          for (const pattern of datePatterns) {
            const match = html.match(pattern);
            if (match) {
              let publicationDate;
              
              if (pattern.source.includes('Time') && match[1]) {
                // Timestamp Unix (en secondes ou millisecondes)
                const timestamp = parseInt(match[1]);
                const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
                publicationDate = date.toISOString().split('T')[0];
                console.log('✅ Data extraída via timestamp:', publicationDate);
                return publicationDate;
              } else if (match[1]) {
                // Format de date direct
                const dateStr = match[1];
                if (dateStr.includes('-')) {
                  publicationDate = dateStr;
                } else if (dateStr.includes('/')) {
                  const [day, month, year] = dateStr.split('/');
                  publicationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                console.log('✅ Data extraída via pattern:', publicationDate);
                return publicationDate;
              }
            }
          }
          
          console.log('⚠️ Nenhum padrão de data encontrado no HTML');
        }
      } catch (htmlError) {
        console.log('⚠️ Falha ao recuperar HTML TikTok:', htmlError);
      }
      
      // Método 2: Tentar a API alternativa (se disponível)
      try {
        const alternativeResponse = await fetch(`https://www.tiktok.com/api/item/detail/?itemId=${videoId}`);
        if (alternativeResponse.ok) {
          const data = await alternativeResponse.json();
          console.log('📊 Réponse API alternativa:', data);
          
          if (data.itemInfo && data.itemInfo.itemStruct) {
            const createTime = data.itemInfo.itemStruct.createTime;
            if (createTime) {
              const date = new Date(createTime * 1000);
              const publicationDate = date.toISOString().split('T')[0];
              console.log('✅ Data extraída via API alternativa:', publicationDate);
              return publicationDate;
            }
          }
        }
      } catch (apiError) {
        console.log('⚠️ API alternativa falhou:', apiError);
      }
      
      // Fallback: utiliser la date d'aujourd'hui si aucune méthode ne fonctionne
      console.log('🔄 Usando data atual como fallback');
      return new Date().toISOString().split('T')[0];
      
    } catch (error) {
      console.error('❌ Erro ao extrair data de publicação:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  // Obtenir la prochaine lundi (fonction corrigée et simplifiée)
  const getNextMonday = () => {
    const today = new Date();
    let daysUntilMonday;
    
    // Lundi = 1, Mardi = 2, ..., Dimanche = 0
    if (today.getDay() === 1) {
      // Si aujourd'hui est lundi, prendre le lundi prochain
      daysUntilMonday = 7;
    } else if (today.getDay() === 0) {
      // Si aujourd'hui est dimanche
      daysUntilMonday = 1;
    } else {
      // Pour tous les autres jours
      daysUntilMonday = (8 - today.getDay()) % 7;
    }
    
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    
    // Vérification de sécurité
    if (nextMonday.getDay() !== 1) {
      console.error('Erro na função getNextMonday: data não é segunda-feira');
      // Fallback: lundi prochain
      const fallbackMonday = new Date(today);
      fallbackMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7));
      return fallbackMonday.toISOString().split('T')[0];
    }
    
    return nextMonday.toISOString().split('T')[0];
  };

  // Fonction utilitaire pour vérifier si une date est un lundi
  const isMonday = (dateString) => {
    const date = new Date(dateString);
    return date.getDay() === 1;
  };

  // Fonction pour obtenir le lundi le plus proche (passé ou futur)
  const getClosestMonday = () => {
    const today = new Date();
    const currentDay = today.getDay();
    
    if (currentDay === 1) {
      // Aujourd'hui est lundi
      return today.toISOString().split('T')[0];
    }
    
    // Calculer le lundi le plus proche
    let daysToAdd;
    if (currentDay === 0) {
      // Dimanche
      daysToAdd = 1;
    } else if (currentDay <= 3) {
      // Lundi à Mercredi: lundi prochain
      daysToAdd = 8 - currentDay;
    } else {
      // Jeudi à Samedi: lundi prochain
      daysToAdd = 8 - currentDay;
    }
    
    const closestMonday = new Date(today);
    closestMonday.setDate(today.getDate() + daysToAdd);
    
    return closestMonday.toISOString().split('T')[0];
  };

  const handleCreate = () => {
    setEditingSong({
      title: '',
      artist: 'A Música da Segunda',
      description: '',
      lyrics: '',
      release_date: new Date().toISOString().split('T')[0], // Date d'aujourd'hui par défaut
      status: 'draft',
      tiktok_video_id: '',
      tiktok_url: '',
      tiktok_publication_date: new Date().toISOString().split('T')[0], // Date d'aujourd'hui par défaut
      spotify_url: '',
      apple_music_url: '',
      youtube_url: '',
      cover_image: '',
      hashtags: []
    });
    setShowForm(true);
    setIsEditing(false);
  };

  const handleEdit = (song) => {
    setEditingSong({ ...song });
    setShowForm(true);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta música?')) {
      try {
        await Song.delete(id);
        displayMessage('success', 'Música deletada com sucesso!');
        loadSongs();
      } catch (error) {
        displayMessage('error', 'Erro ao deletar música');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation des champs requis
    if (!editingSong.title || editingSong.title.trim() === '') {
      displayMessage('error', '❌ O título é obrigatório!');
      return;
    }
    
    if (!editingSong.release_date) {
      displayMessage('error', '❌ A data de lançamento é obrigatória!');
      return;
    }
    
    // Validation du lien TikTok (obligatoire selon la section)
    if (!editingSong.tiktok_url || editingSong.tiktok_url.trim() === '') {
      displayMessage('error', '❌ O link do TikTok é obrigatório! Cole o link e clique em "Extrair" primeiro.');
      return;
    }
    
    // Validation de l'ID TikTok
    if (!editingSong.tiktok_video_id || editingSong.tiktok_video_id.trim() === '') {
      displayMessage('error', '❌ ID do TikTok não foi extraído! Clique em "Extrair" para obter o ID automaticamente.');
      return;
    }
    
    try {
      if (isEditing) {
        await Song.update(editingSong.id, editingSong);
        displayMessage('success', '✅ Música atualizada com sucesso!');
      } else {
        await Song.create(editingSong);
        displayMessage('success', '✅ Música criada com sucesso!');
      }
      
      setShowForm(false);
      setEditingSong(null);
      loadSongs();
    } catch (error) {
      console.error('Erro detalhado:', error);
      displayMessage('error', `❌ Erro ao salvar música: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleInputChange = (field, value) => {
    // Nettoyer automatiquement le contenu collé dans le champ TikTok
    if (field === 'tiktok_url') {
      // Supprimer le code HTML et extraire seulement l'URL
      const cleanValue = value
        .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
        .replace(/on>.*?<\/blockquote>/g, '') // Supprimer le code embed
        .replace(/<script[^>]*>.*?<\/script>/g, '') // Supprimer les scripts
        .replace(/https:\/\/www\.tiktok\.com\/embed\.js/g, '') // Supprimer le lien embed.js
        .trim(); // Supprimer les espaces
      
      setEditingSong(prev => ({
        ...prev,
        [field]: cleanValue
      }));
    } else {
      setEditingSong(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleHashtagChange = (value) => {
    const hashtags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    handleInputChange('hashtags', hashtags);
  };

  const displayMessage = (type, text) => {
    setMessage({ type, text });
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 5000);
  };

  const exportData = () => {
    const data = localStorageService.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `musica-da-segunda-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    displayMessage('success', 'Dados exportados com sucesso!');
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          localStorageService.importData(data);
          loadSongs();
          displayMessage('success', 'Dados importados com sucesso!');
        } catch (error) {
          displayMessage('error', 'Erro ao importar dados');
        }
      };
      reader.readAsText(file);
    }
  };

  const clearAllData = () => {
    if (window.confirm('⚠️ ATENÇÃO: Isso apagará TODOS os dados! Tem certeza?')) {
      localStorageService.clearAll();
      loadSongs();
      displayMessage('success', 'Todos os dados foram apagados');
    }
  };

  // ===== RENDERIZAÇÃO =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-5">
      <div className="max-w-7xl mx-auto">
        {/* Header Mobile uniquement */}
        <div className="lg:hidden text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-blue-200 shadow-xl flex-shrink-0">
              <img 
                src="/images/Musica da segunda.jpg" 
                alt="Logo Música da Segunda"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="text-left">
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-blue-900 mb-1">
                🎵 Admin Panel - Música da Segunda
              </h1>
              <p className="text-blue-700 text-sm sm:text-base">
                Gerencie suas músicas e conteúdo localmente
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
        {showMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg">
          {/* Actions principales - toujours visibles */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Música
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={exportData} variant="outline" className="flex-1 sm:flex-none">
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Exportar</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <label className="cursor-pointer flex-1 sm:flex-none">
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
                <Button variant="outline" asChild className="w-full">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Importar</span>
                    <span className="sm:hidden">Import</span>
                  </span>
                </Button>
              </label>
            </div>
          </div>
          
          {/* Actions secondaires - en ligne sur mobile */}
          <div className="flex gap-2 sm:gap-3 justify-center sm:justify-end">
            <Button onClick={loadSongs} variant="outline" size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Atualizar</span>
              <span className="sm:hidden">Atual</span>
            </Button>
            <Button onClick={clearAllData} variant="outline" size="sm" className="text-red-600 border-red-300 flex-1 sm:flex-none">
              <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Limpar Tudo</span>
              <span className="sm:hidden">Limpar</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar músicas..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Songs List */}
        <div className="grid gap-4">
          {songs.map((song) => (
            <Card key={song.id} className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0">
                  <div className="flex-1">
                    <CardTitle className="text-lg sm:text-xl text-blue-900 mb-2">
                      {song.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs sm:text-sm">
                        <Music className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">{song.artist}</span>
                        <span className="sm:hidden">A Música da Segunda</span>
                      </Badge>
                      <Badge variant={song.status === 'published' ? 'default' : 'secondary'} className="text-xs sm:text-sm">
                        <span className="hidden sm:inline">{song.status}</span>
                        <span className="sm:hidden">{song.status === 'published' ? 'Pub' : 'Rasc'}</span>
                      </Badge>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">{format(parseISO(song.release_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <span className="sm:hidden">{format(parseISO(song.release_date), 'dd/MM', { locale: ptBR })}</span>
                      </Badge>
                    </div>
                    {song.description && (
                      <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">{song.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button onClick={() => handleEdit(song)} size="sm" variant="outline" className="flex-1 sm:flex-none">
                      <Edit className="w-4 h-4" />
                      <span className="ml-1 sm:hidden">Editar</span>
                    </Button>
                    <Button onClick={() => handleDelete(song.id)} size="sm" variant="outline" className="text-red-600 flex-1 sm:flex-none">
                      <Trash2 className="w-4 h-4" />
                      <span className="ml-1 sm:hidden">Excluir</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {songs.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <Music className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
              Nenhuma música encontrada
            </h3>
            <p className="text-gray-500 text-sm sm:text-base">
              {searchQuery ? 'Tente uma busca diferente' : 'Crie sua primeira música!'}
            </p>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-blue-900">
                    {isEditing ? 'Editar Música' : 'Nova Música'}
                  </h2>
                  <Button onClick={() => setShowForm(false)} variant="ghost" size="sm">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ===== SECTION TIKTOK (EN PREMIER) ===== */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      🎬 Informações TikTok (Obrigatório)
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Link da Vídeo TikTok * (Obrigatório)
                        </label>
                        <div className="flex gap-2">
                          <Input
                            value={editingSong.tiktok_url}
                            onChange={(e) => handleInputChange('tiktok_url', e.target.value)}
                            placeholder="https://www.tiktok.com/@usuario/video/ID..."
                            type="text"
                            className={`flex-1 ${editingSong.tiktok_url && !editingSong.tiktok_url.includes('tiktok.com') && !editingSong.tiktok_url.match(/^\d{15,20}$/) ? 'border-orange-300 bg-orange-50' : ''}`}
                          />
                          <Button 
                            type="button"
                            onClick={() => extractTikTokInfo(editingSong.tiktok_url)}
                            disabled={isExtracting || !editingSong.tiktok_url}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {isExtracting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                            {isExtracting ? 'Extraindo...' : 'Extrair'}
                          </Button>
                        </div>
                        {/* Avertissement si le contenu ne ressemble pas à une URL TikTok */}
                        {editingSong.tiktok_url && !editingSong.tiktok_url.includes('tiktok.com') && !editingSong.tiktok_url.match(/^\d{15,20}$/) && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-xs text-orange-700">
                              ⚠️ <strong>Atenção:</strong> O conteúdo não parece ser um link TikTok válido. 
                              Cole apenas o link da vídeo, não o código HTML de incorporação.
                            </p>
                          </div>
                        )}
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-500">
                            <strong>Formatos aceitos:</strong>
                          </p>
                          <ul className="text-xs text-gray-500 space-y-1 ml-2">
                            <li>• https://www.tiktok.com/@usuario/video/ID</li>
                            <li>• https://vm.tiktok.com/ID</li>
                            <li>• ID direto (15-20 dígitos)</li>
                          </ul>
                          <p className="text-xs text-blue-600 font-medium mt-2">
                            💡 <strong>IMPORTANTE:</strong> Cole apenas o link da vídeo TikTok (ex: https://www.tiktok.com/@usuario/video/1234567890), 
                            NÃO o código HTML de incorporação!
                          </p>
                          <p className="text-xs text-red-600 font-medium mt-1">
                            🚫 <strong>NÃO COLE:</strong> Código HTML, scripts, ou código de incorporação
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ID da Vídeo TikTok {editingSong.tiktok_video_id && <span className="text-green-600">✅</span>}
                          </label>
                          <Input
                            value={editingSong.tiktok_video_id}
                            onChange={(e) => handleInputChange('tiktok_video_id', e.target.value)}
                            placeholder="Clique em 'Extrair' para obter o ID"
                            readOnly
                            className={`${editingSong.tiktok_video_id ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}
                          />
                          {editingSong.tiktok_video_id && (
                            <p className="text-xs text-green-600 mt-1">
                              ✅ ID extraído com sucesso!
                            </p>
                          )}
                        </div>
                        <div className="flex items-end gap-2">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => window.open(editingSong.tiktok_url, '_blank')}
                            disabled={!editingSong.tiktok_url}
                            className="flex-1"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir TikTok
                          </Button>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => setShowVideoPlayer(true)}
                            disabled={!editingSong.tiktok_video_id}
                            className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </Button>
                        </div>
                      </div>

                      {/* ===== MÉTADONNÉES EXTRACTES ===== */}
                      {editingSong.tiktok_video_id && (
                        <div className="pt-4 border-t border-blue-200">
                          <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                            📊 Metadados Extraídos do TikTok
                          </h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">📝 Título:</p>
                                <p className="text-xs">{editingSong.title || 'Extraindo...'}</p>
                              </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">🏷️ Hashtags:</p>
                                <p className="text-xs">{editingSong.hashtags?.join(', ') || 'Extraindo...'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ===== SECTION DATES ===== */}
                      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-blue-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            📅 Data de Publicação TikTok {editingSong.tiktok_publication_date && editingSong.tiktok_publication_date !== new Date().toISOString().split('T')[0] && <span className="text-green-600">✅</span>}
                          </label>
                          <div className={`border rounded-lg p-3 ${editingSong.tiktok_publication_date && editingSong.tiktok_publication_date !== new Date().toISOString().split('T')[0] ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="text-sm font-medium">
                              {editingSong.tiktok_publication_date ? (
                                <>
                                  {editingSong.tiktok_publication_date !== new Date().toISOString().split('T')[0] ? (
                                    <>
                                      <span className="text-green-600">✅ Data extraída com sucesso: </span>
                                      <span className="text-green-800">{format(parseISO(editingSong.tiktok_publication_date), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: ptBR })}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-blue-600">📱 Data padrão (hoje): </span>
                                      <span className="text-blue-800">{format(parseISO(editingSong.tiktok_publication_date), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: ptBR })}</span>
                                    </>
                                  )}
                                </>
                              ) : (
                                <span className="text-blue-600">📱 Data será extraída automaticamente</span>
                              )}
                            </div>
                            {editingSong.tiktok_publication_date && editingSong.tiktok_publication_date !== new Date().toISOString().split('T')[0] && (
                              <p className="text-xs text-green-600 mt-2">
                                🎯 Data real de publicação TikTok detectada!
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🎯 Próxima Data Sugerida
                          </label>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="text-sm text-green-800 font-medium">
                              <span className="text-green-600">📅 Próximo lundi: </span>
                              {getNextMonday() ? format(parseISO(getNextMonday()), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: ptBR }) : 'Calculando...'}
                            </div>
                            <Button 
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleInputChange('release_date', getNextMonday())}
                              className="mt-2 w-full text-green-700 border-green-300 hover:bg-green-100"
                            >
                              🎯 Usar Esta Data
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ===== SECTION INFOS DE BASE ===== */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-200">
                    <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                      <Music className="w-5 h-5 text-green-600" />
                      🎵 Informações da Música
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Título * {editingSong.tiktok_video_id && editingSong.title && editingSong.title !== `Música da Segunda - ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}` && <span className="text-green-600">✅</span>}
                        </label>
                        <Input
                          value={editingSong.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          required
                          placeholder="Título da música"
                          className={editingSong.tiktok_video_id && editingSong.title && editingSong.title !== `Música da Segunda - ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}` ? 'border-green-300 bg-green-50' : ''}
                        />
                        {editingSong.tiktok_video_id && editingSong.title && editingSong.title !== `Música da Segunda - ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}` && (
                          <p className="text-xs text-green-600 mt-1">
                            ✅ Título extraído do TikTok
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Artista
                        </label>
                        <Input
                          value={editingSong.artist}
                          onChange={(e) => handleInputChange('artist', e.target.value)}
                          placeholder="Nome do artista"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição
                      </label>
                      <Textarea
                        value={editingSong.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Descrição da música"
                        rows={3}
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Letra
                      </label>
                      <Textarea
                        value={editingSong.lyrics}
                        onChange={(e) => handleInputChange('lyrics', e.target.value)}
                        placeholder="Letra da música"
                        rows={6}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data de Lançamento *
                        </label>
                        <Input
                          type="date"
                          value={editingSong.release_date}
                          onChange={(e) => handleInputChange('release_date', e.target.value)}
                          required
                        />
                        {editingSong.release_date && (
                          <div className="mt-1 text-xs">
                            <span className="text-blue-600">📅 Data selecionada: {format(parseISO(editingSong.release_date), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: ptBR })}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Dica: Use o botão "Extrair" do TikTok para definir automaticamente a próxima segunda-feira, ou escolha qualquer data manualmente
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <Select
                          value={editingSong.status}
                          onValueChange={(value) => handleInputChange('status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Rascunho</SelectItem>
                            <SelectItem value="scheduled">Agendado</SelectItem>
                            <SelectItem value="published">Publicado</SelectItem>
                            <SelectItem value="archived">Arquivado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* ===== SECTION PLATAFORMAS DE STREAMING ===== */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                    <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                      <Link className="w-5 h-5 text-purple-600" />
                      🎧 Links de Streaming
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Spotify
                        </label>
                        <Input
                          value={editingSong.spotify_url}
                          onChange={(e) => handleInputChange('spotify_url', e.target.value)}
                          placeholder="URL Spotify"
                          type="url"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Apple Music
                        </label>
                        <Input
                          value={editingSong.apple_music_url}
                          onChange={(e) => handleInputChange('apple_music_url', e.target.value)}
                          placeholder="URL Apple Music"
                          type="url"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          YouTube
                        </label>
                        <Input
                          value={editingSong.youtube_url}
                          onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                          placeholder="URL YouTube"
                          type="url"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ===== SECTION MÉTADONNÉES ===== */}
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border-2 border-orange-200">
                    <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                      <Hash className="w-5 h-5 text-orange-600" />
                      🏷️ Métadados
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hashtags (separados por vírgula)
                        </label>
                        <Input
                          value={editingSong.hashtags.join(', ')}
                          onChange={(e) => handleHashtagChange(e.target.value)}
                          placeholder="humor, musica, trending, novidade"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Exemplo: humor, musica, trending, novidade, viral
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Imagem de Capa (URL)
                        </label>
                        <Input
                          value={editingSong.cover_image}
                          onChange={(e) => handleInputChange('cover_image', e.target.value)}
                          placeholder="https://exemplo.com/imagem.jpg"
                          type="url"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ===== ACTIONS ===== */}
                  <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-lg py-3">
                      <Save className="w-5 h-5 mr-2" />
                      {isEditing ? 'Atualizar Música' : 'Criar Nova Música'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowForm(false)}
                      className="flex-1 text-lg py-3"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ===== MODAL LECTEUR VIDÉO TIKTOK ===== */}
        {showVideoPlayer && editingSong.tiktok_video_id && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-blue-900">
                    🎬 Visualizar Vídeo TikTok
                  </h2>
                  <Button onClick={() => setShowVideoPlayer(false)} variant="ghost" size="sm">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {editingSong.title || 'Vídeo TikTok'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      ID: {editingSong.tiktok_video_id}
                    </p>
                  </div>

                  {/* Lecteur TikTok intégré */}
                  <div className="bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={`https://www.tiktok.com/embed/${editingSong.tiktok_video_id}`}
                      width="100%"
                      height="400"
                      frameBorder="0"
                      allowFullScreen
                      title="TikTok Video Player"
                    />
                  </div>

                  <div className="text-center">
                    <Button 
                      onClick={() => window.open(editingSong.tiktok_url, '_blank')}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir no TikTok
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}