// next.config.ts — Configuración de Next.js para GymBase (dominio de gimnasios)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@memberbase/core'],
};

export default nextConfig;
