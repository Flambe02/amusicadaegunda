// Formule partagée du "medidor de energia" — note ludique d'énergie/participation
// (PAS de pitch, honnête sur ce qu'elle mesure). Utilisée par KaraokePlayer.jsx (micro
// local) ET par useFestaSession.js (micro à distance, téléphone → TV via broadcast,
// cf. FestaEnergyMic.jsx) — extraite ici pour que le hook Festa (partagé TV+téléphone)
// n'ait pas à importer tout le module KaraokePlayer (portail, YouTube IFrame, etc.).
export const SING_THRESHOLD = 0.045;
export const LOUDNESS_TARGET = 0.18;

export function gradeFor(score) {
  if (score >= 85) return { grade: 'Estrela da segunda!', emoji: '🌟' };
  if (score >= 70) return { grade: 'Mandou muito bem!', emoji: '🎤' };
  if (score >= 50) return { grade: 'Foi na onda!', emoji: '🎶' };
  if (score >= 25) return { grade: 'Tímido… solta a voz!', emoji: '😅' };
  return { grade: 'Cadê a voz?', emoji: '🙊' };
}
