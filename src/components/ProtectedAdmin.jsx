import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Admin from '@/pages/Admin';
import Login from '@/pages/Login';
import UpdatePassword from '@/components/UpdatePassword';

export default function ProtectedAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Vérifier si on est dans le contexte de réinitialisation
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
    if (hashParams.get('reset') === 'true') {
      setShowUpdatePassword(true);
    }
    
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await checkAdminStatus(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        await checkAdminStatus(session.user.id);
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Erreur vérification admin:', error);
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Erreur vérification admin:', error);
      setIsAdmin(false);
    }
  };

  // Afficher la page de mise à jour de mot de passe si demandée
  if (showUpdatePassword) {
    return <UpdatePassword onBackToLogin={() => setShowUpdatePassword(false)} />;
  }

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'accès administrateur...</p>
        </div>
      </div>
    );
  }

  // Si authentifié et admin, afficher l'Admin
  if (isAuthenticated && isAdmin) {
    return <Admin />;
  }

  // Sinon, afficher la page de login
  return <Login />;
}
