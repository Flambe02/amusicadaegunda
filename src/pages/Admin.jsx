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
import TikTokImporter from '@/components/TikTokImporter';

export default function AdminPage() {
  // ===== ÉTATS =====
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showMessage, setShowMessage] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // ===== EFFETS =====
  useEffect(() => {
    loadSongs();
  }, []);

  // ===== FONCTIONS =====
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

  // ===== EXTRACTION TIKTOK =====
  const extractTikTokInfo = async (tiktokUrl) => {
    if (!tiktokUrl) {
      displayMessage('error', 'Por favor, insira o link do TikTok primeiro');
      return;
    }

    setIsExtracting(true);
    
    try {
      // Extraire l'ID de la vidéo du lien TikTok
      const videoIdMatch = tiktokUrl.match(/video\/(\d+)/);
      if (!videoIdMatch) {
        throw new Error('Link do TikTok inválido. Formato esperado: https://www.tiktok.com/@usuario/video/ID');
      }

      const videoId = videoIdMatch[1];
      
      // Simuler la date de publication TikTok (aujourd'hui par défaut)
      // En production, on pourrait utiliser l'API TikTok pour obtenir la vraie date
      const tiktokPublicationDate = new Date().toISOString().split('T')[0];
      
      // Mettre à jour les champs avec les informations extraites
      setEditingSong(prev => ({
        ...prev,
        tiktok_url: tiktokUrl,
        tiktok_video_id: videoId,
        tiktok_publication_date: tiktokPublicationDate,
        // Générer un titre par défaut
        title: prev.title || `Música da Segunda - ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`,
        // Générer des hashtags par défaut
        hashtags: prev.hashtags.length > 0 ? prev.hashtags : ['musica', 'trending', 'novidade'],
        // Définir la date de sortie pour la prochaine lundi
        release_date: getNextMonday()
      }));

      displayMessage('success', `✅ Informações do TikTok extraídas! ID: ${videoId} | Data sugerida: ${format(parseISO(getNextMonday()), 'dd/MM/yyyy', { locale: ptBR })}`);
      
    } catch (error) {
      console.error('Erro ao extrair informações do TikTok:', error);
      displayMessage('error', `Erro: ${error.message}`);
    } finally {
      setIsExtracting(false);
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
    
    try {
      if (isEditing) {
        await Song.update(editingSong.id, editingSong);
        displayMessage('success', 'Música atualizada com sucesso!');
      } else {
        await Song.create(editingSong);
        displayMessage('success', 'Música criada com sucesso!');
      }
      
      setShowForm(false);
      setEditingSong(null);
      loadSongs();
    } catch (error) {
      displayMessage('error', 'Erro ao salvar música');
    }
  };

  const handleInputChange = (field, value) => {
    setEditingSong(prev => ({
      ...prev,
      [field]: value
    }));
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

  // ===== RENDU =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-blue-900 mb-2">
            🎵 Admin Panel - Música da Segunda
          </h1>
          <p className="text-blue-700 text-lg">
            Gerencie suas músicas e conteúdo localmente
          </p>
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
        <div className="bg-white rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-3">
              <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Música
              </Button>
              <Button onClick={exportData} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar
                  </span>
                </Button>
              </label>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={loadSongs} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={clearAllData} variant="outline" size="sm" className="text-red-600 border-red-300">
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Tudo
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar músicas por título, artista ou descrição..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* TikTok Importer */}
        <div className="mb-6">
          <TikTokImporter />
        </div>

        {/* Songs List */}
        <div className="grid gap-4">
          {songs.map((song) => (
            <Card key={song.id} className="shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-blue-900 mb-2">
                      {song.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Music className="w-3 h-3 mr-1" />
                        {song.artist}
                      </Badge>
                      <Badge variant={song.status === 'published' ? 'default' : 'secondary'}>
                        {song.status}
                      </Badge>
                      <Badge variant="outline">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(parseISO(song.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </Badge>

                    </div>
                    {song.description && (
                      <p className="text-gray-600 text-sm">{song.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(song)} size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => handleDelete(song.id)} size="sm" variant="outline" className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {songs.length === 0 && (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Nenhuma música encontrada
            </h3>
            <p className="text-gray-500">
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
                          Link da Vídeo TikTok *
                        </label>
                        <div className="flex gap-2">
                          <Input
                            value={editingSong.tiktok_url}
                            onChange={(e) => handleInputChange('tiktok_url', e.target.value)}
                            placeholder="https://www.tiktok.com/@usuario/video/ID..."
                            type="url"
                            className="flex-1"
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
                        <p className="text-xs text-gray-500 mt-1">
                          Exemplo: https://www.tiktok.com/@amusicadasegunda/video/7539613899209903382
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ID da Vídeo TikTok
                          </label>
                          <Input
                            value={editingSong.tiktok_video_id}
                            onChange={(e) => handleInputChange('tiktok_video_id', e.target.value)}
                            placeholder="7539613899209903382"
                            readOnly
                            className="bg-gray-50"
                          />
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

                      {/* ===== NOUVELLE SECTION DATES ===== */}
                      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-blue-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            📅 Data de Publicação TikTok
                          </label>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="text-sm text-blue-800 font-medium">
                              {editingSong.tiktok_publication_date ? (
                                <>
                                  <span className="text-green-600">✅ Publicado em: </span>
                                  {format(parseISO(editingSong.tiktok_publication_date), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: ptBR })}
                                </>
                              ) : (
                                <span className="text-blue-600">📱 Data será extraída automaticamente</span>
                              )}
                            </div>
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
                          Título *
                        </label>
                        <Input
                          value={editingSong.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          required
                          placeholder="Título da música"
                        />
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