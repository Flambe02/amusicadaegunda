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

  // Récupérer une chanson par slug (optimisé - requête directe)
  async getBySlug(slug) {
    try {
      // Essayer d'abord avec la colonne slug si elle existe
      let { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      // Si pas trouvé par slug, essayer par titre transformé
      // (fallback pour compatibilité avec anciens slugs calculés)
      if (!data && !error) {
        // Récupérer toutes les chansons et filtrer côté client pour le fallback
        // Note: Ce cas devrait être rare une fois que tous les slugs sont en BDD
        const { data: allSongs, error: listError } = await supabase
          .from(TABLES.SONGS)
          .select('*')
        
        if (listError) throw listError
        
        // Chercher par slug calculé depuis le titre
        data = allSongs?.find(s => {
          const titleSlug = s.title?.toLowerCase().replace(/\s+/g, '-')
          return s.slug === slug || titleSlug === slug
        }) || null
      }

      if (error) throw error
      return data || null
    } catch (error) {
      handleSupabaseError(error, `Récupération chanson slug ${slug}`)
      return null
    }
  },

  // Récupérer la chanson actuelle (la plus récente enregistrée dans Supabase)
  async getCurrent() {
    try {
      console.warn('🔍 getCurrent() - Début de la fonction');
      
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('status', 'published')
        // Trier par created_at (date d'enregistrement dans Supabase) pour obtenir la dernière vidéo enregistrée
        // Si plusieurs ont le même created_at, utiliser updated_at puis release_date comme critères secondaires
        .order('created_at', { ascending: false })
        .order('updated_at', { ascending: false })
        .order('release_date', { ascending: false })
        .limit(1)
        .single(); // Utiliser .single() pour obtenir un objet unique ou null, plus propre que .limit(1)

      if (error) {
        // Gérer le cas où .single() ne trouve rien sans que ce soit une erreur bloquante
        if (error.code === 'PGRST116') {
          console.warn('⚠️ Aucune chanson "published" trouvée, ce n\'est pas une erreur.');
          return null;
        }
        console.error('❌ Erreur Supabase getCurrent:', error);
        throw error;
      }
      
      console.warn('📊 Chanson actuelle trouvée:', data || null);

      if (!data) {
        console.warn('⚠️ Aucune chanson published trouvée');
        return null;
      }

      const result = data;
      console.warn('🎯 Chanson sélectionnée:', result);
      
      // Logs détaillés pour debug - FORCE
      console.warn('🔍 FORCE DEBUG getCurrent:');
      console.warn('  - youtube_url:', result?.youtube_url);
      console.warn('  - youtube_music_url:', result?.youtube_music_url);
      console.warn('  - typeof youtube_music_url:', typeof result?.youtube_music_url);
      console.warn('  - has_youtube_url:', !!result?.youtube_url);
      console.warn('  - has_youtube_music_url:', !!result?.youtube_music_url);
      console.warn('  - toutes les clés:', result ? Object.keys(result) : []);
      console.warn('  - youtube_music_url in keys?', result ? ('youtube_music_url' in result) : false);
      
      // Vérifier si youtube_music_url existe dans l'objet
      if (result && 'youtube_music_url' in result) {
        console.warn('✅ youtube_music_url existe dans l\'objet:', result.youtube_music_url);
      } else {
        console.warn('❌ youtube_music_url N\'EXISTE PAS dans l\'objet retourné par Supabase');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur dans getCurrent:', error);
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

      console.warn('✅ Chanson créée avec succès:', data)
      return data
    } catch (error) {
      handleSupabaseError(error, 'Création chanson')
      throw error
    }
  },

  // Mettre à jour une chanson
  async update(id, updates) {
    try {
      console.warn('🔄 supabaseSongService.update - début');
      console.warn('🔄 ID reçu:', id, 'Type:', typeof id);
      console.warn('🔄 Updates reçus:', JSON.stringify(updates, null, 2));
      
      // Nettoyer les données de mise à jour
      const cleanUpdates = {}
      Object.keys(updates).forEach(key => {
        // Ne pas inclure l'ID et les champs système dans les updates
        if (key === 'id' || key === 'created_at' || key === 'updated_at') {
          return
        }
        if (updates[key] !== undefined && updates[key] !== null) {
          if (key === 'hashtags' && !Array.isArray(updates[key])) {
            cleanUpdates[key] = []
          } else {
            cleanUpdates[key] = updates[key]
          }
        }
      })

      console.warn('🔄 Updates nettoyés:', JSON.stringify(cleanUpdates, null, 2));

      // Requête avec .select().single() pour forcer un retour cohérent
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single()

      console.warn('[Supabase][UPDATE] id=', id, 'payload=', cleanUpdates);
      console.warn('🔄 Réponse Supabase:', JSON.stringify({ data, error }, null, 2));

      if (error) {
        console.error('[Supabase][UPDATE][ERROR]', error);
        console.error('❌ Erreur Supabase:', error.message, '\nCode:', error.code, '\nDetails:', error.details, '\nHint:', error.hint, '\nStack:', error.stack);
        throw new Error(error.message || 'Update failed');
      }

      console.warn('✅ Chanson mise à jour avec succès:', data)
      return data
    } catch (error) {
      console.error('❌ Erreur dans supabaseSongService.update:', error);
      console.error('❌ Détails de l\'erreur:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
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

      console.warn('✅ Chanson supprimée avec succès ID:', id)
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
