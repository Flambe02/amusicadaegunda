/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Admin from '@/pages/Admin';
import Login from '@/pages/Login';
import UpdatePassword from '@/components/UpdatePassword';
import { Helmet } from 'react-helmet-async';

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
  }, []); // checkAuth is stable and defined in component scope

  const checkAuth = async () => {
    try {
      console.warn('🔐 Starting auth check...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw sessionError;
      }
      
      if (session) {
        console.warn('✅ Session found, checking admin status...');
        setIsAuthenticated(true);
        await checkAdminStatus(session.user.id);
      } else {
        console.warn('⚠️ No session found');
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      console.warn('🏁 Auth check complete, setting loading to false');
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async (userId) => {
    try {
      console.warn('🔍 Checking admin status for user:', userId);
      
      // ✅ Ajouter un timeout de 5 secondes pour éviter le blocage infini
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT: Admin check took too long (>5s)')), 5000)
      );
      
      const queryPromise = supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      
      console.warn('📊 Admin check result:', { data, error, hasData: !!data });
      
      if (error) {
        console.error('❌ Erreur vérification admin:', error.message, error.code, error);
        setIsAdmin(false);
        return;
      }
      
      const isAdminUser = !!data;
      console.warn(isAdminUser ? '✅ User IS admin' : '⚠️ User is NOT admin');
      setIsAdmin(isAdminUser);
    } catch (error) {
      console.error('❌ Exception vérification admin:', error.message || error);
      // Si timeout ou erreur RLS, considérer comme non-admin
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
          <p className="text-gray-600">Vérification de l&apos;accès administrateur...</p>
        </div>
      </div>
    );
  }

  // Si authentifié et admin, afficher l'Admin
  if (isAuthenticated && isAdmin) {
    return <Admin />;
  }

  // Sinon, afficher la page de login
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href="https://www.amusicadasegunda.com/#/admin" />
      </Helmet>
      <Login />
    </>
  );
}
