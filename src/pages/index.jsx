import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, useParams } from 'react-router-dom';
import { Suspense, useEffect, useRef } from 'react';
import { ROUTES } from '@/config/routes';
import LoadingSpinner from '@/components/LoadingSpinner';

// Export PAGES pour backward compatibility avec Layout.jsx
export { PAGES } from '@/config/routes';

// ✅ SEO: Composant pour rediriger les anciennes URLs /chansons vers /musica
function LegacyChansonRedirect() {
    const { slug } = useParams();
    const target = slug ? `/musica/${slug}` : '/musica';
    return <Navigate to={target} replace />;
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

    return (
        <Layout>
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
                    
                    {ROUTES.map((route) => (
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
