import { z } from 'zod';

/**
 * Validation schemas for forms
 */

// Song validation schema
export const songSchema = z.object({
  title: z.string()
    .min(1, 'O título é obrigatório')
    .max(200, 'O título deve ter no máximo 200 caracteres')
    .trim(),
  
  artist: z.string()
    .max(100, 'O artista deve ter no máximo 100 caracteres')
    .trim()
    .default('A Música da Segunda'),
  
  description: z.string()
    .max(5000, 'A descrição deve ter no máximo 5000 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  release_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida. Use o formato YYYY-MM-DD')
    .or(z.date()),
  
  tiktok_url: z.string()
    .url('URL do TikTok inválida')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  tiktok_video_id: z.string()
    .regex(/^\d{15,20}$/, 'ID do TikTok inválido')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  youtube_url: z.string()
    .url('URL do YouTube inválida')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  youtube_music_url: z.string()
    .url('URL do YouTube Music inválida')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  spotify_url: z.string()
    .url('URL do Spotify inválida')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  apple_music_url: z.string()
    .url('URL do Apple Music inválida')
    .or(z.literal(''))
    .optional()
    .nullable(),
  
  lyrics: z.string()
    .max(10000, 'As letras devem ter no máximo 10000 caracteres')
    .trim()
    .optional()
    .nullable(),
  
  hashtags: z.array(z.string().max(50).trim())
    .max(20, 'Máximo de 20 hashtags')
    .optional()
    .default([]),
  
  status: z.enum(['draft', 'published', 'archived'])
    .default('draft'),
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'O email é obrigatório')
    .max(255, 'Email muito longo'),
  
  password: z.string()
    .min(6, 'A senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa'),
});

// Search validation schema
export const searchSchema = z.object({
  query: z.string()
    .max(100, 'A busca deve ter no máximo 100 caracteres')
    .trim(),
});

// TikTok URL validation
export const tiktokUrlSchema = z.string()
  .refine(
    (url) => {
      if (!url || url.trim() === '') return true;
      const patterns = [
        /tiktok\.com\/@[^/]+\/video\/\d+/,
        /vm\.tiktok\.com\/[A-Za-z0-9]+/,
        /^\d{15,20}$/,
      ];
      return patterns.some(pattern => pattern.test(url));
    },
    {
      message: 'URL do TikTok inválida. Use: https://www.tiktok.com/@usuario/video/ID ou https://vm.tiktok.com/ID',
    }
  );

// YouTube URL validation
export const youtubeUrlSchema = z.string()
  .refine(
    (url) => {
      if (!url || url.trim() === '') return true;
      const patterns = [
        /(?:youtube\.com|youtu\.be)\/.+/,
        /^[A-Za-z0-9_-]{11}$/,
      ];
      return patterns.some(pattern => pattern.test(url));
    },
    {
      message: 'URL do YouTube inválida',
    }
  );

/**
 * Validate data against a schema
 * @param {z.ZodSchema} schema - Zod schema
 * @param {any} data - Data to validate
 * @returns {{ success: boolean, data?: any, errors?: z.ZodError }}
 */
export function validate(schema, data) {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Safe parse with error messages
 * @param {z.ZodSchema} schema - Zod schema
 * @param {any} data - Data to validate
 * @returns {{ success: boolean, data?: any, error?: string }}
 */
export function safeParse(schema, data) {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errorMessages = result.error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
  
  return { success: false, error: errorMessages };
}

