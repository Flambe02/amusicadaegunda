import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay) % 7 || 7;
      
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0); // Definir para 9:00 da manhã
      
      const difference = nextMonday - now;
      
      if (difference > 0) {
        return {
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60)
        };
      }
      
      return null; // Hora da nova música
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());
    
    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) {
    return (
      <div className="bg-[#f8f5f2] rounded-3xl p-5 shadow-lg text-center">
        <h3 className="text-lg font-bold text-gray-800">É Segunda-feira!</h3>
        <p className="text-gray-600">A nova música já está disponível!</p>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f5f2] rounded-3xl p-5 shadow-lg">
      <div className="flex items-center justify-center gap-3 mb-4">
        <Timer className="w-5 h-5 text-gray-500"/>
        <h3 className="font-semibold text-gray-700">Próxima música em...</h3>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        {Object.entries(timeLeft).map(([unit, value]) => (
          <div key={unit} className="bg-[#e7f1f7] rounded-xl p-3">
            <p className="text-2xl font-bold text-[#32a2dc]">{value}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase">
              {unit === 'd' ? 'dias' : unit === 'h' ? 'horas' : unit === 'm' ? 'min' : 'seg'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}