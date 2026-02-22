import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { extractYouTubeId as extractYouTubeIdFromUtils, titleToSlug } from '@/lib/utils'

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

// Assume slug column exists by default.
// Set VITE_SUPABASE_HAS_SLUG=false only for legacy instances before migration.
let slugColumnSupported = import.meta.env?.VITE_SUPABASE_HAS_SLUG !== 'false'

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
      if (!slug || typeof slug !== 'string') return null

      if (slugColumnSupported) {
        const { data: slugMatch, error: slugError } = await supabase
          .from(TABLES.SONGS)
          .select('*')
          .eq('status', 'published')
          .eq('slug', slug)
          .maybeSingle()

        if (slugError) {
          const missingSlugColumn =
            slugError.code === '42703' ||
            /column .*slug.* does not exist/i.test(slugError.message || '')

          if (missingSlugColumn) {
            slugColumnSupported = false
            logger.debug('Colonne slug absente dans Supabase, fallback title->slug active')
          } else {
            throw slugError
          }
        } else if (slugMatch) {
          return slugMatch
        }
      }

      // Fallback sans full-table scan: cible des candidats de titre puis match de slug en JS.
      const titleCandidate = slug.replace(/-/g, ' ').trim()
      if (!titleCandidate) return null

      const { data: candidateSongs, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('status', 'published')
        .ilike('title', `%${titleCandidate}%`)
        .limit(12)

      if (error) throw error

      const song = candidateSongs?.find((s) => titleToSlug(s?.title) === slug)
      return song || null
    } catch (error) {
      handleSupabaseError(error, `Recuperation chanson slug ${slug}`)
      return null
    }
  },


  // Récupérer la chanson actuelle (la plus récente enregistrée dans Supabase)
  async getCurrent() {
    try {
      logger.debug('🔍 getCurrent() - Début de la fonction');
      logger.debug('🔍 Timestamp:', new Date().toISOString());
      
      // Forcer une requête fraîche - Supabase n'a pas de cache par défaut mais on s'assure
      // IMPORTANT: Supabase ne supporte qu'un seul .order() à la fois
      // On doit utiliser created_at comme critère principal car c'est la date d'enregistrement dans Supabase
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('status', 'published')
        // Trier UNIQUEMENT par created_at (date d'enregistrement dans Supabase) pour obtenir la dernière vidéo enregistrée
        // C'est le critère le plus fiable pour déterminer la "dernière" chanson
        .order('created_at', { ascending: false })
        .limit(1)
        .single(); // Utiliser .single() pour obtenir un objet unique ou null, plus propre que .limit(1)

      if (error) {
        // Gérer le cas où .single() ne trouve rien sans que ce soit une erreur bloquante
        if (error.code === 'PGRST116') {
          logger.debug('⚠️ Aucune chanson "published" trouvée, ce n\'est pas une erreur.');
          return null;
        }
        logger.error('❌ Erreur Supabase getCurrent:', error);
        throw error;
      }
      
      logger.debug('📊 Chanson actuelle trouvée:', data || null);

      if (!data) {
        logger.debug('⚠️ Aucune chanson published trouvée');
        return null;
      }

      const result = data;
      logger.debug('🎯 Chanson sélectionnée:', result);
      
      // Logs détaillés pour debug production
      logger.debug('🔍 DEBUG getCurrent - Tri appliqué:');
      logger.debug('  - Titre:', result?.title);
      logger.debug('  - created_at:', result?.created_at);
      logger.debug('  - updated_at:', result?.updated_at);
      logger.debug('  - release_date:', result?.release_date);
      logger.debug('  - Status:', result?.status);
      
      return result;
    } catch (error) {
      logger.error('❌ Erreur dans getCurrent:', error);
      handleSupabaseError(error, 'Chanson actuelle')
      return null
    }
  },

  // Extraire l'ID YouTube depuis une URL
  extractYouTubeId(url) {
    return extractYouTubeIdFromUtils(url);
  },

  // Normaliser une URL YouTube pour la comparaison (enlever les paramètres si, etc.)
  normalizeYouTubeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    const trimmed = url.trim();
    if (!trimmed) return null;
    
    // Extraire l'ID ou la partie principale de l'URL
    // Pour les playlists : garder la partie list=...
    // Pour les vidéos : extraire l'ID vidéo
    // Pour les shorts : extraire l'ID
    
    // YouTube Shorts : https://youtube.com/shorts/VIDEO_ID?si=...
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shortsMatch) {
      return `https://youtube.com/shorts/${shortsMatch[1]}`;
    }
    
    // YouTube Music playlist : garder la partie list=
    const playlistMatch = trimmed.match(/(music\.youtube\.com\/playlist\?list=[A-Za-z0-9_-]+)/);
    if (playlistMatch) {
      return `https://${playlistMatch[1]}`;
    }
    
    // YouTube Music watch : extraire l'ID vidéo
    const musicWatchMatch = trimmed.match(/music\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/);
    if (musicWatchMatch) {
      return `https://music.youtube.com/watch?v=${musicWatchMatch[1]}`;
    }
    
    // YouTube normal watch : extraire l'ID vidéo
    const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (watchMatch) {
      return `https://youtube.com/watch?v=${watchMatch[1]}`;
    }
    
    // Si on ne peut pas normaliser, retourner l'URL originale sans paramètres
    try {
      const urlObj = new URL(trimmed);
      // Reconstruire l'URL sans les paramètres si, feature, etc.
      const cleanParams = new URLSearchParams();
      if (urlObj.searchParams.has('v')) {
        cleanParams.set('v', urlObj.searchParams.get('v'));
      }
      if (urlObj.searchParams.has('list')) {
        cleanParams.set('list', urlObj.searchParams.get('list'));
      }
      return `${urlObj.origin}${urlObj.pathname}${cleanParams.toString() ? '?' + cleanParams.toString() : ''}`;
    } catch {
      return trimmed;
    }
  },

  // Trouver une chanson par son youtube_url
  async getByYouTubeUrl(youtubeUrl) {
    try {
      if (!youtubeUrl || !youtubeUrl.trim()) {
        return null;
      }

      const originalUrl = youtubeUrl.trim();
      const normalizedUrl = this.normalizeYouTubeUrl(originalUrl);
      const videoId = this.extractYouTubeId(originalUrl);
      
      logger.debug('🔍 Recherche YouTube URL:', { originalUrl, normalizedUrl, videoId });
      
      // Méthode 1: Chercher avec l'URL originale exacte
      let { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('youtube_url', originalUrl)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logger.error('❌ Erreur recherche par youtube_url (original):', error);
      }

      // Méthode 2: Si pas trouvé, chercher avec l'URL normalisée
      if (!data && normalizedUrl && normalizedUrl !== originalUrl) {
        const { data: data2, error: error2 } = await supabase
          .from(TABLES.SONGS)
          .select('*')
          .eq('youtube_url', normalizedUrl)
          .maybeSingle();
        
        if (error2 && error2.code !== 'PGRST116') {
          logger.error('❌ Erreur recherche par youtube_url (normalisée):', error2);
        } else if (data2) {
          data = data2;
        }
      }

      // Méthode 3: Si toujours pas trouvé et qu'on a un videoId, chercher toutes les chansons et comparer les IDs
      if (!data && videoId) {
        const { data: allSongs, error: error3 } = await supabase
          .from(TABLES.SONGS)
          .select('*')
          .not('youtube_url', 'is', null);
        
        if (!error3 && allSongs && allSongs.length > 0) {
          const found = allSongs.find(song => {
            if (!song.youtube_url) return false;
            const songVideoId = this.extractYouTubeId(song.youtube_url);
            return songVideoId === videoId;
          });
          if (found) {
            logger.debug('✅ Chanson trouvée par ID vidéo:', found.title);
            data = found;
          }
        }
      }

      // Méthode 4: Recherche partielle (contient l'URL)
      if (!data) {
        const { data: partialMatches, error: error4 } = await supabase
          .from(TABLES.SONGS)
          .select('*')
          .ilike('youtube_url', `%${videoId || originalUrl.split('/').pop()}%`);
        
        if (!error4 && partialMatches && partialMatches.length > 0) {
          // Vérifier que c'est vraiment la même vidéo
          const found = partialMatches.find(song => {
            if (!song.youtube_url) return false;
            const songVideoId = this.extractYouTubeId(song.youtube_url);
            return songVideoId === videoId;
          });
          if (found) {
            logger.debug('✅ Chanson trouvée par recherche partielle:', found.title);
            data = found;
          }
        }
      }

      return data || null;
    } catch (error) {
      logger.error('❌ Exception recherche par youtube_url:', error);
      return null;
    }
  },

  // Trouver une chanson par son tiktok_video_id (déprécié, gardé pour compatibilité)
  async getByTikTokId(tiktokVideoId) {
    try {
      if (!tiktokVideoId || !tiktokVideoId.trim()) {
        return null;
      }

      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .select('*')
        .eq('tiktok_video_id', tiktokVideoId.trim())
        .maybeSingle();

      if (error) {
        logger.error('❌ Erreur recherche par tiktok_video_id:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ Exception recherche par tiktok_video_id:', error);
      return null;
    }
  },

  // Créer une nouvelle chanson
  async create(songData) {
    try {
      let normalizedUrl = null;
      
      // Vérifier d'abord que l'utilisateur est bien authentifié et admin
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const authError = new Error('❌ Vous devez être connecté pour créer une chanson');
        authError.code = 'NOT_AUTHENTICATED';
        throw authError;
      }

      // Vérifier que l'utilisateur est admin avant d'essayer d'insérer
      const { data: adminCheck, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (adminError) {
        logger.error('❌ Erreur vérification admin avant insertion:', adminError);
        const adminCheckError = new Error('❌ Erreur lors de la vérification des droits admin');
        adminCheckError.code = 'ADMIN_CHECK_FAILED';
        adminCheckError.originalError = adminError;
        throw adminCheckError;
      }

      if (!adminCheck) {
        const notAdminError = new Error('❌ Vous n\'avez pas les droits administrateur pour créer une chanson');
        notAdminError.code = 'NOT_ADMIN';
        throw notAdminError;
      }

      logger.debug('✅ Vérification admin OK, vérification des doublons...');

      // Vérifier les doublons AVANT l'insertion (en tant qu'admin, on peut voir toutes les chansons)
      // normalizedUrl est déjà déclaré plus haut
      
      // Vérifier si un youtube_url est fourni et s'il existe déjà
      if (songData.youtube_url && songData.youtube_url.trim()) {
        // Normaliser l'URL pour la comparaison
        normalizedUrl = this.normalizeYouTubeUrl(songData.youtube_url.trim());
        
        // Chercher avec l'URL originale (en tant qu'admin, on peut voir toutes les chansons)
        let existingSong = await this.getByYouTubeUrl(songData.youtube_url.trim());
        
        // Si pas trouvé, chercher avec l'URL normalisée
        if (!existingSong && normalizedUrl && normalizedUrl !== songData.youtube_url.trim()) {
          const { data: existingByNormalized, error: searchError } = await supabase
            .from(TABLES.SONGS)
            .select('*')
            .eq('youtube_url', normalizedUrl)
            .maybeSingle();
          
          if (searchError && searchError.code !== 'PGRST116') {
            logger.debug('⚠️ Erreur lors de la recherche de doublon (normalisée):', searchError);
          } else if (existingByNormalized) {
            existingSong = existingByNormalized;
          }
        }
        
        // Si toujours pas trouvé, chercher par ID vidéo extrait
        if (!existingSong) {
          const videoId = this.extractYouTubeId(songData.youtube_url.trim());
          if (videoId) {
            const { data: allSongs, error: allSongsError } = await supabase
              .from(TABLES.SONGS)
              .select('*')
              .not('youtube_url', 'is', null);
            
            if (allSongsError) {
              logger.debug('⚠️ Erreur lors de la recherche de toutes les chansons:', allSongsError);
            } else if (allSongs) {
              existingSong = allSongs.find(song => {
                if (!song.youtube_url) return false;
                const songVideoId = this.extractYouTubeId(song.youtube_url);
                return songVideoId === videoId;
              });
            }
          }
        }
        
        if (existingSong) {
          const error = new Error(`Une chanson avec cette URL YouTube existe déjà : "${existingSong.title}" (ID: ${existingSong.id})`);
          error.code = 'DUPLICATE_YOUTUBE_URL';
          error.existingSong = existingSong;
          throw error;
        }
      }
      
      // Vérifier aussi tiktok_video_id pour compatibilité (déprécié)
      if (songData.tiktok_video_id && songData.tiktok_video_id.trim()) {
        const existingSong = await this.getByTikTokId(songData.tiktok_video_id.trim());
        if (existingSong) {
          const error = new Error(`Une chanson avec cet ID TikTok existe déjà : "${existingSong.title}" (ID: ${existingSong.id})`);
          error.code = 'DUPLICATE_TIKTOK_ID';
          error.existingSong = existingSong;
          throw error;
        }
      }

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

      logger.debug('✅ Vérification des doublons OK, insertion de la chanson...');

      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .insert([cleanData])
        .select()
        .single()

      if (error) {
        // Gérer spécifiquement les erreurs de permission (RLS)
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('new row violates row-level security') || error.message?.includes('row-level security')) {
          logger.error('❌ ERREUR PERMISSION RLS:', error);
          logger.error('❌ Code:', error.code);
          logger.error('❌ Message:', error.message);
          logger.error('❌ Détails:', error.details);
          logger.error('❌ Hint:', error.hint);
          logger.error('❌ User ID:', session.user.id);
          logger.error('❌ Admin check result:', adminCheck);
          
          const permissionError = new Error('❌ Erreur de permission RLS : La policy RLS bloque l\'insertion. Vérifiez que la policy "Allow admins full access" ou "songs_admin_full_access" a bien une clause WITH CHECK qui vérifie la table admins. Exécutez le script supabase/scripts/fix_songs_rls_complete.sql dans Supabase SQL Editor.');
          permissionError.code = 'PERMISSION_DENIED';
          permissionError.originalError = error;
          throw permissionError;
        }
        
        // Gérer spécifiquement l'erreur de duplicate key (23505)
        // Cette erreur peut se produire si une contrainte UNIQUE dans la base bloque l'insertion
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          logger.debug('⚠️ Erreur duplicate key détectée, recherche de la chanson existante...');
          
          // Extraire le champ en conflit depuis le message d'erreur
          const conflictField = error.message?.match(/Key \(([^)]+)\)/)?.[1] || 'unknown';
          logger.debug('⚠️ Champ en conflit:', conflictField);
          
          let existingSong = null;
          let errorCode = 'DUPLICATE_KEY';
          
          // Essayer de trouver la chanson existante
          // Si c'est youtube_url qui est en conflit
          if (conflictField.includes('youtube') || cleanData.youtube_url) {
            existingSong = await this.getByYouTubeUrl(cleanData.youtube_url || '');
            if (existingSong) {
              errorCode = 'DUPLICATE_YOUTUBE_URL';
            }
          }
          
          // Si c'est tiktok_video_id qui est en conflit
          if (!existingSong && (conflictField.includes('tiktok') || cleanData.tiktok_video_id)) {
            existingSong = await this.getByTikTokId(cleanData.tiktok_video_id || '');
            if (existingSong) {
              errorCode = 'DUPLICATE_TIKTOK_ID';
            }
          }
          
          // Si on a trouvé la chanson existante
          if (existingSong) {
            const platform = errorCode === 'DUPLICATE_YOUTUBE_URL' ? 'URL YouTube' : 'ID TikTok';
            const duplicateError = new Error(`Une chanson avec cette ${platform} existe déjà : "${existingSong.title}" (ID: ${existingSong.id})`);
            duplicateError.code = errorCode;
            duplicateError.existingSong = existingSong;
            throw duplicateError;
          }
          
          // Si on n'a pas trouvé mais qu'il y a une erreur de duplicate key
          // C'est probablement une contrainte UNIQUE sur un autre champ
          const duplicateError = new Error(`Une contrainte d'unicité empêche la création de cette chanson. Vérifiez que l'URL YouTube ou l'ID TikTok n'existe pas déjà.`);
          duplicateError.code = 'DUPLICATE_KEY';
          duplicateError.originalError = error;
          duplicateError.conflictField = conflictField;
          throw duplicateError;
        }
        throw error;
      }

      logger.debug('✅ Chanson créée avec succès:', data)
      return data
    } catch (error) {
      // Ne pas appeler handleSupabaseError si c'est déjà notre erreur personnalisée
      if (error.code !== 'DUPLICATE_TIKTOK_ID' && error.code !== 'DUPLICATE_YOUTUBE_URL') {
        handleSupabaseError(error, 'Création chanson')
      }
      throw error
    }
  },

  // Mettre à jour une chanson
  async update(id, updates) {
    try {
      logger.debug('🔄 supabaseSongService.update - début');
      logger.debug('🔄 ID reçu:', id, 'Type:', typeof id);
      logger.debug('🔄 Updates reçus:', JSON.stringify(updates, null, 2));
      
      // Nettoyer les données de mise à jour
      const cleanUpdates = {}
      Object.keys(updates).forEach(key => {
        // Ne pas inclure l'ID et les champs système dans les updates
        if (key === 'id' || key === 'created_at' || key === 'updated_at') {
          return
        }
        // Inclure tous les champs (même null ou chaînes vides) pour permettre la mise à null
        // Mais convertir les chaînes vides en null pour les champs optionnels
        if (updates[key] !== undefined) {
          if (key === 'hashtags') {
            cleanUpdates[key] = Array.isArray(updates[key]) ? updates[key] : []
          } else if (key === 'tiktok_video_id' || key === 'tiktok_url') {
            // Convertir les chaînes vides en null pour les champs TikTok
            cleanUpdates[key] = (updates[key]?.trim() || null);
          } else {
            cleanUpdates[key] = updates[key]
          }
        }
      })

      logger.debug('🔄 Updates nettoyés:', JSON.stringify(cleanUpdates, null, 2));

      // Récupérer la chanson actuelle pour comparer les valeurs
      const currentSong = await this.get(id);
      if (!currentSong) {
        throw new Error(`Chanson avec l'ID ${id} introuvable`);
      }

      // Vérifier les doublons AVANT la mise à jour (seulement si la valeur change et n'est pas vide)
      // Vérifier tiktok_video_id
      if (cleanUpdates.tiktok_video_id !== undefined) {
        // Normaliser : convertir chaînes vides en null
        const newTikTokId = cleanUpdates.tiktok_video_id?.trim() || null;
        const currentTikTokId = currentSong.tiktok_video_id?.trim() || null;
        
        // Ne vérifier que si :
        // 1. La nouvelle valeur n'est pas vide/null
        // 2. La valeur change réellement
        if (newTikTokId && newTikTokId !== currentTikTokId) {
          const existingSong = await this.getByTikTokId(newTikTokId);
          // Comparer les IDs en les convertissant en nombres pour éviter les problèmes de type
          const existingId = existingSong ? Number(existingSong.id) : null;
          const currentId = Number(id);
          
          if (existingSong && existingId !== currentId) {
            const error = new Error(`Une chanson avec cet ID TikTok existe déjà : "${existingSong.title}" (ID: ${existingSong.id})`);
            error.code = 'DUPLICATE_TIKTOK_ID';
            error.existingSong = existingSong;
            throw error;
          }
        }
        // Si la nouvelle valeur est vide/null, ne pas vérifier les doublons (on peut mettre à null)
      }

      // Vérifier youtube_url
      if (cleanUpdates.youtube_url !== undefined) {
        const newYouTubeUrl = cleanUpdates.youtube_url?.trim() || null;
        const currentYouTubeUrl = currentSong.youtube_url?.trim() || null;
        
        // Ne vérifier que si la valeur change
        if (newYouTubeUrl && newYouTubeUrl !== currentYouTubeUrl) {
          const existingSong = await this.getByYouTubeUrl(newYouTubeUrl);
          // Comparer les IDs en les convertissant en nombres pour éviter les problèmes de type
          const existingId = existingSong ? Number(existingSong.id) : null;
          const currentId = Number(id);
          
          if (existingSong && existingId !== currentId) {
            const error = new Error(`Une chanson avec cette URL YouTube existe déjà : "${existingSong.title}" (ID: ${existingSong.id})`);
            error.code = 'DUPLICATE_YOUTUBE_URL';
            error.existingSong = existingSong;
            throw error;
          }
        }
      }

      // Requête avec .select().single() pour forcer un retour cohérent
      const { data, error } = await supabase
        .from(TABLES.SONGS)
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single()

      logger.debug('[Supabase][UPDATE] id=', id, 'payload=', cleanUpdates);
      logger.debug('🔄 Réponse Supabase:', JSON.stringify({ data, error }, null, 2));

      if (error) {
        logger.error('[Supabase][UPDATE][ERROR]', error);
        logger.error('❌ Erreur Supabase:', error.message, '\nCode:', error.code, '\nDetails:', error.details, '\nHint:', error.hint, '\nStack:', error.stack);
        
        // Gérer spécifiquement les erreurs de permission RLS
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
          const permissionError = new Error('❌ Erreur de permission : Vous n\'avez pas les droits de mise à jour sur la table songs. Vérifiez que vous êtes bien connecté en tant qu\'admin et que les RLS policies sont correctement configurées.');
          permissionError.code = 'PERMISSION_DENIED';
          permissionError.originalError = error;
          throw permissionError;
        }
        
        // Gérer spécifiquement l'erreur de duplicate key (23505)
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          logger.debug('⚠️ Erreur duplicate key détectée lors de la mise à jour');
          
          // Extraire le champ en conflit depuis le message d'erreur
          const conflictField = error.message?.match(/Key \(([^)]+)\)/)?.[1] || 'unknown';
          logger.debug('⚠️ Champ en conflit:', conflictField);
          
          let existingSong = null;
          let errorCode = 'DUPLICATE_KEY';
          
          // Essayer de trouver la chanson existante
          if (conflictField.includes('tiktok') || cleanUpdates.tiktok_video_id) {
            existingSong = await this.getByTikTokId(cleanUpdates.tiktok_video_id || '');
            if (existingSong && existingSong.id !== id) {
              errorCode = 'DUPLICATE_TIKTOK_ID';
            }
          }
          
          if (!existingSong && (conflictField.includes('youtube') || cleanUpdates.youtube_url)) {
            existingSong = await this.getByYouTubeUrl(cleanUpdates.youtube_url || '');
            if (existingSong && existingSong.id !== id) {
              errorCode = 'DUPLICATE_YOUTUBE_URL';
            }
          }
          
          // Si on a trouvé la chanson existante
          if (existingSong) {
            const platform = errorCode === 'DUPLICATE_YOUTUBE_URL' ? 'URL YouTube' : 'ID TikTok';
            const duplicateError = new Error(`Une chanson avec cette ${platform} existe déjà : "${existingSong.title}" (ID: ${existingSong.id})`);
            duplicateError.code = errorCode;
            duplicateError.existingSong = existingSong;
            throw duplicateError;
          }
          
          // Si on n'a pas trouvé mais qu'il y a une erreur de duplicate key
          const duplicateError = new Error(`Une contrainte d'unicité empêche la mise à jour de cette chanson. Vérifiez que l'URL YouTube ou l'ID TikTok n'existe pas déjà dans une autre chanson.`);
          duplicateError.code = 'DUPLICATE_KEY';
          duplicateError.originalError = error;
          duplicateError.conflictField = conflictField;
          throw duplicateError;
        }
        
        throw new Error(error.message || 'Update failed');
      }

      logger.debug('✅ Chanson mise à jour avec succès:', data)
      return data
    } catch (error) {
      logger.error('❌ Erreur dans supabaseSongService.update:', error);
      logger.error('❌ Détails de l\'erreur:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Gérer spécifiquement les erreurs de permission RLS
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
        const permissionError = new Error('❌ Erreur de permission : Vous n\'avez pas les droits de mise à jour sur la table songs. Vérifiez que vous êtes bien connecté en tant qu\'admin et que les RLS policies sont correctement configurées.');
        permissionError.code = 'PERMISSION_DENIED';
        permissionError.originalError = error;
        throw permissionError;
      }
      
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

      logger.debug('✅ Chanson supprimée avec succès ID:', id)
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
