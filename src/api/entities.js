import { localStorageService } from '@/lib/localStorage';
import { supabaseSongService } from './supabaseService';
import { checkConnection } from '@/lib/supabase';

// Logs de debug supprimés

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
      
      // Fallback localStorage avec avertissement
      console.warn('🔄 Fallback vers localStorage (Supabase a échoué)...');
      console.warn('⚠️ ATTENTION: La chanson sera sauvegardée UNIQUEMENT en local!');
      console.warn('⚠️ Elle ne sera PAS visible sur le site public tant que Supabase ne fonctionne pas!');
      
      try {
        const localResult = localStorageService.songs.create(songData);
        console.warn('✅ Chanson sauvegardée en localStorage:', localResult);
        console.warn('⚠️ RAPPEL: Cette chanson est LOCALE uniquement!');
        return localResult;
      } catch (localError) {
        console.error('❌ Fallback localStorage a aussi échoué:', localError);
        throw new Error(`Échec Supabase ET localStorage: ${error.message}`);
      }
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
        // ✅ OPTIMISÉ : Requête directe par slug au lieu de charger toute la table
        const song = await supabaseSongService.getBySlug(slug);
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