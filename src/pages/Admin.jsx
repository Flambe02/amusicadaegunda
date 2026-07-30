// Admin app — data provider + nested routes.
// Mounted by ProtectedAdmin at /admin/* (see src/pages/index.jsx). All admin
// pages render inside AdminLayout (full-screen shell, no public layout).
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminDataProvider } from '@/components/admin/AdminDataContext';
import AdminLayout from '@/components/admin/AdminLayout';
import CatalogPage from '@/components/admin/CatalogPage';
import WorkshopPage from '@/components/admin/WorkshopPage';
import LinksPage from '@/components/admin/LinksPage';
import LocalLibraryPage from '@/components/admin/LocalLibraryPage';
import SettingsPage from '@/components/admin/SettingsPage';
import AppUpdatesPage from '@/components/admin/AppUpdatesPage';

export default function AdminPage() {
  return (
    <AdminDataProvider>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<CatalogPage />} />
          {/* Entrée de l'ateliê : ouvre l'overlay EXISTANT via openKaraoke (pas de second éditeur). */}
          <Route path="atelie" element={<WorkshopPage />} />
          <Route path="links" element={<LinksPage />} />
          <Route path="biblioteca" element={<LocalLibraryPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
          <Route path="atualizacoes" element={<AppUpdatesPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminDataProvider>
  );
}
