-- 🏗️ SCRIPT DE CRÉATION DES TABLES - Música da Segunda
-- Exécutez ce script APRÈS le nettoyage complet
-- Ce script crée la structure complète de la base

-- ===== 1. CRÉATION DES TABLES =====

-- Table SONGS (chansons)
CREATE TABLE songs (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL DEFAULT 'A Música da Segunda',
  description TEXT,
  lyrics TEXT,
  release_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  
  -- TikTok
  tiktok_video_id VARCHAR(50) UNIQUE,
  tiktok_url TEXT,
  tiktok_publication_date DATE,
  
  -- Streaming platforms
  spotify_url TEXT,
  apple_music_url TEXT,
  youtube_url TEXT,
  
  -- Metadata
  cover_image TEXT,
  hashtags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table ALBUMS
CREATE TABLE albums (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  description TEXT,
  release_date DATE,
  cover_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table SETTINGS (paramètres)
CREATE TABLE settings (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 2. CRÉATION DES INDEXES =====
CREATE INDEX idx_songs_release_date ON songs(release_date DESC);
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_tiktok_id ON songs(tiktok_video_id);
CREATE INDEX idx_songs_artist ON songs(artist);
CREATE INDEX idx_songs_hashtags ON songs USING GIN(hashtags);

-- ===== 3. CRÉATION DE LA FONCTION ET DES TRIGGERS =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer les triggers pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 4. INSÉRER LES DONNÉES PAR DÉFAUT =====
INSERT INTO songs (title, artist, description, lyrics, release_date, status, tiktok_video_id, tiktok_url, hashtags) VALUES
(
  'Confissões Bancárias',
  'A Música da Segunda',
  'Uma música sobre confissões bancárias e humor',
  'Confissões bancárias...\nNova música da segunda...',
  '2025-08-25',
  'published',
  '7540762684149517590',
  'https://www.tiktok.com/@amusicadasegunda/video/7540762684149517590',
  ARRAY['humor', 'moraes', 'bancos', 'trendingsong', 'musica']
);

-- ===== 5. CONFIGURER RLS (Row Level Security) =====
-- Activer RLS sur toutes les tables
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Créer les politiques de sécurité
CREATE POLICY "Chansons publiques visibles par tous" ON songs
  FOR SELECT USING (status = 'published');

CREATE POLICY "Gestion complète des chansons" ON songs
  FOR ALL USING (true);

CREATE POLICY "Gestion complète des albums" ON albums
  FOR ALL USING (true);

CREATE POLICY "Gestion complète des paramètres" ON settings
  FOR ALL USING (true);

-- ===== 6. AJOUTER LES COMMENTAIRES =====
COMMENT ON TABLE songs IS 'Table principale des chansons de Música da Segunda';
COMMENT ON TABLE albums IS 'Table des albums musicaux';
COMMENT ON TABLE settings IS 'Table des paramètres de l''application';
COMMENT ON COLUMN songs.tiktok_video_id IS 'ID unique de la vidéo TikTok';
COMMENT ON COLUMN songs.hashtags IS 'Array des hashtags associés à la chanson';

-- ===== 7. VÉRIFICATION FINALE =====
SELECT '✅ TABLES CRÉÉES AVEC SUCCÈS' as status;

SELECT 'Tables créées:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('songs', 'albums', 'settings');

SELECT 'Triggers créés:' as info;
SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';

SELECT 'Politiques RLS:' as info;
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

SELECT 'Données dans songs:' as info;
SELECT COUNT(*) as total_songs FROM songs;

SELECT '🎉 BASE DE DONNÉES PRÊTE - Vous pouvez maintenant migrer vos données !' as final_status;
