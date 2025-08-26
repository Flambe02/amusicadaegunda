import { localStorageService } from '@/lib/localStorage';
import { Song } from '@/api/entities';

// Configuration TikTok
const TIKTOK_USERNAME = 'amusicadasegunda';
const TIKTOK_API_BASE = 'https://www.tiktok.com/api/';

/**
 * Récupère toutes les vidéos TikTok d'un utilisateur
 * Note: TikTok n'a pas d'API publique officielle, nous utilisons une approche alternative
 */
export class TikTokImporter {
  constructor() {
    this.importedVideos = new Set();
    this.loadImportedVideos();
  }

  /**
   * Charge les IDs des vidéos déjà importées
   */
  loadImportedVideos() {
    const songs = localStorageService.songs.getAll();
    songs.forEach(song => {
      if (song.tiktok_video_id) {
        this.importedVideos.add(song.tiktok_video_id);
      }
    });
    console.log(`📱 ${this.importedVideos.size} vidéos déjà importées`);
  }

  /**
   * Récupère les informations d'une vidéo TikTok à partir de son URL
   */
  async extractVideoInfo(tiktokUrl) {
    try {
      // Extraire l'ID de la vidéo
      const videoIdMatch = tiktokUrl.match(/video\/(\d+)/);
      if (!videoIdMatch) {
        throw new Error('URL TikTok inválida');
      }

      const videoId = videoIdMatch[1];
      
      // Vérifier si la vidéo est déjà importée
      if (this.importedVideos.has(videoId)) {
        console.log(`⚠️ Vidéo ${videoId} déjà importée, ignorée`);
        return null;
      }

      // Simuler la récupération des métadonnées TikTok
      // En production, on utiliserait l'API TikTok ou un service tiers
      const videoInfo = await this.fetchVideoMetadata(videoId, tiktokUrl);
      
      return {
        ...videoInfo,
        tiktok_video_id: videoId,
        tiktok_url: tiktokUrl
      };
    } catch (error) {
      console.error('Erro ao extrair informações da vídeo:', error);
      return null;
    }
  }

  /**
   * Récupère les métadonnées d'une vidéo TikTok
   */
  async fetchVideoMetadata(videoId, tiktokUrl) {
    // Simulation des métadonnées TikTok
    // En réalité, on utiliserait l'API TikTok ou un service comme RapidAPI
    const today = new Date();
    
    return {
      title: `Música da Segunda - ${today.toLocaleDateString('pt-BR')}`,
      artist: 'A Música da Segunda',
      description: 'Nova música da segunda com muito humor e energia!',
      lyrics: 'Letra da música será adicionada manualmente...',
      release_date: this.getNextMonday(),
      status: 'draft',
      spotify_url: '',
      apple_music_url: '',
      youtube_url: '',
      cover_image: '',
      hashtags: ['musica', 'trending', 'novidade', 'humor'],
      tiktok_publication_date: today.toISOString().split('T')[0]
    };
  }

  /**
   * Obtient la prochaine date de lundi
   */
  getNextMonday() {
    const today = new Date();
    let daysUntilMonday;
    
    if (today.getDay() === 1) {
      daysUntilMonday = 7;
    } else if (today.getDay() === 0) {
      daysUntilMonday = 1;
    } else {
      daysUntilMonday = (8 - today.getDay()) % 7;
    }
    
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    
    return nextMonday.toISOString().split('T')[0];
  }

  /**
   * Importe une vidéo TikTok dans la base de données
   */
  async importVideo(videoInfo) {
    try {
      const newSong = await Song.create(videoInfo);
      this.importedVideos.add(videoInfo.tiktok_video_id);
      console.log(`✅ Vidéo ${videoInfo.tiktok_video_id} importada com sucesso!`);
      return newSong;
    } catch (error) {
      console.error('Erro ao importar vídeo:', error);
      throw error;
    }
  }

