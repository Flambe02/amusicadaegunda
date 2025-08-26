import { apiClient, handleApiError } from './base44Client';

// Enhanced Song entity with local API
export const Song = {
  // Enhanced list method with error handling
  list: async (orderBy = '-release_date', limit = 10) => {
    try {
      const songs = await apiClient.getSongs(orderBy, limit);
      return songs || [];
    } catch (error) {
      const errorMessage = handleApiError(error, 'carregar músicas');
      console.error('Erro ao carregar músicas:', error);
      
      // Return empty array as fallback
      return [];
    }
  },
  
  // Enhanced get method with error handling
  get: async (id) => {
    try {
      return await apiClient.getSong(id);
    } catch (error) {
      const errorMessage = handleApiError(error, 'carregar música');
      console.error('Erro ao carregar música:', error);
      return null;
    }
  }
};

export const AdventSong = {
  // Enhanced list method with error handling
  list: async (orderBy = '-release_date', limit = 25) => {
    try {
      const songs = await apiClient.getSongs(orderBy, limit);
      return songs || [];
    } catch (error) {
      const errorMessage = handleApiError(error, 'carregar músicas do advento');
      console.error('Erro ao carregar músicas do advento:', error);
      return [];
    }
  }
};

// No auth needed for public site
export const User = null;