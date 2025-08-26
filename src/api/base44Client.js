// Simple API client without external dependencies
// For now, we'll use mock data until you set up your own backend

// Mock data structure for songs with real TikTok video
const mockSongs = [
  {
    id: '1',
    title: 'Confissões Bancárias',
    artist: 'A Música da Segunda',
    release_date: '2025-08-25T09:00:00.000Z', // 25 août 2025 - Lundi
    cover_image: 'https://via.placeholder.com/400x600/32a2dc/ffffff?text=Confissões+Bancárias',
    description: 'Nova música da segunda com muito humor sobre confissões bancárias! Uma dose semanal de descobertas musicais para começar sua semana com energia.',
    hashtags: ['humor', 'moraes', 'bancos', 'trendingsong', 'musica'],
    lyrics: 'Letra da música "Confissões Bancárias"...\n\nSegunda linha da letra...\n\nTerceira linha da letra...',
    tiktok_video_id: '7540762684149517590',
    tiktok_embed_id: '7540762684149517590',
    tiktok_url: 'https://www.tiktok.com/@amusicadasegunda/video/7540762684149517590',
    spotify_url: null,
    apple_music_url: null,
    youtube_url: null
  }
];

// Simple API client
export const apiClient = {
  // Simulate API delay
  delay: (ms = 500) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Get songs list
  async getSongs(orderBy = '-release_date', limit = 10) {
    await this.delay();
    return mockSongs.slice(0, limit);
  },
  
  // Get single song
  async getSong(id) {
    await this.delay();
    return mockSongs.find(song => song.id === id) || null;
  }
};

// Export for backward compatibility
export const base44 = {
  entities: {
    Song: {
      list: apiClient.getSongs.bind(apiClient),
      get: apiClient.getSong.bind(apiClient)
    },
    AdventSong: {
      list: apiClient.getSongs.bind(apiClient),
      get: apiClient.getSong.bind(apiClient)
    }
  },
  auth: null
};

// Helper function for error handling
export const handleApiError = (error, context = 'API call') => {
  console.error(`Erro em ${context}:`, error);
  
  // Return user-friendly error message
  if (error.message?.includes('network')) {
    return 'Erro de conexão. Verifique sua internet.';
  }
  if (error.message?.includes('unauthorized')) {
    return 'Acesso não autorizado.';
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
};
