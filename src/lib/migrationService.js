const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
import { localStorageService } from './localStorage'
import { supabaseSongService, supabaseAlbumService, supabaseSettingsService } from '@/api/supabaseService'
import { checkConnection } from './supabase'

// ===== SERVICE DE MIGRATION LOCALSTORAGE → SUPABASE =====
export const migrationService = {
  // Vérifier si la migration est nécessaire
  async needsMigration() {
    try {
      // Vérifier la connexion Supabase
      const isConnected = await checkConnection()
      if (!isConnected) {
        isDev && console.log('❌ Pas de connexion Supabase, migration impossible')
        return false
      }

      // Vérifier s'il y a des données dans Supabase
      const supabaseSongs = await supabaseSongService.list()
      const localSongs = localStorageService.songs.getAll()

      // Migration nécessaire si :
      // 1. Supabase est vide ET localStorage a des données
      // 2. Supabase a moins de données que localStorage
      const needsMigration = localSongs.length > 0 && supabaseSongs.length < localSongs.length

      isDev && console.log(`📊 Migration nécessaire: ${needsMigration}`)
      isDev && console.log(`📱 localStorage: ${localSongs.length} chansons`)
      isDev && console.log(`☁️ Supabase: ${supabaseSongs.length} chansons`)

      return needsMigration
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de migration:', error)
      return false
    }
  },

  // Effectuer la migration complète
  async migrateAll() {
    try {
      isDev && console.log('🚀 Début de la migration localStorage → Supabase...')

      // Vérifier la connexion
      const isConnected = await checkConnection()
      if (!isConnected) {
        throw new Error('Pas de connexion Supabase')
      }

      // Récupérer toutes les données localStorage
      const localSongs = localStorageService.songs.getAll()
      const localAlbums = localStorageService.albums.getAll()

      isDev && console.log(`📱 Données à migrer: ${localSongs.length} chansons, ${localAlbums.length} albums`)

      // Migrer les chansons
      let migratedSongs = 0
      let failedSongs = 0

      for (const song of localSongs) {
        try {
          // Adapter le format localStorage vers Supabase
          const supabaseSong = {
            title: song.title,
            artist: song.artist,
            description: song.description,
            lyrics: song.lyrics,
            release_date: song.release_date,
            status: song.status,
            tiktok_video_id: song.tiktok_video_id,
            tiktok_url: song.tiktok_url,
            tiktok_publication_date: song.tiktok_publication_date || song.release_date,
            spotify_url: song.spotify_url,
            apple_music_url: song.apple_music_url,
            youtube_url: song.youtube_url,
            cover_image: song.cover_image,
            hashtags: Array.isArray(song.hashtags) ? song.hashtags : []
          }

          // Créer dans Supabase
          await supabaseSongService.create(supabaseSong)
          migratedSongs++
          isDev && console.log(`✅ Chanson migrée: ${song.title}`)

        } catch (error) {
          failedSongs++
          console.error(`❌ Échec migration chanson "${song.title}":`, error)
        }
      }

      // Migrer les albums
      let migratedAlbums = 0
      let failedAlbums = 0

      for (const album of localAlbums) {
        try {
          await supabaseAlbumService.create(album)
          migratedAlbums++
          isDev && console.log(`✅ Album migré: ${album.title}`)
        } catch (error) {
          failedAlbums++
          console.error(`❌ Échec migration album "${album.title}":`, error)
        }
      }

      // Sauvegarder les paramètres
      try {
        await supabaseSettingsService.set('migration_date', new Date().toISOString())
        await supabaseSettingsService.set('migration_source', 'localStorage')
        await supabaseSettingsService.set('migration_stats', JSON.stringify({
          songs: { total: localSongs.length, migrated: migratedSongs, failed: failedSongs },
          albums: { total: localAlbums.length, migrated: migratedAlbums, failed: failedAlbums },
          timestamp: new Date().toISOString()
        }))
      } catch (error) {
        console.error('⚠️ Erreur sauvegarde paramètres de migration:', error)
      }

      const result = {
        success: true,
        songs: { total: localSongs.length, migrated: migratedSongs, failed: failedSongs },
        albums: { total: localAlbums.length, migrated: migratedAlbums, failed: failedAlbums },
        timestamp: new Date().toISOString()
      }

      isDev && console.log('🎉 Migration terminée avec succès!', result)
      return result

    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error)
      throw error
    }
  },

  // Migrer seulement les nouvelles données
  async migrateNewData() {
    try {
      isDev && console.log('🔄 Migration des nouvelles données...')

      const localSongs = localStorageService.songs.getAll()
      const supabaseSongs = await supabaseSongService.list()

      // Identifier les nouvelles chansons (par tiktok_video_id)
      const existingTikTokIds = supabaseSongs.map(s => s.tiktok_video_id).filter(Boolean)
      const newSongs = localSongs.filter(song => 
        song.tiktok_video_id && !existingTikTokIds.includes(song.tiktok_video_id)
      )

      isDev && console.log(`🆕 Nouvelles chansons à migrer: ${newSongs.length}`)

      let migrated = 0
      for (const song of newSongs) {
        try {
          const supabaseSong = {
            title: song.title,
            artist: song.artist,
            description: song.description,
            lyrics: song.lyrics,
            release_date: song.release_date,
            status: song.status,
            tiktok_video_id: song.tiktok_video_id,
            tiktok_url: song.tiktok_url,
            tiktok_publication_date: song.tiktok_publication_date || song.release_date,
            spotify_url: song.spotify_url,
            apple_music_url: song.apple_music_url,
            youtube_url: song.youtube_url,
            cover_image: song.cover_image,
            hashtags: Array.isArray(song.hashtags) ? song.hashtags : []
          }

          await supabaseSongService.create(supabaseSong)
          migrated++
          isDev && console.log(`✅ Nouvelle chanson migrée: ${song.title}`)
        } catch (error) {
          console.error(`❌ Échec migration nouvelle chanson "${song.title}":`, error)
        }
      }

      return { success: true, migrated, total: newSongs.length }
    } catch (error) {
      console.error('❌ Erreur migration nouvelles données:', error)
      throw error
    }
  },

  // Vérifier l'intégrité des données migrées
  async verifyMigration() {
    try {
      const localSongs = localStorageService.songs.getAll()
      const supabaseSongs = await supabaseSongService.list()

      const localCount = localSongs.length
      const supabaseCount = supabaseSongs.length

      // Vérifier que toutes les chansons sont migrées
      const allMigrated = localCount === supabaseCount

      // Vérifier l'intégrité des données
      let integrityIssues = []
      
      for (const localSong of localSongs) {
        if (localSong.tiktok_video_id) {
          const supabaseSong = supabaseSongs.find(s => s.tiktok_video_id === localSong.tiktok_video_id)
          if (!supabaseSong) {
            integrityIssues.push(`Chanson manquante: ${localSong.title}`)
          } else {
            // Vérifier les champs critiques
            if (supabaseSong.title !== localSong.title) {
              integrityIssues.push(`Titre différent pour ${localSong.title}`)
            }
            if (supabaseSong.release_date !== localSong.release_date) {
              integrityIssues.push(`Date différente pour ${localSong.title}`)
            }
          }
        }
      }

      return {
        success: allMigrated && integrityIssues.length === 0,
        localCount,
        supabaseCount,
        allMigrated,
        integrityIssues,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ Erreur vérification migration:', error)
      throw error
    }
  },

  // Restaurer depuis Supabase (en cas de problème)
  async restoreFromSupabase() {
    try {
      isDev && console.log('🔄 Restauration depuis Supabase...')

      const supabaseSongs = await supabaseSongService.list()
      const supabaseAlbums = await supabaseAlbumService.list()

      // Restaurer dans localStorage
      localStorageService.clearAll()
      
      // Restaurer les chansons
      for (const song of supabaseSongs) {
        try {
          localStorageService.songs.create({
            title: song.title,
            artist: song.artist,
            description: song.description,
            lyrics: song.lyrics,
            release_date: song.release_date,
            status: song.status,
            tiktok_video_id: song.tiktok_video_id,
            tiktok_url: song.tiktok_url,
            tiktok_publication_date: song.tiktok_publication_date,
            spotify_url: song.spotify_url,
            apple_music_url: song.apple_music_url,
            youtube_url: song.youtube_url,
            cover_image: song.cover_image,
            hashtags: song.hashtags || []
          })
        } catch (error) {
          console.error(`❌ Erreur restauration chanson "${song.title}":`, error)
        }
      }

      // Restaurer les albums
      for (const album of supabaseAlbums) {
        try {
          localStorageService.albums.create(album)
        } catch (error) {
          console.error(`❌ Erreur restauration album "${album.title}":`, error)
        }
      }

      isDev && console.log('✅ Restauration terminée')
      return { success: true, songs: supabaseSongs.length, albums: supabaseAlbums.length }
    } catch (error) {
      console.error('❌ Erreur restauration:', error)
      throw error
    }
  }
}