  /**
   * Récupère et importe toutes les nouvelles vidéos TikTok
   */
  async importAllVideos() {
    console.log('🚀 Iniciando importação automática de vídeos TikTok...');
    
    try {
      // Liste des vidéos TikTok connues (à étendre manuellement)
      const knownVideos = [
        'https://www.tiktok.com/@amusicadasegunda/video/7540762684149517590',
        'https://www.tiktok.com/@amusicadasegunda/video/7539613899209903382',
        // Ajoutez ici les nouvelles URLs TikTok que vous trouvez
      ];

      const importedSongs = [];
      const existingSongs = localStorageService.songs.getAll();
      console.log(`📱 Verificando ${knownVideos.length} vídeos conhecidos contra ${existingSongs.length} músicas existentes`);
      
      for (const videoUrl of knownVideos) {
        try {
          const videoInfo = await this.extractVideoInfo(videoUrl);
          if (videoInfo) {
            // Vérifier si la vidéo existe déjà par ID TikTok
            const existingSong = existingSongs.find(song => 
              song.tiktok_video_id === videoInfo.tiktok_video_id
            );
            
            if (existingSong) {
              console.log(`✅ Vidéo ${videoInfo.tiktok_video_id} já existe: "${existingSong.title}"`);
              continue; // Passer à la suivante
            }
            
            const song = await this.importVideo(videoInfo);
            importedSongs.push(song);
          }
        } catch (error) {
          console.error(`Erro ao processar vídeo ${videoUrl}:`, error);
        }
      }

      console.log(`🎉 Importação concluída! ${importedSongs.length} novas vídeos importadas`);
      return importedSongs;
      
    } catch (error) {
      console.error('Erro durante importação automática:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques d'importation
   */
  getImportStats() {
    const totalSongs = localStorageService.songs.getAll().length;
    const importedCount = this.importedVideos.size;
    
    return {
      totalSongs,
      importedVideos: importedCount,
      newVideosAvailable: 0 // À calculer selon vos besoins
    };
  }
}

/**
 * Fonction utilitaire pour importer rapidement toutes les vidéos
 */
export async function importAllTikTokVideos() {
  const importer = new TikTokImporter();
  return await importer.importAllVideos();
}

/**
 * Fonction pour vérifier les nouvelles vidéos disponibles
 */
export async function checkNewVideos() {
  const importer = new TikTokImporter();
  const stats = importer.getImportStats();
  
  console.log('📊 Estatísticas de importação:', stats);
  return stats;
}

/**
 * Fonction de récupération d'urgence - restaure les données par défaut
 */
export async function emergencyRestore() {
  console.log('🚨 RESTAURAÇÃO DE EMERGÊNCIA - Restaurando dados padrão...');
  
  try {
    // Restaurer les données par défaut
    localStorageService.initialize();
    
    // Recharger les données
    const songs = localStorageService.songs.getAll();
    console.log(`✅ Dados restaurados! ${songs.length} músicas encontradas:`, songs.map(s => s.title));
    
    return songs;
  } catch (error) {
    console.error('❌ Erro durante restauração:', error);
    throw error;
  }
}

/**
 * Fonction pour vérifier l'intégrité des données
 */
export function checkDataIntegrity() {
  try {
    const songs = localStorageService.songs.getAll();
    const tiktokVideos = songs.filter(song => song.tiktok_video_id);
    
    console.log('🔍 Verificação de integridade dos dados:');
    console.log(`- Total de músicas: ${songs.length}`);
    console.log(`- Vídeos TikTok: ${tiktokVideos.length}`);
    
    songs.forEach((song, index) => {
      console.log(`${index + 1}. ${song.title} (ID: ${song.id}, TikTok: ${song.tiktok_video_id || 'N/A'})`);
    });
    
    return {
      totalSongs: songs.length,
      tiktokVideos: tiktokVideos.length,
      songs: songs
    };
  } catch (error) {
    console.error('❌ Erro ao verificar integridade:', error);
    return null;
  }
}
