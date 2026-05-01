// ContentDetailModal.tsx — Modal oscuro de detalle de contenido; renderiza por tipo y registra la vista

"use client";

import { useEffect, useCallback } from "react";
import { X, Heart, FileDown, ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import { VideoEmbed } from "./VideoEmbed";
import { trackContentView, toggleFavorite } from "@/actions/content-portal.actions";
import type { Content, ContentType } from "@/types/database";

interface ContentDetailModalProps {
  content: Content;
  isFavorite: boolean;
  onClose: () => void;
  onFavoriteToggle: (contentId: string, next: boolean) => void;
}

// Renderiza el cuerpo del contenido según su tipo
function ContentBody({ item }: { item: Content }): React.ReactNode {
  if (item.type === "video" && item.media_url) {
    return <VideoEmbed url={item.media_url} title={item.title} />;
  }

  if (item.type === "image" && item.media_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.media_url}
        alt={item.title}
        className="w-full rounded-xl object-contain max-h-[60vh]"
      />
    );
  }

  if (item.type === "article" && item.body) {
    return (
      <div
        className="prose prose-invert prose-sm max-w-none text-[#bbb] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: item.body }}
      />
    );
  }

  if (item.type === "file" && item.media_url) {
    return (
      <a
        href={item.media_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1a1a] border border-[#222] hover:border-[#FF5E14] transition-colors group"
      >
        <div className="w-10 h-10 rounded-lg bg-[rgba(250,204,21,0.1)] flex items-center justify-center flex-shrink-0">
          <FileDown className="w-5 h-5 text-[#FACC15]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{item.title}</p>
          <p className="text-xs text-[#555] mt-0.5">Click para descargar</p>
        </div>
        <ExternalLink className="w-4 h-4 text-[#555] group-hover:text-[#FF5E14] transition-colors flex-shrink-0" />
      </a>
    );
  }

  if (item.type === "link" && item.media_url) {
    return (
      <a
        href={item.media_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1a1a] border border-[#222] hover:border-[#22C55E] transition-colors group"
      >
        <div className="w-10 h-10 rounded-lg bg-[rgba(34,197,94,0.1)] flex items-center justify-center flex-shrink-0">
          <ExternalLink className="w-5 h-5 text-[#22C55E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{item.media_url}</p>
          <p className="text-xs text-[#555] mt-0.5">Abrir enlace externo</p>
        </div>
        <ExternalLink className="w-4 h-4 text-[#555] group-hover:text-[#22C55E] transition-colors flex-shrink-0" />
      </a>
    );
  }

  // Fallback para contenidos sin body/media_url aún
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-[#555]">
      <FileText className="w-8 h-8" />
      <p className="text-sm">Contenido no disponible</p>
    </div>
  );
}

const TYPE_LABELS: Record<ContentType, string> = {
  article: "Artículo",
  video:   "Video",
  image:   "Imagen",
  file:    "PDF",
  link:    "Enlace",
};

const TYPE_COLORS: Record<ContentType, string> = {
  article: "#38BDF8",
  video:   "#EF4444",
  image:   "#A855F7",
  file:    "#FACC15",
  link:    "#22C55E",
};

export function ContentDetailModal({
  content,
  isFavorite,
  onClose,
  onFavoriteToggle,
}: ContentDetailModalProps): React.ReactNode {
  // Registrar la vista al abrir el modal
  useEffect(() => {
    void trackContentView(content.id);
  }, [content.id]);

  // Cerrar con Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Bloquear scroll del body mientras el modal está abierto
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  async function handleFavorite(): Promise<void> {
    const result = await toggleFavorite(content.id);
    if (result.success && result.data) {
      onFavoriteToggle(content.id, result.data.isFavorite);
    }
  }

  const typeColor = TYPE_COLORS[content.type as ContentType] ?? "#FF5E14";
  const typeLabel = TYPE_LABELS[content.type as ContentType] ?? content.type;
  const catName = (content.category as { name: string } | null | undefined)?.name;
  const catColor = (content.category as { color: string } | null | undefined)?.color ?? "#FF5E14";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      {/* Panel del modal — detiene propagación para no cerrar al hacer click adentro */}
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[20px] sm:rounded-[20px] flex flex-col"
        style={{ backgroundColor: "#111111", border: "1px solid #1E1E1E" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 sticky top-0 z-10" style={{ backgroundColor: "#111111", borderBottom: "1px solid #1a1a1a" }}>
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
              >
                {typeLabel}
              </span>
              {catName && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: `${catColor}18`, color: catColor }}
                >
                  {catName}
                </span>
              )}
            </div>
            <h2
              className="text-lg font-bold text-white leading-tight"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              {content.title}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Botón favorito */}
            <button
              onClick={handleFavorite}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{
                backgroundColor: isFavorite ? "rgba(239,68,68,0.15)" : "#1a1a1a",
                border: `1px solid ${isFavorite ? "rgba(239,68,68,0.3)" : "#222"}`,
              }}
            >
              <Heart
                className="w-4 h-4 transition-colors"
                style={{ color: isFavorite ? "#EF4444" : "#555" }}
                fill={isFavorite ? "#EF4444" : "none"}
              />
            </button>
            {/* Cerrar */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1a1a1a] border border-[#222] hover:border-[#333] text-[#555] hover:text-[#888] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thumbnail si existe y el contenido no es video (el video ya tiene embed) */}
        {content.thumbnail_url && content.type !== "video" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-48 object-cover"
          />
        )}

        {/* Descripción */}
        {content.description && (
          <p className="px-5 pt-4 text-sm text-[#777] leading-relaxed">{content.description}</p>
        )}

        {/* Cuerpo principal */}
        <div className="p-5 pt-4 flex-1">
          <ContentBody item={content} />
        </div>
      </div>
    </div>
  );
}
