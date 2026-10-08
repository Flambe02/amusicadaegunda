import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ROUTES } from '@/config/routes';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDeepLinks } from '@/utils/deepLinks';
import { getInterface, isBigScreenUiEnabled } from '@/lib/interface';
import { readBigScreenEntry } from '@/lib/bigScreenEntry';
import { useInterfaceKind } from '@/hooks/useInterface';

// Export PAGES pour backward compatibility avec Layout.jsx
export { PAGES } from '@/config/routes';

// ✅ SEO: Composant pour rediriger les anciennes URLs /chansons vers /musica
function LegacyChansonRedirect() {
    const { slug } = useParams();
    const target = slug ? `/musica/${slug}` : '/musica';
    return <Navigate to={target} replace />;
}

// Intercept Supabase auth hash tokens (password recovery, magic link, etc.)
// Supabase sends: /#access_token=...&type=recovery  →  redirect to /login
function AuthHashHandler() {
    const navigate = useNavigate();
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            // Preserve the hash so Login/ProtectedAdmin can read the token
            navigate('/login' + hash, { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
}

// Android App Links : route l'app en interne quand Android/le widget ouvre
// une URL https://(www.)amusicadasegunda.com/... (voir src/utils/deepLinks.js).
function DeepLinkHandler() {
    const navigate = useNavigate();
    useDeepLinks(navigate);
    return null;
}

// Interface grand écran (TV + ordinateur) : la même app que sur la box, chargée à part.
const BigScreenApp = lazy(() => import('@/tv/TvApp'));
// Les routes qu'elle sert sur ordinateur. Toutes les autres (dont /apprendre) gardent
// leur page actuelle.
const BIG_SCREEN_SONG = /^\/musica\/([^/]+)\/?$/;
const isBigScreenRoute = (pathname) => pathname === '/' || BIG_SCREEN_SONG.test(pathname);

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const gaTimer = useRef(null);

    // Ordinateur (un pointeur fin disponible, ≥ 900 px) : l'accueil et la fiche chanson passent par
    // l'interface grand écran, par défaut. `?ui=legacy` (mémorisé) garde l'ancien desktop,
    // `?ui=auto` revient au défaut. Jamais sur téléphone ; la box TV, elle, monte TvApp
    // directement (App.jsx).
    const interfaceKind = useInterfaceKind();
    const [bigScreenUi] = useState(() => isBigScreenUiEnabled() && !getInterface().tv);
    // Adresse d'arrivée : /musica/<slug>/ ouvre directement la fiche.
    const [bigScreenWeb] = useState(() => ({
        initialSlug: BIG_SCREEN_SONG.exec(window.location.pathname)?.[1] || null,
        // /?abrir=catalogo|buscar|festa|ajustes : écran à ouvrir en arrivant (barre du
        // haut des autres pages).
        initialEntry: window.location.pathname === '/' ? readBigScreenEntry() : null,
    }));

    useEffect(() => {
        if (typeof window.gtag !== 'function') return;
        // Debounce 300ms pour éviter les doublons sur rapid back/forward
        clearTimeout(gaTimer.current);
        gaTimer.current = setTimeout(() => {
            window.gtag('event', 'page_view', {
                page_path: location.pathname + location.search,
                page_title: document.title,
            });
        }, 300);
        return () => clearTimeout(gaTimer.current);
    }, [location]);

    // Reset du scroll a chaque changement de route. React Router conserve la position
    // precedente : sans ca, ouvrir une fiche depuis le bas de la home y atterrit au
    // milieu de la page. Le shell mobile scrolle dans #mobile-scroll (Layout.jsx) et
    // non dans window, donc les deux conteneurs doivent etre remis a zero.
    // On ne touche a rien quand l'URL porte un hash (ancre, token Supabase).
    useEffect(() => {
        if (window.location.hash) return;
        window.scrollTo(0, 0);
        document.getElementById('mobile-scroll')?.scrollTo(0, 0);
    }, [location.pathname]);

    // Admin routes use their OWN full-screen shell (AdminLayout inside
    // ProtectedAdmin/Admin). They must NOT be wrapped in the public <Layout>
    // (olive sidebar, branding card, countdown, mobile bottom nav). We split the
    // route tree here so the public shell is never mounted on /admin/*.
    const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

    if (bigScreenUi && interfaceKind === 'bigscreen' && isBigScreenRoute(location.pathname)) {
        return (
            <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#05070c' }} />}>
                <BigScreenApp web={bigScreenWeb} />
            </Suspense>
        );
    }

    if (isAdminRoute) {
        const AdminComponent = ROUTES.find((r) => r.path === '/admin')?.component;
        return (
            <Suspense fallback={<LoadingSpinner />}>
                <AuthHashHandler />
                <Routes>
                    <Route path="/admin/*" element={AdminComponent ? <AdminComponent /> : null} />
                </Routes>
            </Suspense>
        );
    }

    return (
        <Layout>
            <AuthHashHandler />
            <DeepLinkHandler />
            {/* ✅ PERFORMANCE: Suspense pour gérer le lazy loading des routes */}
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    {/* ✅ SEO: Redirections 301 legacy - DOIVENT ÊTRE EN PREMIER */}
                    <Route path="/chansons" element={<Navigate to="/musica" replace />} />
                    <Route path="/chansons/:slug" element={<LegacyChansonRedirect />} />

                    {/* ✅ SEO: Redirection 301 pour /home → / (évite duplication de contenu) */}
                    <Route path="/home" element={<Navigate to="/" replace />} />

                    {/* Produit: /calendar supprimé, redirection vers la home */}
                    <Route path="/calendar" element={<Navigate to="/" replace />} />

                    {/* ✅ SEO: Redirection 301 pour /playlist → /musica (single source of truth) */}
                    <Route path="/playlist" element={<Navigate to="/musica" replace />} />

                    {/* Admin is rendered above, outside the public Layout */}
                    {ROUTES.filter((route) => route.path !== '/admin').map((route) => (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={<route.component />}
                        />
                    ))}
                </Routes>
            </Suspense>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
