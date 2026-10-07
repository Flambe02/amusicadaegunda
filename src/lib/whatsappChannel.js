import seoConfig from '../../scripts/seo.config.json';

/**
 * Canal WhatsApp du projet. Une seule adresse pour tout le site (entité `sameAs`,
 * llms.txt, page Sobre, menu mobile, réglages grand écran) : scripts/seo.config.json.
 * Un simple lien : aucun script WhatsApp n'est chargé.
 */
export const WHATSAPP_CHANNEL_URL = seoConfig.brand.links.whatsappChannel || '';
export const WHATSAPP_CHANNEL_LABEL = 'Seguir no WhatsApp';
