import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { ROUTES, getCurrentPage } from '@/config/routes';
import LoadingSpinner from '@/components/LoadingSpinner';

// Export PAGES pour backward compatibility avec Layout.jsx
export { PAGES } from '@/config/routes';

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            {/* ✅ PERFORMANCE: Suspense pour gérer le lazy loading des routes */}
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
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