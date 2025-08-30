/**
 * Migration pour nettoyer le localStorage et forcer l'utilisation de Supabase
 * Problème : "Confissões Bancárias" cause des bugs TikTok car chargée depuis localStorage
 * Solution : Supprimer cette chanson du localStorage et forcer l'utilisation de Supabase
 */

const MIGRATION_VERSION = 'v1.0.0';
const MIGRATION_KEY = 'migration_confissoes_bancarias_cleanup';

export const migrationService = {
  /**
   * Vérifier si la migration a déjà été effectuée
   */
  isCompleted() {
    return localStorage.getItem(MIGRATION_KEY) === MIGRATION_VERSION;
  },

  /**
   * Marquer la migration comme terminée
   */
  markCompleted() {
    localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
    console.log('✅ Migration Confissões Bancárias terminée');
  },

  /**
   * Exécuter la migration
   */
  async execute() {
    if (this.isCompleted()) {
      console.log('🔄 Migration déjà effectuée, passage...');
      return;
    }

    console.log('🚀 Début de la migration Confissões Bancárias...');

    try {
      // 1. Supprimer "Confissões Bancárias" du localStorage
      this.cleanConfissoesBancarias();
      
      // 2. Forcer la synchronisation avec Supabase
      await this.forceSupabaseSync();
      
      // 3. Marquer la migration comme terminée
      this.markCompleted();
      
      console.log('🎉 Migration terminée avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      throw error;
    }
  },

  /**
   * Nettoyer "Confissões Bancárias" du localStorage
   */
  cleanConfissoesBancarias() {
    try {
      const songs = JSON.parse(localStorage.getItem('songs') || '[]');
      
      // Filtrer pour supprimer "Confissões Bancárias"
      const cleanedSongs = songs.filter(song => 
        song.title !== 'Confissões Bancárias' && 
        song.tiktok_video_id !== '7540762684149517590'
      );
      
      // Renuméroter les IDs pour éviter les conflits
      const renumberedSongs = cleanedSongs.map((song, index) => ({
        ...song,
        id: index + 1
      }));
      
      // Sauvegarder le localStorage nettoyé
      localStorage.setItem('songs', JSON.stringify(renumberedSongs));
      
      console.log(`🧹 localStorage nettoyé : ${songs.length - renumberedSongs.length} chanson(s) supprimée(s)`);
      console.log(`📝 ${renumberedSongs.length} chanson(s) conservée(s) et renumérotée(s)`);
      
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage du localStorage:', error);
      throw error;
    }
  },

  /**
   * Forcer la synchronisation avec Supabase
   */
  async forceSupabaseSync() {
    try {
      // Marquer que Supabase doit être utilisé en priorité
      localStorage.setItem('force_supabase_sync', 'true');
      localStorage.setItem('last_supabase_sync', new Date().toISOString());
      
      console.log('🔄 Synchronisation Supabase forcée');
      
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation Supabase:', error);
      throw error;
    }
  },

  /**
   * Vérifier l'état de la migration
   */
  getStatus() {
    return {
      completed: this.isCompleted(),
      version: MIGRATION_VERSION,
      lastSync: localStorage.getItem('last_supabase_sync'),
      forceSupabase: localStorage.getItem('force_supabase_sync') === 'true'
    };
  },

  /**
   * Réinitialiser la migration (pour tests)
   */
  reset() {
    localStorage.removeItem(MIGRATION_KEY);
    localStorage.removeItem('force_supabase_sync');
    localStorage.removeItem('last_supabase_sync');
    console.log('🔄 Migration réinitialisée');
  }
};

export default migrationService;
