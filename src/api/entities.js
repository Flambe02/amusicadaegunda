import { localStorageService } from '@/lib/localStorage';

export const Song = {
  list: async (orderBy = '-release_date', limit = 10) => {
    try {
      const songs = localStorageService.songs.getAll();
      // Trier par date de sortie (plus récente en premier)
      const sortedSongs = songs.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      return limit ? sortedSongs.slice(0, limit) : sortedSongs;
    } catch (error) {
      console.error('Erro ao carregar músicas:', error);
      return [];
    }
  },

  get: async (id) => {
    try {
      return localStorageService.songs.getById(id);
    } catch (error) {
      console.error('Erro ao carregar música:', error);
      return null;
    }
  },

  getCurrent: async () => {
    try {
      return localStorageService.songs.getCurrent();
    } catch (error) {
      console.error('Erro ao carregar música atual:', error);
      return null;
    }
  },

  create: async (songData) => {
    try {
      return localStorageService.songs.create(songData);
    } catch (error) {
      console.error('Erro ao criar música:', error);
      throw error;
    }
  },

  update: async (id, updates) => {
    try {
      return localStorageService.songs.update(id, updates);
    } catch (error) {
      console.error('Erro ao atualizar música:', error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      return localStorageService.songs.delete(id);
    } catch (error) {
      console.error('Erro ao deletar música:', error);
      throw error;
    }
  }
};

export const AdventSong = {
  list: async (orderBy = '-release_date', limit = 25) => {
    try {
      const songs = localStorageService.songs.getAll();
      const adventSongs = songs.filter(song => {
        const releaseDate = new Date(song.release_date);
        const month = releaseDate.getMonth();
        const day = releaseDate.getDate();
        return month === 11 || song.status === 'published';
      });
      
      // Trier par date de sortie
      const sortedSongs = adventSongs.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      return limit ? sortedSongs.slice(0, limit) : sortedSongs;
    } catch (error) {
      console.error('Erro ao carregar músicas do advento:', error);
      return [];
    }
  }
};

export const User = null;