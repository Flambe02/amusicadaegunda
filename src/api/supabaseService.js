import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase'

// Utilitaire pour parser le paramètre orderBy (ex: '-release_date' ou 'title')
const parseOrderBy = (orderBy) => {
  if (!orderBy || typeof orderBy !== 'string') {
    return { column: 'release_date', ascending: false }
  }
  let ascending = true
  let column = orderBy.trim()
  if (column.startsWith('-')) {
    ascending = false
    column = column.slice(1)
  } else if (column.startsWith('+')) {
    ascending = true
    column = column.slice(1)
  }
  // Sécurité: si colonne vide après trim, fallback
  if (!column) column = 'release_date'
  return { column, ascending }
}

// ===== SERVICE SUPABASE POUR LES CHANSONS =====
export const supabaseSongService = {
  // Récupérer toutes les chansons
  async list(orderBy = 'release_date', limit = null) {
    try {
      const { column, ascending } = parseOrderBy(orderBy)

      let query = supabase
        .from(TABLES.SONGS)
        .select('*')
        .order(column, { ascending })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query
      if (error) throw error

      return data || []
    } catch (error) {
      handleSupabaseError(error, 'Liste des chansons')
      return []
    }
  },

  // Récupérer une chanson par ID
  async get(id) {
    try {
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleSupabaseError(error, `Récupération chanson ID ${id}`)
      return null
    }
  },

  // Récupérer la chanson actuelle (la plus récente publiée)
  async getCurrent() {
    try {
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('status', 'published')
        .order('release_date', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleSupabaseError(error, 'Chanson actuelle')
      return null
    }
  },

  // Créer une nouvelle chanson
  async create(songData) {
    try {
      // Nettoyer et valider les données
      const cleanData = {
        title: songData.title?.trim(),
        artist: songData.artist?.trim() || 'A Música da Segunda',
        description: songData.description?.trim(),
        lyrics: songData.lyrics?.trim(),
        release_date: songData.release_date,
        status: songData.status || 'draft',
        tiktok_video_id: songData.tiktok_video_id?.trim(),
        tiktok_url: songData.tiktok_url?.trim(),
        tiktok_publication_date: songData.tiktok_publication_date,
        spotify_url: songData.spotify_url?.trim(),
        apple_music_url: songData.apple_music_url?.trim(),
        youtube_url: songData.youtube_url?.trim(),
        cover_image: songData.cover_image?.trim(),
        hashtags: Array.isArray(songData.hashtags) ? songData.hashtags : []
      }

      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .insert([cleanData])
        .select()
        .single()

      if (error) throw error

      console.log('✅ Chanson créée avec succès:', data)
      return data
    } catch (error) {
      handleSupabaseError(error, 'Création chanson')
      throw error
    }
  },

  // Mettre à jour une chanson
  async update(id, updates) {
    try {
      // Nettoyer les données de mise à jour
      const cleanUpdates = {}
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined && updates[key] !== null) {
          if (key === 'hashtags' && !Array.isArray(updates[key])) {
            cleanUpdates[key] = []
          } else {
            cleanUpdates[key] = updates[key]
          }
        }
      })

      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Chanson mise à jour avec succès:', data)
      return data
    } catch (error) {
      handleSupabaseError(error, `Mise à jour chanson ID ${id}`)
      throw error
    }
  },

  // Supprimer une chanson
  async delete(id) {
    try {
      const { error } = await supabase
        .from(TABLES.SONGS)
        .delete()
        .eq('id', id)

      if (error) throw error

      console.log('✅ Chanson supprimée avec succès ID:', id)
      return true
    } catch (error) {
      handleSupabaseError(error, `Suppression chanson ID ${id}`)
      throw error
    }
  },

  // Rechercher des chansons
  async search(query) {
    try {
      if (!query || query.trim() === '') {
        return await this.list()
      }

      const searchTerm = query.trim().toLowerCase()
      
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .or(`title.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('release_date', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      handleSupabaseError(error, 'Recherche chansons')
      return []
    }
  },

  // Récupérer les chansons par statut
  async getByStatus(status) {
    try {
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('status', status)
        .order('release_date', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      handleSupabaseError(error, `Chansons par statut: ${status}`)
      return []
    }
  },

  // Récupérer les chansons par mois
  async getByMonth(year, month) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`

      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .gte('release_date', startDate)
        .lte('release_date', endDate)
        .order('release_date', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      handleSupabaseError(error, `Chansons par mois ${month}/${year}`)
      return []
    }
  }
}

// ===== SERVICE SUPABASE POUR LES ALBUMS =====
export const supabaseAlbumService = {
  async list() {
    try {
      const { data, error } = await supabase
        .from(TABLES.ALBUMS)
        .select('*')
        .order('release_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      handleSupabaseError(error, 'Liste des albums')
      return []
    }
  },

  async create(albumData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.ALBUMS)
        .insert([albumData])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleSupabaseError(error, 'Création album')
      throw error
    }
  }
}

// ===== SERVICE SUPABASE POUR LES PARAMÈTRES =====
export const supabaseSettingsService = {
  async get(key) {
    try {
      const { data, error } = await supabase
        .from(TABLES.SETTINGS)
        .select('value')
        .eq('key', key)
        .single()

      if (error) throw error
      return data?.value
    } catch (error) {
      handleSupabaseError(error, `Paramètre ${key}`)
      return null
    }
  },

  async set(key, value) {
    try {
      const { data, error } = await supabase
        .from(TABLES.SETTINGS)
        .upsert([{ key, value }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleSupabaseError(error, `Paramètre ${key}`)
      throw error
    }
  }
}
