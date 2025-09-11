export const ENV = {
  PROD: typeof import.meta !== 'undefined' && !!import.meta.env?.PROD,
  SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY,
};
