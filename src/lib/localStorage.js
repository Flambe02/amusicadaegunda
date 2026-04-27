// ===== SYSTÈME DE STOCKAGE LOCAL SIMPLE =====

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

// Clés de stockage
const STORAGE_KEYS = {
  SONGS: 'musica-da-segunda-songs',
  ALBUMS: 'musica-da-segunda-albums',
  SETTINGS: 'musica-da-segunda-settings'
};

// Données de fallback depuis data/songs.json
const DEFAULT_SONGS = [
  {
    "id": 1,
    "slug": "croissant",
    "title": "O Croissant",
    "artist": "A Música da Segunda",
    "description": "A música \"O Croissant\" brinca com o cho",
    "release_date": "2025-02-03",
    "status": "published",
    "genre": "Indie"
  },
  {
    "id": 2,
    "slug": "confissoes-bancarias",
    "title": "Confissões Bancárias",
    "artist": "A Música da Segunda",
    "description": "Confissões sobre a vida bancária e financeira",
    "release_date": "2025-08-25",
    "status": "published",
    "genre": "Indie"
  },
  {
    "id": 3,
    "slug": "festas-juninas",
    "title": "Festas Juninas",
    "artist": "A Música da Segunda",
    "description": "Celebrando as tradicionais festas juninas brasileiras",
    "release_date": "2025-06-30",
    "status": "published",
    "genre": "Música Brasileira"
  },
  {
    "id": 4,
    "slug": "cafe-no-brasil",
    "title": "Café no Brasil",
    "artist": "A Música da Segunda",
    "description": "Uma ode ao café brasileiro e sua cultura",
    "release_date": "2025-07-14",
    "status": "published",
    "genre": "Música Brasileira"
  }
];

// ===== FONCTIONS DE GESTION =====

export const localStorageService = {
  // Initialiser les données avec fallback depuis data/songs.json
  initialize() {
    try {
      const existingSongs = this.songs.getAll();
      if (existingSongs.length === 0) {
        // Charger les données par défaut si localStorage est vide
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(DEFAULT_SONGS));
        isDev && console.warn('🔄 localStorage initialisé avec données de fallback:', DEFAULT_SONGS.length, 'chansons');
      } else {
        isDev && console.warn('🔄 localStorage déjà initialisé avec:', existingSongs.length, 'chansons');
      }
    } catch (error) {
      console.error('❌ Erreur initialisation localStorage:', error);
      // Fallback en cas d'erreur
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(DEFAULT_SONGS));
    }
  },

  // Forcer la réinitialisation des données (vide)
  forceReset() {
    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify([]));
    isDev && console.warn('🔄 localStorage réinitialisé - données Supabase uniquement');
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
