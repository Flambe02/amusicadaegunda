/**
 * Parse et valide les IDs TikTok depuis différentes sources
 * Supporte les formats : ID direct, URL complète, URL courte
 */

/**
 * Extrait l'ID TikTok depuis une URL ou un ID direct
 * @param {string} input - URL TikTok ou ID direct
 * @returns {string|null} - ID TikTok validé ou null si invalide
 */
export function parseTikTokId(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmedInput = input.trim();
  
  // Si c'est déjà un ID numérique simple
  if (/^\d{15,20}$/.test(trimmedInput)) {
    return trimmedInput;
  }

  // Patterns pour différentes URLs TikTok
  const patterns = [
    // URL complète : https://www.tiktok.com/@username/video/1234567890123456789
    /tiktok\.com\/@[^/]+\/video\/(\d{15,20})/i,
    
    // URL courte : https://vm.tiktok.com/XXXXXX/
    /vm\.tiktok\.com\/[A-Za-z0-9]+\/?/i,
    
    // URL avec paramètres : https://www.tiktok.com/video/1234567890123456789
    /tiktok\.com\/video\/(\d{15,20})/i,
    
    // URL mobile : https://m.tiktok.com/v/1234567890123456789
    /m\.tiktok\.com\/v\/(\d{15,20})/i,
    
    // URL avec hashtag : https://www.tiktok.com/t/1234567890123456789
    /tiktok\.com\/t\/(\d{15,20})/i
  ];

  // Essayer de matcher les patterns
  for (const pattern of patterns) {
    const match = trimmedInput.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Si c'est une URL courte, on ne peut pas extraire l'ID sans requête
  if (trimmedInput.includes('vm.tiktok.com')) {
    console.warn('TikTok: URL courte détectée, impossible d\'extraire l\'ID sans requête');
    return null;
  }

  return null;
}

/**
 * Valide si un ID TikTok est valide
 * @param {string} id - ID à valider
 * @returns {boolean} - true si l'ID est valide
 */
export function isValidTikTokId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // Les IDs TikTok sont généralement des nombres de 15-20 chiffres
  return /^\d{15,20}$/.test(id.trim());
}

/**
 * Nettoie et normalise un ID TikTok
 * @param {string} input - ID ou URL à nettoyer
 * @returns {string|null} - ID nettoyé ou null si invalide
 */
export function cleanTikTokId(input) {
  const parsed = parseTikTokId(input);
  if (parsed && isValidTikTokId(parsed)) {
    return parsed;
  }
  return null;
}

/**
 * Génère une URL TikTok complète depuis un ID
 * @param {string} id - ID TikTok
 * @returns {string} - URL complète
 */
export function generateTikTokUrl(id) {
  if (!isValidTikTokId(id)) {
    throw new Error('ID TikTok invalide');
  }
  return `https://www.tiktok.com/@user/video/${id}`;
}

/**
 * Extrait les métadonnées d'une URL TikTok
 * @param {string} url - URL TikTok
 * @returns {object|null} - Métadonnées ou null si invalide
 */
export function extractTikTokMetadata(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const id = parseTikTokId(url);
  if (!id) {
    return null;
  }

  // Extraire le username si présent
  const usernameMatch = url.match(/tiktok\.com\/@([^/]+)/i);
  const username = usernameMatch ? usernameMatch[1] : null;

  return {
    id,
    username,
    url: generateTikTokUrl(id),
    isValid: true
  };
}
