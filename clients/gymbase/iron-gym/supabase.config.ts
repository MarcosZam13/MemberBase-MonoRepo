// supabase.config.ts — Credenciales del proyecto Supabase de Iron Gym CR
// Los valores reales van en variables de entorno de Vercel, nunca hardcodeados

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};
