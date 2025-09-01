import { localStorageService } from '@/lib/localStorage';
import { supabaseSongService } from './supabaseService';
import { checkConnection } from '@/lib/supabase';

let currentStorageMode = 'unknown';

// ===== FORCER L'UTILISATION DE SUPABASE =====
let useSupabase = true; // Forcer Supabase

const detectStorageMode = async () => {
  try {
    console.warn('🔄 Test de connexion Supabase...');
    
    // Vérifier la connexion
    const isConnected = await checkConnection();
    
    if (isConnected) {
      console.warn('✅ Mode de stockage: Supabase ☁️ (connecté)');
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
        console.warn(`🎯 Mode de stockage final: ${currentStorageMode === 'supabase' ? 'Supabase ☁️' : 'localStorage 💾'}`);
});

// ===== ENTITÉS AVEC FALLBACK AUTOMATIQUE =====
export const Song = {
  list: async (orderBy = '-release_date', limit = null) => {
    try {
      if (useSupabase) {
        const songs = await supabaseSongService.list(orderBy, limit);
        if (songs && songs.length > 0) {
          console.warn('✅ Chansons chargées depuis Supabase:', songs.length);
          return songs;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar músicas desde Supabase:', error);
    }
    
    // Fallback vers data/songs.json si Supabase échoue ou est vide
    try {
      console.warn('🔄 Fallback vers data/songs.json...');
      const songs = localStorageService.songs.getAll();
      if (songs && songs.length > 0) {
        const sortedSongs = songs.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
        console.warn('✅ Chansons chargées depuis localStorage:', songs.length);
        return limit ? sortedSongs.slice(0, limit) : sortedSongs;
      }
    } catch (localError) {
      console.error('Erro ao carregar músicas depuis localStorage:', localError);
    }
    
    // Dernier fallback : forcer l'initialisation du localStorage
    try {
      console.warn('🔄 Forçage initialisation localStorage...');
      localStorageService.initialize();
      const songs = localStorageService.songs.getAll();
      if (songs && songs.length > 0) {
        const sortedSongs = songs.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
        console.warn('✅ Chansons chargées après initialisation forcée:', songs.length);
        return limit ? sortedSongs.slice(0, limit) : sortedSongs;
      }
    } catch (initError) {
      console.error('Erro ao forçar inicialização localStorage:', initError);
    }
    
    console.warn('⚠️ Aucune chanson trouvée, retour tableau vide');
    return [];
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
      // Forcer l'utilisation de Supabase si disponible
      if (useSupabase) {
        const supabaseSong = await supabaseSongService.getCurrent();
        
        if (supabaseSong) {
          // Synchroniser avec localStorage pour compatibilité
          try {
            // Nettoyer d'abord le localStorage de "Confissões Bancárias"
            const existingSongs = localStorageService.songs.getAll();
            const cleanedSongs = existingSongs.filter(song => 
              song.title !== 'Confissões Bancárias' && 
              song.tiktok_video_id !== '7540762684149517590'
            );
            
            // Ajouter la chanson Supabase si elle n'existe pas déjà
            const songExists = cleanedSongs.some(song => song.tiktok_video_id === supabaseSong.tiktok_video_id);
            if (!songExists) {
              cleanedSongs.push(supabaseSong);
            }
            
            // Renuméroter les IDs et sauvegarder
            const renumberedSongs = cleanedSongs.map((song, index) => ({
              ...song,
              id: index + 1
            }));
            
            localStorage.setItem('songs', JSON.stringify(renumberedSongs));
            console.warn('🔄 localStorage synchronisé avec Supabase et nettoyé de "Confissões Bancárias"');
          } catch (localError) {
            console.warn('⚠️ Erreur synchronisation localStorage:', localError);
          }
          
          return supabaseSong;
        }
      }
      
      // Fallback localStorage seulement si Supabase n'a pas de données
              console.warn('⚠️ Supabase indisponible, utilisation du localStorage nettoyé');
      return localStorageService.songs.getCurrent();
      
    } catch (error) {
      console.error('Erro ao carregar música atual:', error);
      
      // En cas d'erreur, nettoyer le localStorage et essayer de récupérer
      try {
        const existingSongs = localStorageService.songs.getAll();
        const cleanedSongs = existingSongs.filter(song => 
          song.title !== 'Confissões Bancárias' && 
          song.tiktok_video_id !== '7540762684149517590'
        );
        
        if (cleanedSongs.length > 0) {
          // Renuméroter et sauvegarder
          const renumberedSongs = cleanedSongs.map((song, index) => ({
            ...song,
            id: index + 1
          }));
          
          localStorage.setItem('songs', JSON.stringify(renumberedSongs));
          console.warn('🔄 localStorage nettoyé après erreur Supabase');
          
          // Retourner la première chanson nettoyée
          return renumberedSongs[0];
        }
      } catch (cleanupError) {
        console.error('❌ Erreur lors du nettoyage du localStorage:', cleanupError);
      }
      
      return null;
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
  },

  getBySlug: async (slug) => {
    try {
      if (useSupabase) {
        // Essayer de récupérer par slug depuis Supabase
        const songs = await supabaseSongService.list();
        const song = songs.find(s => s.slug === slug || s.title?.toLowerCase().replace(/\s+/g, '-') === slug);
        return song || null;
      } else {
        // Fallback localStorage
        const songs = localStorageService.songs.getAll();
        const song = songs.find(s => s.slug === slug || s.title?.toLowerCase().replace(/\s+/g, '-') === slug);
        return song || null;
      }
    } catch (error) {
      console.error('Erro ao carregar música por slug:', error);
      // Fallback localStorage en cas d'erreur
      const songs = localStorageService.songs.getAll();
      const song = songs.find(s => s.slug === slug || s.title?.toLowerCase().replace(/\s+/g, '-') === slug);
      return song || null;
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
    console.warn('✅ Passage en mode Supabase activé');
  } else {
          console.warn('❌ Impossible de passer en mode Supabase');
  }
  return success;
};

export const switchToLocalStorage = () => {
  useSupabase = false;
      console.warn('📱 Passage en mode localStorage activé');
  return true;
};

export const getCurrentStorageMode = () => currentStorageMode;

export const isSupabaseAvailable = () => {
  return useSupabase;
};