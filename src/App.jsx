import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { HelmetProvider } from 'react-helmet-async';
import OfflineIndicator from "@/components/OfflineIndicator"
import { useEffect } from 'react';
import migrationService from '@/lib/migration';
import MigrationStatus from '@/components/MigrationStatus';
import VersionBadge from '@/components/VersionBadge';
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
    <HelmetProvider>
      <OfflineIndicator />
      <Pages />
      <MigrationStatus />
      <VersionBadge />
      {/* <TikTokDemo /> */}
      <Toaster />
    </HelmetProvider>
  )
}

export default App 