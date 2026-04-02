// time.ts — Utilidades de conversión UTC ↔ zona horaria local del gimnasio
// La conversión sólo ocurre en la capa de presentación (mostrar) y de entrada (guardar).
// En la DB, todos los TIMESTAMPTZ se almacenan en UTC.

import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { themeConfig } from "../../theme.config";

const TZ = themeConfig.timezone;

/**
 * Convierte una fecha/hora ingresada por el usuario (hora local del gym)
 * a un ISO string UTC para guardar en Supabase.
 * Ej: "2026-04-10T09:00:00" (Costa Rica 9am) → "2026-04-10T15:00:00.000Z"
 */
export function localToUtcISO(localDateTimeStr: string): string {
  const utcDate = fromZonedTime(localDateTimeStr, TZ);
  return utcDate.toISOString();
}

/**
 * Convierte un ISO UTC string (de Supabase) a un Date en la zona horaria
 * local del gym, para posicionar correctamente en el grid del calendario.
 * Ej: "2026-04-10T15:00:00Z" → Date que en .getHours() da 9 (CR)
 */
export function utcToLocalDate(utcISO: string): Date {
  return toZonedTime(new Date(utcISO), TZ);
}

/**
 * Extrae la fecha local (YYYY-MM-DD) en la zona horaria del gym.
 * Usado para agrupar clases por día en el grid.
 */
export function utcToLocalDateKey(utcISO: string): string {
  const local = toZonedTime(new Date(utcISO), TZ);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD en la zona horaria del gym.
 */
export function todayLocalDateKey(): string {
  return utcToLocalDateKey(new Date().toISOString());
}
