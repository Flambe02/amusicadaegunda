/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Admin from '@/pages/Admin';
import Login from '@/pages/Login';
import UpdatePassword from '@/components/UpdatePassword';
import { Helmet } from 'react-helmet-async';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

export default function ProtectedAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);

   
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Dev mode: ensure we have a session before checkAuth so RLS works
      if (isDev) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const devEmail = import.meta.env.VITE_DEV_ADMIN_EMAIL;
          const devPass  = import.meta.env.VITE_DEV_ADMIN_PASSWORD;
          if (devEmail && devPass) {
            await supabase.auth.signInWithPassword({ email: devEmail, password: devPass });
          }
        }
      }
      await checkAuth();
    };

    initializeAuth();
    
    // Vérifier si on est dans le contexte de réinitialisation
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
    if (hashParams.get('reset') === 'true') {
      setShowUpdatePassword(true);
    }
    
    // Écouter les changements d'authentification (seulement pour les événements externes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ne pas réagir aux événements initiaux pour éviter les boucles
        if (event === 'SIGNED_IN' && session && isMounted) {
          setIsAuthenticated(true);
          await checkAdminStatus(session.user.id);
        } else if (event === 'SIGNED_OUT' && isMounted) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Exécuter une seule fois au montage

  const checkAuth = async () => {
    try {
      isDev && console.warn('🔐 Starting auth check...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw sessionError;
      }
      
      if (session) {
        isDev && console.warn('✅ Session found, checking admin status...');
        setIsAuthenticated(true);
        await checkAdminStatus(session.user.id);
      } else {
        isDev && console.warn('⚠️ No session found');
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      // Toujours mettre isLoading à false, même en cas d'erreur ou de timeout
      isDev && console.warn('🏁 Auth check complete, setting loading to false');
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async (userId) => {
    let timeoutId;
    
    try {
      isDev && console.warn('🔍 Checking admin status for user:', userId);
      
      // Essayer d'abord une requête simple pour vérifier la connexion
      try {
        const { data: testData, error: testError } = await supabase
          .from('admins')
          .select('user_id')
          .limit(1);
        
        if (testError && testError.code !== 'PGRST116') {
          isDev && console.warn('⚠️ Test de connexion à la table admins:', testError.message);
        } else {
          isDev && console.warn('✅ Connexion à la table admins OK');
        }
      } catch (testErr) {
        isDev && console.warn('⚠️ Erreur test connexion:', testErr.message);
      }
      
      // Utiliser .maybeSingle() qui est plus robuste et ne lance pas d'erreur si aucune ligne n'est trouvée
      // Timeout augmenté à 10 secondes pour donner plus de temps
      const queryPromise = supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle(); // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs PGRST116
      
      // Timeout de 10 secondes (donner plus de temps pour la première connexion)
      const timeoutWrapper = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('TIMEOUT: Admin check took too long (>10s)'));
        }, 10000);
      });
      
      try {
        const result = await Promise.race([
          queryPromise.then(result => {
            if (timeoutId) clearTimeout(timeoutId);
            return result;
          }),
          timeoutWrapper
        ]);
        
        const { data, error } = result;
        
        isDev && console.warn('📊 Admin check result:', { data, error, hasData: !!data });
        
        if (error) {
          // PGRST116 = "The result contains 0 rows" - avec maybeSingle() cela ne devrait pas arriver
          // mais on le gère quand même pour être sûr
          if (error.code === 'PGRST116') {
            isDev && console.warn('⚠️ User is NOT admin (no admin record found)');
            setIsAdmin(false);
            return;
          }
          
          console.error('❌ Erreur vérification admin:', error.message, error.code, error);
          console.error('❌ Détails de l\'erreur:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          
          // Si c'est une erreur RLS (permission denied), afficher un message plus clair
          if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
            console.error('❌ ERREUR RLS: Les policies RLS ne sont pas correctement configurées pour la table admins');
            console.error('❌ Solution: Exécuter le script supabase/scripts/fix_admin_rls_complete.sql dans Supabase SQL Editor');
          }
          
          setIsAdmin(false);
          return;
        }
        
        // Si pas d'erreur et data existe, l'utilisateur est admin
        const isAdminUser = !!data;
        isDev && console.warn(isAdminUser ? '✅ User IS admin' : '⚠️ User is NOT admin');
        setIsAdmin(isAdminUser);
      } catch (raceError) {
        if (timeoutId) clearTimeout(timeoutId);
        throw raceError;
      }
    } catch (error) {
      // Nettoyer le timeout si présent
      if (timeoutId) clearTimeout(timeoutId);
      
      console.error('❌ Exception vérification admin:', error.message || error);
      
      // Si timeout, afficher un message clair mais permettre quand même l'accès au login
      if (error.message?.includes('TIMEOUT')) {
        console.error('❌ TIMEOUT: La vérification admin a pris trop de temps');
        console.error('❌ Cela peut indiquer:');
        console.error('   1. Un problème de connexion à Supabase');
        console.error('   2. Un problème de configuration RLS sur la table admins');
        console.error('   3. Un problème de réseau');
        console.error('❌ SOLUTION: Exécutez le script supabase/scripts/fix_admin_rls_complete.sql dans Supabase SQL Editor');
        console.error('❌ En attendant, vous pouvez essayer de vous connecter - la vérification admin se fera après la connexion');
      }
      
      // En cas d'erreur, considérer comme non-admin mais permettre l'accès au login
      setIsAdmin(false);
    }
  };

  // Dev mode: skip login UI but still need a valid session for RLS
  // isAuthenticated is set by checkAuth() → checkAdminStatus() via the normal flow
  // Just skip the "not admin" gate and render Admin as soon as loading is done
  if (isDev && !isLoading) {
    return <Admin />;
  }

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
        {/* Canonical géré par useSEO si nécessaire */}
      </Helmet>
      <Login />
    </>
  );
}
