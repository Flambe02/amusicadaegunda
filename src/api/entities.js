import { localStorageService } from '@/lib/localStorage';
import { supabaseSongService, supabaseAlbumService } from './supabaseService';
import { checkConnection, checkSupabaseData } from '@/lib/supabase';

let currentStorageMode = 'unknown';

// ===== FORCER L'UTILISATION DE SUPABASE =====
let useSupabase = true; // Forcer Supabase

const detectStorageMode = async () => {
  try {
    console.log('🔄 Test de connexion Supabase...');
    
    // Vérifier la connexion
    const isConnected = await checkConnection();
    
    if (isConnected) {
      console.log('✅ Mode de stockage: Supabase ☁️ (connecté)');
      useSupabase = true;
      currentStorageMode = 'supabase';
      return true;
    } else {
      console.warn('⚠️ Connexion Supabase échouée, utilisation localStorage');
      useSupabase = false;
      currentStorageMode = 'localStorage';
      return false;
    }
  } catch (error) {
    console.warn('⚠️ Erreur détection mode stockage, utilisation localStorage:', error);
    useSupabase = false;
    currentStorageMode = 'localStorage';
    return false;
  }
};

// Forcer la détection immédiate
detectStorageMode().then(() => {
  console.log(`🎯 Mode de stockage final: ${currentStorageMode === 'supabase' ? 'Supabase ☁️' : 'localStorage 💾'}`);
});

// ===== ENTITÉS AVEC FALLBACK AUTOMATIQUE =====
export const Song = {
  list: async (orderBy = '-release_date', limit = 10) => {
    try {
      if (useSupabase) {
        const songs = await supabaseSongService.list(orderBy, limit);
        return songs;
      } else {
        // Fallback localStorage
        const songs = localStorageService.songs.getAll();
        const sortedSongs = songs.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
        return limit ? sortedSongs.slice(0, limit) : sortedSongs;
      }
    } catch (error) {
      console.error('Erro ao carregar músicas:', error);
      // Fallback localStorage en cas d'erreur Supabase
      const songs = localStorageService.songs.getAll();
      const sortedSongs = songs.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      return limit ? sortedSongs.slice(0, limit) : sortedSongs;
    }
  },

  get: async (id) => {
    try {
      if (useSupabase) {
        return await supabaseSongService.get(id);
      } else {
        return localStorageService.songs.getById(id);
      }
    } catch (error) {
      console.error('Erro ao carregar música:', error);
      return localStorageService.songs.getById(id);
    }
  },

  getCurrent: async () => {
    try {
      if (useSupabase) {
        return await supabaseSongService.getCurrent();
      } else {
        return localStorageService.songs.getCurrent();
      }
    } catch (error) {
      console.error('Erro ao carregar música atual:', error);
      return localStorageService.songs.getCurrent();
    }
  },

  create: async (songData) => {
    try {
      if (useSupabase) {
        const result = await supabaseSongService.create(songData);
        // Synchroniser avec localStorage pour compatibilité
        try {
          localStorageService.songs.create(songData);
        } catch (localError) {
          console.warn('⚠️ Erreur synchronisation localStorage:', localError);
        }
        return result;
      } else {
        return localStorageService.songs.create(songData);
      }
    } catch (error) {
      console.error('Erro ao criar música:', error);
      // Fallback localStorage
      return localStorageService.songs.create(songData);
    }
  },

  update: async (id, updates) => {
    try {
      if (useSupabase) {
        const result = await supabaseSongService.update(id, updates);
        // Synchroniser avec localStorage
        try {
          localStorageService.songs.update(id, updates);
        } catch (localError) {
          console.warn('⚠️ Erreur synchronisation localStorage:', localError);
        }
        return result;
      } else {
        return localStorageService.songs.update(id, updates);
      }
    } catch (error) {
      console.error('Erro ao atualizar música:', error);
      return localStorageService.songs.update(id, updates);
    }
  },

  delete: async (id) => {
    try {
      if (useSupabase) {
        const result = await supabaseSongService.delete(id);
        // Synchroniser avec localStorage
        try {
          localStorageService.songs.delete(id);
        } catch (localError) {
          console.warn('⚠️ Erreur synchronisation localStorage:', localError);
        }
        return result;
      } else {
        return localStorageService.songs.delete(id);
      }
    } catch (error) {
      console.error('Erro ao deletar música:', error);
      return localStorageService.songs.delete(id);
    }
  },

  search: async (query) => {
    try {
      if (useSupabase) {
        return await supabaseSongService.search(query);
      } else {
        return localStorageService.songs.search(query);
      }
    } catch (error) {
      console.error('Erro ao pesquisar músicas:', error);
      return localStorageService.songs.search(query);
    }
  },

  getByStatus: async (status) => {
    try {
      if (useSupabase) {
        return await supabaseSongService.getByStatus(status);
      } else {
        const songs = localStorageService.songs.getAll();
        return songs.filter(song => song.status === status);
      }
    } catch (error) {
      console.error('Erro ao carregar músicas por status:', error);
      const songs = localStorageService.songs.getAll();
      return songs.filter(song => song.status === status);
    }
  },

  getByMonth: async (year, month) => {
    try {
      if (useSupabase) {
        return await supabaseSongService.getByMonth(year, month);
      } else {
        const songs = localStorageService.songs.getAll();
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        return songs.filter(song => {
          const songDate = new Date(song.release_date);
          return songDate >= startDate && songDate <= endDate;
        });
      }
    } catch (error) {
      console.error('Erro ao carregar músicas por mês:', error);
      const songs = localStorageService.songs.getAll();
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      return songs.filter(song => {
        const songDate = new Date(song.release_date);
        return songDate >= startDate && songDate <= endDate;
      });
    }
  }
};

