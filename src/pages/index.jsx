import Layout from "./Layout.jsx";

import Home from "./Home";

import Calendar from "./Calendar";

import AdventCalendar from "./AdventCalendar";

import Admin from "./Admin";

import Sobre from "./Sobre";

import { lazy, Suspense } from 'react';
import { HashRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

// Lazy loading de la route TikTok pour optimiser le bundle
const TikTokDemo = lazy(() => import('./TikTokDemo'));

const PAGES = {
    
    Home: Home,
    
    Calendar: Calendar,
    
    AdventCalendar: AdventCalendar,
    
    Admin: Admin,
    
    Sobre: Sobre,
    
    TikTokDemo: TikTokDemo,
    
}

function _getCurrentPage(url) {
    // Pour HashRouter, l'URL commence par #/
    if (url.startsWith('#')) {
        url = url.slice(1);
    }
    
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    // Si on est sur la racine ou une URL vide, retourner Home
    if (!urlLastPart || urlLastPart === 'amusicadaegunda') {
        return 'Home';
    }

    // Gérer les routes TikTok avec paramètres
    if (urlLastPart.startsWith('tiktok')) {
        return 'TikTokDemo';
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || 'Home';
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/adventcalendar" element={<AdventCalendar />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/sobre" element={<Sobre />} />
                <Route path="/tiktokdemo" element={<TikTokDemo />} />
                
                {/* Route TikTok avec paramètre dynamique */}
                <Route path="/tiktok/:id" element={<TikTokDemo />} />
            </Routes>
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