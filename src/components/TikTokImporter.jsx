import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Video,
  Music,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { importAllTikTokVideos, checkNewVideos } from '@/utils/tiktokImporter';

export default function TikTokImporter() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Importe toutes les nouvelles vidéos TikTok
   */
  const handleImportAll = async () => {
    setIsImporting(true);
    setError(null);
    
    try {
      console.log('🚀 Début de l\'importation automatique...');
      const results = await importAllTikTokVideos();
      
      setImportResults({
        success: true,
        importedCount: results.length,
        songs: results
      });
      
      // Recharger les statistiques
      await loadStats();
      
    } catch (err) {
      console.error('Erro durante importação:', err);
      setError(err.message);
      setImportResults({
        success: false,
        error: err.message
      });
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Charge les statistiques d'importation
   */
  const loadStats = async () => {
    try {
      const importStats = await checkNewVideos();
      setStats(importStats);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  /**
   * Charge les statistiques au montage du composant
   */
  React.useEffect(() => {
    loadStats();
  }, []);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-600" />
          🚀 Importação Automática TikTok
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalSongs}</div>
              <div className="text-xs text-gray-600">Total Músicas</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.importedVideos}</div>
              <div className="text-xs text-gray-600">Vídeos Importadas</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.newVideosAvailable}</div>
              <div className="text-xs text-gray-600">Novas Disponíveis</div>
            </div>
          </div>
        )}

        {/* Bouton d'importation */}
        <div className="text-center">
          <Button
            onClick={handleImportAll}
            disabled={isImporting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Importar Todas as Vídeos
              </>
            )}
          </Button>
        </div>

        {/* Résultats de l'importation */}
        {importResults && (
          <div className={`p-4 rounded-lg ${
            importResults.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {importResults.success ? (
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-bold text-green-800 mb-2">
                  Importação Concluída com Sucesso!
                </h4>
                <p className="text-green-700">
                  {importResults.importedCount} nova(s) vídeo(s) importada(s)
                </p>
                
                {/* Liste des musiques importées */}
                {importResults.songs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h5 className="font-semibold text-green-800">Músicas Importadas:</h5>
                    {importResults.songs.map((song, index) => (
                      <div key={index} className="bg-white/60 rounded-lg p-3 text-left">
                        <div className="flex items-center gap-3">
                          <Music className="w-4 h-4 text-green-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{song.title}</div>
                            <div className="text-sm text-gray-600">ID: {song.tiktok_video_id}</div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {song.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <h4 className="font-bold text-red-800 mb-2">Erro na Importação</h4>
                <p className="text-red-700">{importResults.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Informations */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Como Funciona
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Verifica automaticamente vídeos já importados</li>
            <li>• Cria novas entradas para vídeos não importados</li>
            <li>• Define automaticamente a próxima segunda-feira como data de lançamento</li>
            <li>• Status inicial: "Rascunho" (pode ser editado manualmente)</li>
          </ul>
          
          <div className="mt-3 p-3 bg-white/60 rounded-lg">
            <p className="text-xs text-blue-600">
              <strong>Nota:</strong> Para adicionar novas vídeos TikTok, edite o array 
              <code className="bg-blue-100 px-1 rounded">knownVideos</code> no arquivo 
              <code className="bg-blue-100 px-1 rounded">tiktokImporter.js</code>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