export const AdventSong = {
  list: async (orderBy = '-release_date', limit = 25) => {
    try {
      if (useSupabase) {
        // Récupérer les chansons de décembre ou publiées
        const songs = await supabaseSongService.list(orderBy, limit);
        const adventSongs = songs.filter(song => {
          const releaseDate = new Date(song.release_date);
          const month = releaseDate.getMonth();
          return month === 11 || song.status === 'published';
        });
        return limit ? adventSongs.slice(0, limit) : adventSongs;
      } else {
        // Fallback localStorage
        const songs = localStorageService.songs.getAll();
        const adventSongs = songs.filter(song => {
          const releaseDate = new Date(song.release_date);
          const month = releaseDate.getMonth();
          const day = releaseDate.getDate();
          return month === 11 || song.status === 'published';
        });
        
        const sortedSongs = adventSongs.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
        return limit ? sortedSongs.slice(0, limit) : sortedSongs;
      }
    } catch (error) {
      console.error('Erro ao carregar músicas do Ano 2025:', error);
      // Fallback localStorage
      const songs = localStorageService.songs.getAll();
      const adventSongs = songs.filter(song => {
        const releaseDate = new Date(song.release_date);
        const month = releaseDate.getMonth();
        const day = releaseDate.getDate();
        return month === 11 || song.status === 'published';
      });
      
      const sortedSongs = adventSongs.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      return limit ? sortedSongs.slice(0, limit) : sortedSongs;
    }
  }
};

export const User = null;

// ===== FONCTIONS UTILITAIRES =====
export const switchToSupabase = async () => {
  const success = await detectStorageMode();
  if (success) {
    console.log('✅ Passage en mode Supabase activé');
  } else {
    console.log('❌ Impossible de passer en mode Supabase');
  }
  return success;
};

export const switchToLocalStorage = () => {
  useSupabase = false;
  console.log('📱 Passage en mode localStorage activé');
  return true;
};

export const getCurrentStorageMode = () => currentStorageMode;

export const isSupabaseAvailable = () => {
  return useSupabase;
};