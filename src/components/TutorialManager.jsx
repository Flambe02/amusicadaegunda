import React, { useState, useEffect } from 'react';
import { detectIOS, detectStandalone, detectSafari, shouldShowTutorial } from '@/utils/pwaDetection';
import IOSTutorial from './IOSTutorial';
import Toast from './Toast';
import VisualGuide from './VisualGuide';

export default function TutorialManager() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const [showVisualGuide, setShowVisualGuide] = useState(false);

  useEffect(() => {
    // Vérifier si on doit afficher un message d'aide
    if (shouldShowTutorial()) {
      // Attendre que la page soit complètement chargée
      const timer = setTimeout(() => {
        if (detectIOS() && detectSafari()) {
          setToastMessage('💡 Dica: Adicione este app à sua tela inicial para uma experiência melhor! Clique em "Tutorial" para ver o guia completo.');
          setToastType('info');
          setShowToast(true);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleToastClose = () => {
    setShowToast(false);
  };

  // Afficher le toast seulement si on doit montrer le tutoriel
  if (!shouldShowTutorial()) {
    return null;
  }

  return (
    <>
      {/* Tutoriel iOS principal */}
      <IOSTutorial onShowVisualGuide={() => setShowVisualGuide(true)} />
      
      {/* Toast d'aide contextuel */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          duration={8000}
          onClose={handleToastClose}
        />
      )}
      
      {/* Guide visuel avancé */}
      <VisualGuide 
        isOpen={showVisualGuide} 
        onClose={() => setShowVisualGuide(false)} 
      />
    </>
  );
}
