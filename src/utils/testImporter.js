// Script de test pour l'importateur TikTok
// À exécuter dans la console du navigateur

import { importAllTikTokVideos, checkNewVideos } from './tiktokImporter.js';

// Test de vérification des statistiques
async function testStats() {
  console.log('🧪 Testando estatísticas...');
  try {
    const stats = await checkNewVideos();
    console.log('✅ Estatísticas carregadas:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Erro ao carregar estatísticas:', error);
    return null;
  }
}

// Test d'importation
async function testImport() {
  console.log('🧪 Testando importação...');
  try {
    const results = await importAllTikTokVideos();
    console.log('✅ Importação concluída:', results);
    return results;
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    return null;
  }
}

// Test complet
async function runTests() {
  console.log('🚀 Iniciando testes do importador TikTok...');
  
  // Test 1: Vérifier les statistiques
  const stats = await testStats();
  
  // Test 2: Importer les vidéos
  const importResults = await testImport();
  
  // Résumé
  console.log('📊 Resumo dos testes:');
  console.log('- Estatísticas:', stats ? '✅' : '❌');
  console.log('- Importação:', importResults ? '✅' : '❌');
  
  return { stats, importResults };
}

// Exporter les fonctions de test
export { testStats, testImport, runTests };

// Si exécuté directement dans la console
if (typeof window !== 'undefined') {
  window.testTikTokImporter = {
    testStats,
    testImport,
    runTests
  };
  
  console.log('🧪 Importador TikTok carregado! Use:');
  console.log('- window.testTikTokImporter.testStats()');
  console.log('- window.testTikTokImporter.testImport()');
  console.log('- window.testTikTokImporter.runTests()');
}
