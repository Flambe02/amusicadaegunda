import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Vérifier si l'utilisateur est admin
        const isAdmin = await checkAdminStatus(session.user.id);
        if (isAdmin) {
          setIsAuthenticated(true);
          // Rediriger vers l'Admin après 1 seconde
          setTimeout(() => {
            window.location.href = '/admin';
          }, 1000);
        } else {
          setError('❌ Vous n\'avez pas les droits d\'administrateur');
        }
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
    } finally {
      setIsChecking(false);
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
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Erreur vérification admin:', error);
      return false;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Vérifier si l'utilisateur est admin
        const isAdmin = await checkAdminStatus(data.user.id);
        
        if (isAdmin) {
          setIsAuthenticated(true);
          // Rediriger vers l'Admin
          window.location.href = '/admin';
        } else {
          // Déconnecter l'utilisateur s'il n'est pas admin
          await supabase.auth.signOut();
          setError('❌ Vous n\'avez pas les droits d\'administrateur. Contactez l\'administrateur du système.');
        }
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setError(`❌ Erreur de connexion: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('ℹ️ Pour créer un compte administrateur, contactez l\'administrateur du système.');
  };

  // Afficher un loader pendant la vérification
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Si déjà authentifié, afficher un message de redirection
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                ✅ Authentifié avec succès
              </h2>
              <p className="text-gray-600 mb-4">
                Redirection vers l'Admin en cours...
              </p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Connexion Admin
          </CardTitle>
          <CardDescription>
            Accès réservé aux administrateurs de Música da Segunda
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@amusicadasegunda.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connexion...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Se connecter
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Pas de compte ?{' '}
              <button
                onClick={handleSignUp}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={isLoading}
              >
                Contacter l'administrateur
              </button>
            </p>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 text-center">
              🔒 Cette page est protégée. Seuls les administrateurs autorisés peuvent y accéder.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
