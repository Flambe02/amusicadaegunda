import { supabaseSongService } from './supabaseService';
import { checkConnection } from '@/lib/supabase';

// Logs de debug supprimés

let currentStorageMode = 'supabase';

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
      console.warn('⚠️ Connexion Supabase échouée, mais on force quand même Supabase');
      useSupabase = true; // FORCER SUPABASE même si la connexion échoue
      currentStorageMode = 'supabase';
      return true;
    }
  } catch (error) {
    console.warn('⚠️ Erreur détection mode stockage, mais on force Supabase:', error);
    useSupabase = true; // FORCER SUPABASE même en cas d'erreur
    currentStorageMode = 'supabase';
    return true;
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
      // Forcer l'utilisation de Supabase
      console.warn('☁️ Chargement depuis Supabase...');
      const songs = await supabaseSongService.list(orderBy, limit);
      if (songs && songs.length > 0) {
        console.warn('✅ Chansons chargées depuis Supabase:', songs.length);
        return songs;
      } else {
        console.warn('⚠️ Aucune chanson trouvée dans Supabase');
        return [];
      }
    } catch (error) {
      console.error('Erro ao carregar músicas desde Supabase:', error);
      // Supabase-only: pas de fallback local
      return [];
    }
  },

  get: async (id) => {
    try {
      if (useSupabase) {
        return await supabaseSongService.get(id);
      }
    } catch (error) {
      console.error('Erro ao carregar música:', error);
      return null;
    }
  },

  getCurrent: async () => {
    try {
      // Forcer l'utilisation de Supabase si disponible
      if (useSupabase) {
        const supabaseSong = await supabaseSongService.getCurrent();
        
        if (supabaseSong) {
          return supabaseSong;
        }
      }
      
      // Supabase-only: pas de fallback local
      console.warn('⚠️ Supabase indisponible ou sans données');
      return null;
      
    } catch (error) {
      console.error('Erro ao carregar música atual:', error);
      return null;
    }
  },

  create: async (songData) => {
    try {
      // Forcer l'utilisation de Supabase
      console.warn('☁️ Création via Supabase...');
      const result = await supabaseSongService.create(songData);
      console.warn('✅ Création Supabase réussie:', result);
      return result;
    } catch (error) {
      console.error('❌ ERREUR CRÉATION SUPABASE:', error);
      console.error('❌ Message:', error.message);
      console.error('❌ Code:', error.code);
      console.error('❌ Details:', error.details);
      console.error('❌ Hint:', error.hint);
      throw error;
    }
  },

  update: async (id, updates) => {
    try {
      // Forcer l'utilisation de Supabase
      console.warn('☁️ Mise à jour via Supabase...');
      console.warn('📋 Données à mettre à jour:', { id, updates });
      console.warn('🔍 Type de l\'ID:', typeof id);
      console.warn('🔍 Valeur de l\'ID:', id);
      
      console.warn('🔄 Appel de supabaseSongService.update...');
      
      // Pas de fallback : si Supabase renvoie une erreur, on la laisse remonter
      const result = await supabaseSongService.update(id, updates);
      console.warn('✅ Résultat de la mise à jour Supabase:', result);
      
      // Synchronisation localStorage supprimée - on utilise uniquement Supabase
      console.warn('✅ Mise à jour Supabase réussie - pas de synchronisation localStorage nécessaire');
      
      return result;
    } catch (error) {
      console.error('❌ ERREUR SUPABASE DÉTAILLÉE:', error);
      console.error('❌ Message d\'erreur:', error.message);
      console.error('❌ Code d\'erreur:', error.code);
      console.error('❌ Détails de l\'erreur:', error.details);
      console.error('❌ Hint:', error.hint);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Erreur complète:', JSON.stringify(error, null, 2));
      
      // NE PAS faire de fallback localStorage - forcer l'erreur
      console.error('❌ ÉCHEC DE LA MISE À JOUR SUPABASE - PAS DE FALLBACK');
      throw error; // Laisser l'erreur remonter sans la transformer
    }
  },

  delete: async (id) => {
    try {
      // Forcer l'utilisation de Supabase - PAS DE FALLBACK
      console.warn('☁️ Suppression via Supabase...');
      const result = await supabaseSongService.delete(id);
      console.warn('✅ Suppression Supabase réussie:', result);
      return result;
    } catch (error) {
      console.error('❌ ERREUR SUPPRESSION SUPABASE:', error);
      console.error('❌ Message:', error.message);
      console.error('❌ Code:', error.code);
      // NE PAS faire de fallback localStorage - forcer l'erreur
      throw error;
    }
  },

  search: async (query) => {
    try {
      if (useSupabase) {
        return await supabaseSongService.search(query);
      }
    } catch (error) {
      console.error('Erro ao pesquisar músicas:', error);
      return [];
    }
  },

  getByStatus: async (status) => {
    try {
      if (useSupabase) {
        return await supabaseSongService.getByStatus(status);
      }
    } catch (error) {
      console.error('Erro ao carregar músicas por status:', error);
      return [];
    }
  },

  getByMonth: async (year, month) => {
    try {
      if (useSupabase) {
        return await supabaseSongService.getByMonth(year, month);
      }
    } catch (error) {
      console.error('Erro ao carregar músicas por mês:', error);
      return [];
    }
  },

  getBySlug: async (slug) => {
    try {
      if (useSupabase) {
        // ✅ OPTIMISÉ : Requête directe par slug au lieu de charger toute la table
        const song = await supabaseSongService.getBySlug(slug);
        return song || null;
      }
    } catch (error) {
      console.error('Erro ao carregar música por slug:', error);
      return null;
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