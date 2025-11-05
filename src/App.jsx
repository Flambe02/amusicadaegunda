import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
// ✅ PERFORMANCE: HelmetProvider supprimé ici (déjà dans main.jsx)
// Garder un seul HelmetProvider à la racine évite la duplication de contextes
import OfflineIndicator from "@/components/OfflineIndicator"
import { useEffect } from 'react';
import migrationService from '@/lib/migration';
// MigrationStatus supprimé pour la production

// Composants de diagnostic supprimés pour la production
// import TikTokDemo from "./pages/TikTokDemo";

function App() {
  // Exécuter la migration au démarrage de l'app
  useEffect(() => {
    const runMigration = async () => {
      try {
        await migrationService.execute();
      } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
      }
    };
    
    runMigration();
  }, []);

  return (
    <>
      <OfflineIndicator />
      <Pages />
      {/* MigrationStatus supprimé pour la production */}
      {/* Composants de diagnostic supprimés pour la production */}
      {/* <TikTokDemo /> */}
      <Toaster />
    </>
  )
}

export default App 