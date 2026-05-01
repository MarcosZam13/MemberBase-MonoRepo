// PostCard.tsx — Tarjeta de post de comunidad con imagen de portada, extracto y reacciones estilo WhatsApp

"use client";

import { ImageIcon } from "lucide-react";
import { ReactionsBar } from "./ReactionsBar";
import type { CommunityPost } from "@/types/database";

interface PostCardProps {
  post: CommunityPost;
  currentUserId: string | null;
}

// Formatea fecha relativa compacta: "hace X días / horas / min"
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} día${days !== 1 ? "s" : ""}`;
  const weeks = Math.floor(days / 7);
  return `Hace ${weeks} semana${weeks !== 1 ? "s" : ""}`;
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  return (
    <div
      className="group flex flex-col overflow-hidden transition-all duration-200 cursor-default"
      style={{
        background: "#111111",
        border: "1px solid #1E1E1E",
        borderRadius: "16px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#FF5E14";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 1px rgba(255,94,20,0.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#1E1E1E";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* ── Imagen de portada ────────────────────────────────────────────── */}
      {post.cover_image_url ? (
        <div className="w-full overflow-hidden" style={{ height: "160px" }}>
          {/* Usar img estándar: las URLs de storage pueden ser firmadas o públicas */}
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        // Placeholder cuando no hay imagen
        <div
          className="w-full flex items-center justify-center"
          style={{
            height: "160px",
            background: "linear-gradient(135deg, #161616 0%, #0d0d0d 100%)",
            borderBottom: "1px solid #1a1a1a",
          }}
        >
          <ImageIcon className="w-8 h-8 text-[#2a2a2a]" />
        </div>
      )}

      {/* ── Contenido ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Badge "Fijado" */}
        {post.is_pinned && (
          <div className="self-start">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(255,94,20,0.12)",
                border: "1px solid rgba(255,94,20,0.3)",
                color: "#FF5E14",
              }}
            >
              📌 Fijado
            </span>
          </div>
        )}

        {/* Título */}
        <h3
          className="font-bold text-white leading-tight line-clamp-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "18px" }}
        >
          {post.title}
        </h3>

        {/* Extracto del cuerpo */}
        <p
          className="text-[13px] line-clamp-3 flex-1"
          style={{ color: "#737373", lineHeight: "1.5" }}
        >
          {post.body}
        </p>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid #1a1a1a" }}>
          {/* Fecha relativa */}
          <span className="text-[11px]" style={{ color: "#555" }}>
            {relativeTime(post.created_at)}
          </span>

          {/* Reacciones */}
          <ReactionsBar
            postId={post.id}
            initialCounts={post.reaction_counts ?? {}}
            initialMyReaction={post.my_reaction ?? null}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
