// ===== SYSTÈME DE STOCKAGE LOCAL SIMPLE =====

// Clés de stockage
const STORAGE_KEYS = {
  SONGS: 'musica-da-segunda-songs',
  ALBUMS: 'musica-da-segunda-albums',
  SETTINGS: 'musica-da-segunda-settings'
};

// Données par défaut
const DEFAULT_SONGS = [
  {
    id: 1,
    title: "Confissões Bancárias",
    artist: "A Música da Segunda",
    description: "Uma música sobre confissões bancárias e humor",
    lyrics: "Confissões bancárias...\nNova música da segunda...",
    release_date: "2025-08-25",
    status: "published",
    tiktok_video_id: "7540762684149517590",
    tiktok_url: "https://www.tiktok.com/@amusicadasegunda/video/7540762684149517590",
    spotify_url: "",
    apple_music_url: "",
    youtube_url: "",
    cover_image: "",
    hashtags: ["humor", "moraes", "bancos", "trendingsong", "musica"],
    created_at: "2025-01-27T10:00:00.000Z",
    updated_at: "2025-01-27T10:00:00.000Z"
  }
];

// ===== FONCTIONS DE GESTION =====

export const localStorageService = {
  // Initialiser les données par défaut
  initialize() {
    if (!localStorage.getItem(STORAGE_KEYS.SONGS)) {
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(DEFAULT_SONGS));
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
