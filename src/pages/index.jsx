import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Suspense, useEffect, useRef } from 'react';
import { ROUTES } from '@/config/routes';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDeepLinks } from '@/utils/deepLinks';

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

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const gaTimer = useRef(null);

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

    // Admin routes use their OWN full-screen shell (AdminLayout inside
    // ProtectedAdmin/Admin). They must NOT be wrapped in the public <Layout>
    // (olive sidebar, branding card, countdown, mobile bottom nav). We split the
    // route tree here so the public shell is never mounted on /admin/*.
    const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

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
