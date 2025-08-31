import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/tiktok-optimized.css'
import './styles/a11y.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Import Web Vitals en production
if (import.meta.env.PROD) {
  import('./analytics/webvitals');
} 