import React, { useState, useEffect } from 'react';
import { Song, getCurrentStorageMode } from '@/api/entities';

export default function SupabaseTest() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storageMode, setStorageMode] = useState('unknown');

  useEffect(() => {
    const testSupabase = async () => {
      try {
        setLoading(true);
        console.log('🧪 Test de chargement des chansons depuis Supabase...');
        
        // Vérifier le mode de stockage
        const mode = getCurrentStorageMode();
        setStorageMode(mode);
        
        const allSongs = await Song.list();
        console.log('📊 Chansons chargées:', allSongs);
        
        setSongs(allSongs);
        setError(null);
      } catch (err) {
        console.error('❌ Erreur test Supabase:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    testSupabase();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-center text-blue-600">Test de connexion Supabase...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-600 text-center">❌ Erreur: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 shadow-lg">
      <h3 className="text-2xl font-bold text-blue-800 mb-4 text-center">
        🧪 Test de Connexion Supabase
      </h3>
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            songs.length > 1 
              ? 'bg-green-100 text-green-800' 
              : 'bg-orange-100 text-orange-800'
          }`}>
            {songs.length > 1 ? '☁️ Supabase' : '💾 localStorage'}
            <span className="font-bold">{songs.length} chansons</span>
          </div>
          
          <div className="text-xs text-gray-600">
            Mode détecté: <span className="font-medium">{storageMode === 'supabase' ? '☁️ Supabase' : '💾 localStorage'}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-blue-200">
          <p className="text-center text-gray-700 mb-3">
            <strong>Source des données:</strong>
          </p>
          <div className="text-center">
            {songs.length > 1 ? (
              <div className="text-green-600 font-semibold">
                ✅ Connexion Supabase réussie - {songs.length} chansons chargées
              </div>
            ) : (
              <div className="text-orange-600 font-semibold">
                ⚠️ Utilisation du localStorage - {songs.length} chanson(s) locale(s)
              </div>
            )}
          </div>
        </div>
        
        {songs.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-blue-200">
            <p className="text-sm font-medium text-gray-700 mb-3 text-center">
              📋 Chansons disponibles:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {songs.slice(0, 6).map(song => (
                <div key={song.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className={`w-2 h-2 rounded-full ${
                    song.status === 'published' ? 'bg-green-500' : 'bg-orange-500'
                  }`}></span>
                  <span className="text-sm text-gray-700 truncate">
                    {song.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({song.status})
                  </span>
                </div>
              ))}
            </div>
            {songs.length > 6 && (
              <p className="text-center text-gray-500 text-sm mt-2">
                ... et {songs.length - 6} autres chansons
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
