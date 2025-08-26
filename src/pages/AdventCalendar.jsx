
import React, { useState, useEffect } from 'react';
import { AdventSong } from '@/api/entities';
import { Gift, Lock, Music, Play, Sparkles, Youtube, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Advent Door Component
const AdventDoor = ({ day, song, onOpen }) => {
  const today = new Date();
  // DEBUG: To test opening, uncomment the line below
  // const today = new Date('2025-12-25');
  const doorDate = new Date(2025, 11, day);
  
  // Special case: Day 1 is always accessible
  const isLocked = day === 1 ? false : today < doorDate;

  const handleClick = () => {
    if (!isLocked && song) {
      onOpen(song);
    }
  };

  const baseClasses = "relative aspect-square rounded-2xl flex items-center justify-center text-white font-black text-3xl transition-all duration-300 transform";
  const lockedClasses = "bg-gray-400/50 text-gray-300 cursor-not-allowed";
  const unlockedWithSongClasses = "bg-gradient-to-br from-red-500 to-rose-600 shadow-lg cursor-pointer hover:scale-105 hover:shadow-xl";
  const unlockedEmptyClasses = "bg-teal-500/80";

  let finalClasses = `${baseClasses} `;
  if (isLocked) {
    finalClasses += lockedClasses;
  } else if (song) {
    finalClasses += unlockedWithSongClasses;
  } else {
    finalClasses += unlockedEmptyClasses;
  }

  return (
    <div onClick={handleClick} className={finalClasses}>
      <span>{day}</span>
      {isLocked && <Lock className="absolute w-8 h-8 opacity-70" />}
      {!isLocked && song && <Sparkles className="absolute top-2 right-2 w-5 h-5 text-yellow-300 animate-ping" />}
    </div>
  );
};

// Main Advent Calendar Page
export default function AdventCalendar() {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const calendarDays = Array.from({ length: 24 }, (_, i) => i + 1);

  useEffect(() => {
    const fetchSongs = async () => {
      const allSongs = await AdventSong.list();
      setSongs(allSongs);
    };
    fetchSongs();
  }, []);

  const songsByDay = songs.reduce((acc, song) => {
    acc[song.day_of_december] = song;
    return acc;
  }, {});

  const getSpotifyEmbedUrl = (url) => {
    if (!url) return '';
    try {
      const urlObject = new URL(url);
      const pathParts = urlObject.pathname.split('/');
      // pathParts will be ['', 'track', 'TRACK_ID'] or ['', 'album', 'ALBUM_ID']
      if (pathParts.length >= 3 && (pathParts[1] === 'track' || pathParts[1] === 'album')) {
        return `https://open.spotify.com/embed/${pathParts[1]}/${pathParts[2]}`;
      }
    } catch (e) {
      console.error("Invalid Spotify URL", e);
    }
    return '';
  };
  
  return (
    <>
      <div className="p-5 max-w-md mx-auto">
        <div className="text-center mb-8">
          <Gift className="w-16 h-16 text-white mx-auto drop-shadow-lg mb-4" />
          <h1 className="text-4xl font-black text-white drop-shadow-lg mb-2">
            Calendrier de l'Avent
          </h1>
          <p className="text-white/80 font-medium text-lg drop-shadow-md">
            Décembre 2025 - Une surprise chaque jour !
          </p>
        </div>

        <div className="bg-[#f8f5f2] rounded-3xl p-5 shadow-xl">
          <div className="grid grid-cols-4 gap-3">
            {calendarDays.map(day => (
              <AdventDoor 
                key={day}
                day={day}
                song={songsByDay[day]}
                onOpen={setSelectedSong}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Redesigned Song Modal */}
      <Dialog open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
        <DialogContent className="p-0 border-0 bg-transparent max-w-sm w-[90vw] max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-3xl shadow-2xl overflow-hidden">
            {/* Header avec numéro du jour */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-center relative">
              <div className="absolute top-4 left-4 bg-white/20 rounded-full w-12 h-12 flex items-center justify-center">
                <span className="text-white font-black text-lg">{selectedSong?.day_of_december}</span>
              </div>
              <div className="mt-2">
                <h2 className="text-2xl font-black text-white mb-1">{selectedSong?.title}</h2>
                <p className="text-white/90 text-lg font-semibold">{selectedSong?.artist}</p>
              </div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="bg-white rounded-full p-3 shadow-lg">
                  <Music className="w-8 h-8 text-red-500" />
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="p-6 pt-12">
              {/* Description/Thème */}
              {selectedSong?.description && (
                <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-gray-600 text-sm uppercase tracking-wide">Thème du jour</span>
                  </div>
                  <p className="text-gray-800 leading-relaxed">{selectedSong.description}</p>
                </div>
              )}

              {/* Player Spotify */}
              {selectedSong?.spotify_url && (
                <div className="mb-6">
                  <iframe 
                    style={{borderRadius: '16px'}} 
                    src={getSpotifyEmbedUrl(selectedSong.spotify_url)}
                    width="100%" 
                    height="352" 
                    frameBorder="0" 
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  ></iframe>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="space-y-3">
                {selectedSong?.spotify_url && (
                  <a href={selectedSong.spotify_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200">
                      <Music className="w-5 h-5 mr-3" />
                      Écouter sur Spotify
                    </Button>
                  </a>
                )}
                
                {selectedSong?.youtube_url && (
                  <a href={selectedSong.youtube_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200">
                      <Youtube className="w-5 h-5 mr-3" />
                      Voir sur YouTube
                    </Button>
                  </a>
                )}
              </div>

              {/* Footer décoratif */}
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <Gift className="w-4 h-4" />
                  <span className="text-xs font-medium">Calendrier de l'Avent Musical</span>
                  <Gift className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
