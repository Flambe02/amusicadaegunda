import { useState, useEffect } from 'react';
import { isMobile } from '@/lib/push';

export default function DeviceDetector() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    userAgent: '',
    platform: '',
    standalone: false
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo({
        isMobile: isMobile(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        standalone: navigator.standalone || false
      });
    };

    updateDeviceInfo();
    
    // Mettre à jour lors du redimensionnement
    window.addEventListener('resize', updateDeviceInfo);
    
    return () => window.removeEventListener('resize', updateDeviceInfo);
  }, []);

  // Afficher seulement en mode développement
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="bg-green-800 text-white p-3 rounded-lg shadow-lg text-xs max-w-xs">
        <h3 className="font-bold mb-2">🔍 Device Detector (DEV)</h3>
        
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>📱 Mobile:</span>
            <span className={deviceInfo.isMobile ? 'text-green-300' : 'text-red-300'}>
              {deviceInfo.isMobile ? 'OUI' : 'NON'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>🖥️ Platform:</span>
            <span>{deviceInfo.platform}</span>
          </div>
          
          <div className="flex justify-between">
            <span>📱 Standalone:</span>
            <span className={deviceInfo.standalone ? 'text-green-300' : 'text-yellow-300'}>
              {deviceInfo.standalone ? 'OUI' : 'NON'}
            </span>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-green-600">
          <div className="text-xs opacity-75">
            <div className="truncate" title={deviceInfo.userAgent}>
              UA: {deviceInfo.userAgent.substring(0, 50)}...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
