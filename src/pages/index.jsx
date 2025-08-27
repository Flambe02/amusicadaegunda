import Layout from "./Layout.jsx";

import Home from "./Home";

import Calendar from "./Calendar";

import AdventCalendar from "./AdventCalendar";

import Admin from "./Admin";

import Sobre from "./Sobre";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Calendar: Calendar,
    
    AdventCalendar: AdventCalendar,
    
    Admin: Admin,
    
    Sobre: Sobre,
    
}

function _getCurrentPage(url) {
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
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Calendar" element={<Calendar />} />
                
                <Route path="/AdventCalendar" element={<AdventCalendar />} />
                
                <Route path="/Admin" element={<Admin />} />
                
                <Route path="/Sobre" element={<Sobre />} />
                
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