/**
 * Export songs from Supabase to content/songs.json for SEO stub generation
 * Usage: node scripts/export-songs-from-supabase.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const path = require('path');

// Charger les variables d'environnement depuis .env
require('dotenv').config();

// Public, RLS-protected publishable key. Mirrors src/lib/supabase.js fallback
// so CI can still pull fresh Supabase data even when the GitHub secret holds
// the rotated-out legacy JWT.
const PUBLISHABLE_KEY_FALLBACK = 'sb_publishable_qQqLLFjAv4sk3z2eQW0-sA_59XCpAKF';
const SUPABASE_URL_FALLBACK = 'https://efnzmpzkzeuktqkghwfa.supabase.co';

const envUrl = process.env.VITE_SUPABASE_URL;
const envKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = envUrl || SUPABASE_URL_FALLBACK;
const supabaseAnonKey = (envKey && !envKey.startsWith('eyJ'))
  ? envKey
  : PUBLISHABLE_KEY_FALLBACK;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function exportSongs() {
  try {
    console.log('🔄 Récupération des chansons depuis Supabase...');
    
    // Récupérer toutes les chansons publiées, triées par date de sortie
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*')
      .eq('status', 'published')
      .order('release_date', { ascending: false });

    if (error) {
      throw error;
    }

    if (!songs || songs.length === 0) {
      console.warn('⚠️ Aucune chanson trouvée dans Supabase');
      return;
    }

    console.log(`✅ ${songs.length} chansons récupérées depuis Supabase`);

    // Fonction pour générer un slug depuis un titre
    function generateSlug(title) {
      if (!title) return '';
      return title
        .toLowerCase()
        .trim()
        // Remplacer les caractères accentués
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        // Remplacer les espaces et caractères spéciaux par des tirets
        .replace(/[^a-z0-9]+/g, '-')
        // Supprimer les tirets multiples
        .replace(/-+/g, '-')
        // Supprimer les tirets en début/fin
        .replace(/^-|-$/g, '');
    }
    
    // Transformer les données Supabase vers le format attendu par generate-stubs
    const songsFormatted = songs
      .map(song => {
        // Utiliser le slug de la BDD OU générer un slug depuis le titre
        const slug = (song.slug && song.slug.trim()) ? song.slug : generateSlug(song.title);
        
        if (!slug) {
          console.warn(`⚠️  Chanson "${song.title}" ignorée (impossible de générer un slug)`);
          return null;
        }
        
        return {
          slug: slug,
          name: song.title,
          datePublished: song.release_date,
          image: song.cover_image || '/icons/icon-512x512.png',
          audioUrl: song.spotify_url || song.youtube_url || '',
          duration: song.duration || 'PT3M',
          inLanguage: 'pt-BR',
          byArtist: {
            name: song.artist || 'A Música da Segunda',
            url: 'https://www.amusicadasegunda.com'
          },
          // ✅ URLs YouTube pour VideoObject JSON-LD dans les stubs
          youtube_music_url: song.youtube_music_url || null,
          youtube_url: song.youtube_url || null,
          description: song.description || null,
          lyrics: song.lyrics || null,
          subtitle: song.subtitle || null,
          category: song.category || null
        };
      })
      .filter(song => song !== null); // Retirer les chansons sans slug
    
    console.log(`ℹ️  ${songs.length - songsFormatted.length} chansons ignorées (sans slug générable)`);

    // Créer le dossier content/ s'il n'existe pas
    const contentDir = path.resolve('content');
    await fs.ensureDir(contentDir);

    // Écrire le fichier JSON
    const outputPath = path.join(contentDir, 'songs.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(songsFormatted, null, 2),
      'utf8'
    );

    console.log(`✅ ${songsFormatted.length} chansons exportées vers: ${outputPath}`);
    console.log('📋 Slugs exportés:', songsFormatted.map(s => s.slug).slice(0, 5).join(', '), '...');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error.message);
    console.warn('⚠️  Le build continuera avec les données existantes de content/songs.json');
    
    // Vérifier si content/songs.json existe
    const outputPath = path.join(path.resolve('content'), 'songs.json');
    if (fs.existsSync(outputPath)) {
      console.log('ℹ️  Fichier content/songs.json existant trouvé, le build peut continuer');
      process.exit(0); // Exit sans erreur pour ne pas bloquer le build
    } else {
      console.error('❌ CRITIQUE: Aucun fichier content/songs.json existant trouvé');
      console.error('💡 Solution: Corrige la connexion Supabase et relance npm run export:songs');
      process.exit(1); // Exit avec erreur car on ne peut pas générer les stubs
    }
  }
}

// Exécuter l'export
exportSongs();
