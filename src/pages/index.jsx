import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate, useParams } from 'react-router-dom';
import { Suspense } from 'react';
import { ROUTES, getCurrentPage } from '@/config/routes';
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
    const currentPage = getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            {/* ✅ PERFORMANCE: Suspense pour gérer le lazy loading des routes */}
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    {/* ✅ SEO: Redirections 301 legacy - DOIVENT ÊTRE EN PREMIER */}
                    <Route path="/chansons" element={<Navigate to="/musica" replace />} />
                    <Route path="/chansons/:slug" element={<LegacyChansonRedirect />} />
                    
                    {/* ✅ SEO: Redirection 301 pour /home → / (évite duplication de contenu) */}
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    
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