// ===== SYSTÈME DE STOCKAGE LOCAL SIMPLE =====

// Clés de stockage
const STORAGE_KEYS = {
  SONGS: 'musica-da-segunda-songs',
  ALBUMS: 'musica-da-segunda-albums',
  SETTINGS: 'musica-da-segunda-settings'
};

// Aucune donnée par défaut - tout vient de Supabase
const DEFAULT_SONGS = [];

// ===== FONCTIONS DE GESTION =====

export const localStorageService = {
  // Initialiser les données (vide - Supabase gère tout)
  initialize() {
    // Ne pas initialiser avec des données mockées
    // Les données viennent de Supabase
    console.log('🔄 localStorage initialisé - données Supabase uniquement');
  },

  // Forcer la réinitialisation des données (vide)
  forceReset() {
    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify([]));
    console.log('🔄 localStorage réinitialisé - données Supabase uniquement');
  },

  // Nettoyer spécifiquement "Confissões Bancárias"
  cleanConfissoesBancarias() {
    try {
      const songs = this.songs.getAll();
      const cleanedSongs = songs.filter(song => 
        song.title !== 'Confissões Bancárias' && 
        song.tiktok_video_id !== '7540762684149517590'
      );
      
      if (cleanedSongs.length !== songs.length) {
        // Renuméroter les IDs
        const renumberedSongs = cleanedSongs.map((song, index) => ({
          ...song,
          id: index + 1
        }));
        
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(renumberedSongs));
        console.log(`🧹 "Confissões Bancárias" supprimée du localStorage. ${songs.length - cleanedSongs.length} chanson(s) nettoyée(s)`);
        return true;
      }
      
      console.log('✅ localStorage déjà propre, aucune action nécessaire');
      return false;
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      return false;
    }
  },

  // ===== GESTION DES CHANSONS =====
  songs: {
    // Récupérer toutes les chansons
    getAll() {
      try {
        const songs = localStorage.getItem(STORAGE_KEYS.SONGS);
        return songs ? JSON.parse(songs) : [];
      } catch (error) {
        console.error('Erro ao carregar músicas:', error);
        return [];
      }
    },

    // Récupérer une chanson par ID
    getById(id) {
      const songs = this.getAll();
      return songs.find(song => song.id === id) || null;
    },

    // Récupérer la chanson actuelle (la plus récente publiée)
    getCurrent() {
      const songs = this.getAll();
      const publishedSongs = songs.filter(song => song.status === 'published');
      if (publishedSongs.length === 0) return null;
      
      // Trier par date de sortie (plus récente en premier)
      publishedSongs.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      return publishedSongs[0];
    },

    // Créer une nouvelle chanson
    create(songData) {
      try {
        const songs = this.getAll();
        const newSong = {
          ...songData,
          id: Date.now(), // ID unique simple
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        songs.push(newSong);
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
        return newSong;
      } catch (error) {
        console.error('Erro ao criar música:', error);
        throw error;
      }
    },

    // Mettre à jour une chanson
    update(id, updates) {
      try {
        const songs = this.getAll();
        const index = songs.findIndex(song => song.id === id);
        
        if (index === -1) {
          throw new Error('Música não encontrada');
        }

        songs[index] = {
          ...songs[index],
          ...updates,
          updated_at: new Date().toISOString()
        };

        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
        return songs[index];
      } catch (error) {
        console.error('Erro ao atualizar música:', error);
        throw error;
      }
    },

    // Supprimer une chanson
    delete(id) {
      try {
        const songs = this.getAll();
        const filteredSongs = songs.filter(song => song.id !== id);
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(filteredSongs));
        return true;
      } catch (error) {
        console.error('Erro ao deletar música:', error);
        throw error;
      }
    },

    // Rechercher des chansons
    search(query) {
      const songs = this.getAll();
      if (!query) return songs;
      
      const lowerQuery = query.toLowerCase();
      return songs.filter(song => 
        song.title.toLowerCase().includes(lowerQuery) ||
        song.artist.toLowerCase().includes(lowerQuery) ||
        song.description?.toLowerCase().includes(lowerQuery)
      );
    }
  },

  // ===== GESTION DES ALBUMS =====
  albums: {
    getAll() {
      try {
        const albums = localStorage.getItem(STORAGE_KEYS.ALBUMS);
        return albums ? JSON.parse(albums) : [];
      } catch (error) {
        console.error('Erro ao carregar álbuns:', error);
        return [];
      }
    },

    create(albumData) {
      try {
        const albums = this.getAll();
        const newAlbum = {
          ...albumData,
          id: Date.now(),
          created_at: new Date().toISOString()
        };
        
        albums.push(newAlbum);
        localStorage.setItem(STORAGE_KEYS.ALBUMS, JSON.stringify(albums));
        return newAlbum;
      } catch (error) {
        console.error('Erro ao criar álbum:', error);
        throw error;
      }
    }
  },

  // ===== UTILITAIRES =====
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.SONGS);
    localStorage.removeItem(STORAGE_KEYS.ALBUMS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  },

  exportData() {
    return {
      songs: this.songs.getAll(),
      albums: this.albums.getAll(),
      exportDate: new Date().toISOString()
    };
  },

  importData(data) {
    try {
      if (data.songs) {
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(data.songs));
      }
      if (data.albums) {
        localStorage.setItem(STORAGE_KEYS.ALBUMS, JSON.stringify(data.albums));
      }
      return true;
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      throw error;
    }
  }
};

// Initialiser automatiquement
localStorageService.initialize();
