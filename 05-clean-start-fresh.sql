-- 🗑️ NETTOYAGE COMPLET ET DÉMARRAGE FRAIS
-- Ce script supprime tout et vous permet de repartir à zéro

-- ===== 1. SUPPRIMER TOUT =====
DROP TABLE IF EXISTS songs CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ===== 2. RECRÉER LES TABLES =====
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

-- ===== 3. INDEX ET TRIGGERS =====
CREATE INDEX idx_songs_release_date ON songs(release_date DESC);
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_tiktok_id ON songs(tiktok_video_id);

-- Fonction pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at automatique
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 4. RLS SIMPLE =====
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accès complet aux chansons" ON songs FOR ALL USING (true);

-- ===== 5. VÉRIFICATION =====
SELECT '✅ BASE NETTOYÉE ET PRÊTE' as status;
SELECT 'Tables créées:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

SELECT '🎯 Vous pouvez maintenant utiliser l''interface Admin pour ajouter des chansons !' as next_step;
