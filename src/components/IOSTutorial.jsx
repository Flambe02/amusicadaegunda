import React, { useState, useEffect } from 'react';
import { X, Share2, Home, ArrowUp, ArrowRight, Smartphone, Monitor } from 'lucide-react';
import { detectIOS, detectStandalone, detectSafari, shouldShowTutorial } from '@/utils/pwaDetection';

export default function IOSTutorial({ onShowVisualGuide }) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ios = detectIOS();
    const standalone = detectStandalone();
    
    setIsIOS(ios);
    setIsStandalone(standalone);

    // Afficher le tutoriel seulement si iOS et pas encore en mode standalone
    if (shouldShowTutorial()) {
      // Attendre un peu que la page se charge
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const steps = [
    {
      title: "Ajouter à l'écran d'accueil",
      description: "Cliquez sur le bouton Partager en bas de votre navigateur",
      icon: Share2,
      arrow: ArrowUp,
      arrowPosition: "bottom-20 right-4",
      highlight: "share-button"
    },
    {
      title: "Sélectionner l'option",
      description: "Puis choisissez 'Sur l'écran d'accueil' dans le menu",
      icon: Home,
      arrow: ArrowRight,
      arrowPosition: "bottom-16 right-20",
      highlight: "add-to-home"
    },
    {
      title: "Confirmer l'ajout",
      description: "Appuyez sur 'Ajouter' pour installer l'application",
      icon: Home,
      arrow: ArrowUp,
      arrowPosition: "bottom-12 right-16",
      highlight: "confirm-add"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowTutorial(false);
      // Sauvegarder que l'utilisateur a vu le tutoriel
      localStorage.setItem('ios-tutorial-seen', 'true');
    }
  };

  const handleSkip = () => {
    setShowTutorial(false);
    localStorage.setItem('ios-tutorial-seen', 'true');
  };

  const handleClose = () => {
    setShowTutorial(false);
    localStorage.setItem('ios-tutorial-seen', 'true');
  };

  // Ne pas afficher si pas iOS, déjà en mode standalone, ou tutoriel déjà vu
  if (!shouldShowTutorial() || !showTutorial) {
    return null;
  }

  return (
    <>
      {/* Overlay sombre */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      
      {/* Modal du tutoriel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 text-center relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <steps[currentStep].icon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">{steps[currentStep].title}</h2>
            <p className="text-blue-100 text-sm">{steps[currentStep].description}</p>
          </div>

          {/* Contenu du tutoriel */}
          <div className="p-6">
            {/* Simulation de l'interface iOS */}
            <div className="bg-gray-100 rounded-2xl p-4 mb-6 relative">
              <div className="bg-white rounded-xl p-3 mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Safari</span>
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
              </div>
              
              {/* Barre d'outils Safari */}
              <div className="bg-white rounded-xl p-3 flex items-center justify-between">
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
                <div className="flex-1 mx-3 h-8 bg-gray-200 rounded-lg"></div>
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
              </div>

              {/* Bouton Partager simulé */}
              <div className="bg-white rounded-xl p-3 mt-3 flex items-center justify-center">
                <div className="flex items-center gap-2 text-blue-600">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Partager</span>
                </div>
              </div>

              {/* Flèche d'indication */}
              <div className={`absolute ${steps[currentStep].arrowPosition} animate-bounce`}>
                <steps[currentStep].arrow className="w-8 h-8 text-blue-600 drop-shadow-lg" />
              </div>
            </div>

            {/* Indicateurs de progression */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 px-4 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Ignorer
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                {currentStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Banner contextuel en bas */}
      <div className="fixed bottom-20 left-4 right-4 z-40 lg:hidden">
        <div className="bg-blue-600 text-white rounded-2xl p-4 shadow-lg border border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Ajouter à l'écran d'accueil</h3>
              <p className="text-blue-100 text-xs">Cliquez sur Partager puis "Sur l'écran d'accueil"</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTutorial(true)}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              >
                Tutoriel
              </button>
              <button
                onClick={onShowVisualGuide}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              >
                Guide visuel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
