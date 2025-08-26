// Script de test pour l'importateur TikTok avancé
// À exécuter dans la console du navigateur

import { 
  importAllProfileVideos, 
  checkNewVideos, 
  analyzeTikTokProfile,
  emergencyRestore, 
  checkDataIntegrity,
  fixAndPublishDraftVideos,
  cleanupImportedVideos,
  updateAllVideosWithRealMetadata
} from './tiktokImporter.js';

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

// Test d'analyse du profil TikTok
async function testProfileAnalysis() {
  console.log('🧪 Testando análise do perfil TikTok...');
  try {
    const analysis = await analyzeTikTokProfile();
    console.log('✅ Análise do perfil concluída:', analysis);
    return analysis;
  } catch (error) {
    console.error('❌ Erro na análise do perfil:', error);
    return null;
  }
}

// Test d'importation de toutes les vidéos du profil
async function testImportAll() {
  console.log('🧪 Testando importação de TODAS as vídeos do perfil...');
  try {
    const results = await importAllProfileVideos();
    console.log('✅ Importação de perfil concluída:', results);
    return results;
  } catch (error) {
    console.error('❌ Erro na importação do perfil:', error);
    return null;
  }
}

// Test de récupération d'urgence
async function testEmergencyRestore() {
  console.log('🧪 Testando restauração de emergência...');
  try {
    const result = await emergencyRestore();
    console.log('✅ Restauração de emergência concluída:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro na restauração de emergência:', error);
    return null;
  }
}

// Test de vérification d'intégrité
function testDataIntegrity() {
  console.log('🧪 Testando integridade dos dados...');
  try {
    const integrity = checkDataIntegrity();
    console.log('✅ Verificação de integridade concluída:', integrity);
    return integrity;
  } catch (error) {
    console.error('❌ Erro na verificação de integridade:', error);
    return null;
  }
}

// Test de correction et publication des vidéos en draft
async function testFixAndPublishDraftVideos() {
  console.log('🧪 Testando correção e publicação de vídeos em draft...');
  try {
    const result = await fixAndPublishDraftVideos();
    console.log('✅ Correção e publicação concluída:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro na correção e publicação:', error);
    return null;
  }
}

// Test de nettoyage des vidéos importées
async function testCleanupImportedVideos() {
  console.log('🧪 Testando limpeza de vídeos importadas...');
  try {
    const result = await cleanupImportedVideos();
    console.log('✅ Limpeza concluída:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
    return null;
  }
}

// Test de récupération des vraies métadonnées TikTok
async function testUpdateAllVideosWithRealMetadata() {
  console.log('🧪 Testando recuperação de metadados reais do TikTok...');
  try {
    const result = await updateAllVideosWithRealMetadata();
    console.log('✅ Recuperação de metadados reais concluída:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro na recuperação de metadados reais:', error);
    return null;
  }
}

// Test complet du système
async function runFullTests() {
  console.log('🚀 Iniciando testes completos do importador TikTok...');
  
  try {
    // Test 1: Vérifier l'intégrité des données
    console.log('\n📊 Teste 1: Verificação de integridade');
    const integrity = testDataIntegrity();
    
    // Test 2: Analyser le profil TikTok
    console.log('\n🔍 Teste 2: Análise do perfil TikTok');
    const profileAnalysis = await testProfileAnalysis();
    
    // Test 3: Vérifier les statistiques
    console.log('\n📈 Teste 3: Estatísticas');
    const stats = await testStats();
    
    // Test 4: Importer toutes les vidéos (optionnel)
    console.log('\n⚠️ Teste 4: Importação de perfil (OPCIONAL - pode demorar)');
    console.log('Para executar este teste, use: window.testTikTokImporter.testImportAll()');
    
    // Résumé
    console.log('\n📊 Resumo dos testes:');
    console.log('- Integridade dos dados:', integrity ? '✅' : '❌');
    console.log('- Análise do perfil:', profileAnalysis ? '✅' : '❌');
    console.log('- Estatísticas:', stats ? '✅' : '❌');
    console.log('- Importação de perfil: ⚠️ (Execute manualmente se necessário)');
    
    return { integrity, profileAnalysis, stats };
    
  } catch (error) {
    console.error('❌ Erro durante testes completos:', error);
    return null;
  }
}

// Test rapide (sans importation)
async function runQuickTests() {
  console.log('⚡ Iniciando testes rápidos...');
  
  try {
    const integrity = testDataIntegrity();
    const profileAnalysis = await testProfileAnalysis();
    const stats = await testStats();
    
    console.log('📊 Testes rápidos concluídos!');
    return { integrity, profileAnalysis, stats };
    
  } catch (error) {
    console.error('❌ Erro durante testes rápidos:', error);
    return null;
  }
}

// Exporter les fonctions de test
export { 
  testStats, 
  testProfileAnalysis,
  testImportAll, 
  testEmergencyRestore,
  testDataIntegrity,
  testFixAndPublishDraftVideos,
  testCleanupImportedVideos,
  testUpdateAllVideosWithRealMetadata,
  runFullTests,
  runQuickTests
};

// Si exécuté directement dans la console
if (typeof window !== 'undefined') {
  window.testTikTokImporter = {
    testStats,
    testProfileAnalysis,
    testImportAll,
    testEmergencyRestore,
    testDataIntegrity,
    testFixAndPublishDraftVideos,
    testCleanupImportedVideos,
    testUpdateAllVideosWithRealMetadata,
    runFullTests,
    runQuickTests
  };
  
  console.log('🧪 Importador TikTok AVANÇADO carregado! Use:');
  console.log('- window.testTikTokImporter.runQuickTests() - Testes rápidos');
  console.log('- window.testTikTokImporter.runFullTests() - Testes completos');
  console.log('- window.testTikTokImporter.testProfileAnalysis() - Analisar perfil');
  console.log('- window.testTikTokImporter.testImportAll() - Importar TODAS as vídeos');
  console.log('- window.testTikTokImporter.testEmergencyRestore() - Restauração de emergência');
  console.log('- window.testTikTokImporter.testFixAndPublishDraftVideos() - Corrigir e publicar vídeos em draft');
  console.log('- window.testTikTokImporter.testCleanupImportedVideos() - Limpar vídeos importadas');
  console.log('- window.testTikTokImporter.testUpdateAllVideosWithRealMetadata() - Recuperar metadados reais do TikTok');
}
