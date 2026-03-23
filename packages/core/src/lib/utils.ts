// utils.ts — Funciones de utilidad general del sistema

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY_LABELS, type SupportedCurrency } from "./constants";

// Combina clases de Tailwind sin conflictos (requerido por shadcn/ui)
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Formatea un precio con su símbolo de moneda correspondiente
export function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_LABELS[currency as SupportedCurrency] ?? currency;
  return `${symbol}${amount.toLocaleString("es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// Formatea una fecha ISO a formato legible en español
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("es-CR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Calcula los días restantes hasta una fecha de expiración
export function getDaysRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Verifica si una suscripción está vencida comparando la fecha actual
export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// Genera el path de un archivo en Supabase Storage para comprobantes de pago
export function buildProofFilePath(subscriptionId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `proofs/${subscriptionId}/${timestamp}-${sanitized}`;
}

// Trunca un string largo con elipsis para mostrar en UI
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}

// Extrae el ID de video de cualquier formato de URL de YouTube y retorna la URL de embed.
// Soporta: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    // Asegurar que la URL tenga protocolo para que URL() pueda parsearla
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace("www.", "");

    let videoId: string | null = null;

    if (host === "youtu.be") {
      // Formato corto: youtu.be/VIDEO_ID
      videoId = parsed.pathname.slice(1);
    } else if (host === "youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        // Ya está en formato embed: youtube.com/embed/VIDEO_ID
        videoId = parsed.pathname.split("/embed/")[1];
      } else if (parsed.pathname.startsWith("/shorts/")) {
        // YouTube Shorts: youtube.com/shorts/VIDEO_ID
        videoId = parsed.pathname.split("/shorts/")[1];
      } else {
        // Formato estándar: youtube.com/watch?v=VIDEO_ID
        videoId = parsed.searchParams.get("v");
      }
    }

    if (!videoId) return null;
    // Limpiar el ID por si trae parámetros adicionales
    return `https://www.youtube.com/embed/${videoId.split("?")[0].split("&")[0]}`;
  } catch {
    return null;
  }
}
