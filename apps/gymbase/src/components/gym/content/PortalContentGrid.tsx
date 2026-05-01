// PortalContentGrid.tsx — Grid de contenido con filtros URL-driven, paginación y modal de detalle

"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  FileText, Video, FileDown, Link as LinkIcon, Image as ImageIcon,
  Heart, Search, BookOpen,
} from "lucide-react";
import { ContentDetailModal } from "./ContentDetailModal";
import { Pagination } from "@/components/shared/Pagination";
import type { Content, ContentType, ContentCategory } from "@/types/database";
import type { PaginatedResult } from "@core/types/pagination";

const TYPE_ICONS: Record<ContentType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  article: FileText,
  video:   Video,
  image:   ImageIcon,
  file:    FileDown,
  link:    LinkIcon,
};

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

interface PortalContentGridProps {
  result: PaginatedResult<Content>;
  categories: ContentCategory[];
  initialFavoriteIds: string[];
  currentSearch: string;
  currentCategorySlug: string;
}

export function PortalContentGrid({
  result,
  categories,
  initialFavoriteIds,
  currentSearch,
  currentCategorySlug,
}: PortalContentGridProps): React.ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(initialFavoriteIds));
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Content | null>(null);

  const navigate = useCallback((updates: Record<string, string>): void => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, searchParams]);

  const { data: items, total, page, totalPages } = result;

  // Favoritos se filtran client-side sobre la página actual — search y category son server-side
  const filtered = showFavorites ? items.filter((item) => favoriteIds.has(item.id)) : items;

  function handleFavoriteToggle(contentId: string, next: boolean): void {
    setFavoriteIds((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(contentId);
      else updated.delete(contentId);
      return updated;
    });
  }

  const activeCategories = categories.filter((c) => c.is_active);
  const isAnyFilterActive = !!currentSearch || !!currentCategorySlug;

  return (
    <>
      {/* Barra de búsqueda y filtros */}
      <div className="space-y-3">
        {/* Búsqueda */}
        <div
          className="flex items-center gap-2 h-10 rounded-xl px-3"
          style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--gym-text-ghost)" }} />
          <input
            type="text"
            placeholder="Buscar contenido..."
            defaultValue={currentSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ search: (e.target as HTMLInputElement).value });
            }}
            onBlur={(e) => {
              if (e.target.value !== currentSearch) navigate({ search: e.target.value });
            }}
            className="bg-transparent flex-1 text-sm outline-none"
            style={{ color: "var(--gym-text-primary)" }}
          />
        </div>

        {/* Chips de categoría + favoritos */}
        <div className="flex gap-2 flex-wrap">
          {/* Chip "Todo" */}
          <button
            onClick={() => { navigate({ search: "", category: "" }); setShowFavorites(false); }}
            className="h-7 px-3 rounded-full text-[11px] font-medium border transition-all"
            style={{
              backgroundColor: !isAnyFilterActive && !showFavorites ? "rgba(255,94,20,0.12)" : "var(--gym-bg-card)",
              borderColor: !isAnyFilterActive && !showFavorites ? "rgba(255,94,20,0.4)" : "var(--gym-border)",
              color: !isAnyFilterActive && !showFavorites ? "#FF5E14" : "var(--gym-text-muted)",
            }}
          >
            Todo
          </button>

          {/* Chip favoritos — client-side */}
          <button
            onClick={() => { setShowFavorites(!showFavorites); }}
            className="h-7 px-3 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1"
            style={{
              backgroundColor: showFavorites ? "rgba(239,68,68,0.12)" : "var(--gym-bg-card)",
              borderColor: showFavorites ? "rgba(239,68,68,0.4)" : "var(--gym-border)",
              color: showFavorites ? "#EF4444" : "var(--gym-text-muted)",
            }}
          >
            <Heart className="w-3 h-3" fill={showFavorites ? "#EF4444" : "none"} />
            Favoritos
            {favoriteIds.size > 0 && (
              <span
                className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ backgroundColor: showFavorites ? "#EF4444" : "var(--gym-bg-card)", color: showFavorites ? "white" : "var(--gym-text-ghost)" }}
              >
                {favoriteIds.size}
              </span>
            )}
          </button>

          {/* Chips de categorías activas — URL-driven */}
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { navigate({ category: currentCategorySlug === cat.slug ? "" : cat.slug }); setShowFavorites(false); }}
              className="h-7 px-3 rounded-full text-[11px] font-medium border transition-all"
              style={{
                backgroundColor: currentCategorySlug === cat.slug ? `${cat.color}18` : "var(--gym-bg-card)",
                borderColor: currentCategorySlug === cat.slug ? `${cat.color}50` : "var(--gym-border)",
                color: currentCategorySlug === cat.slug ? cat.color : "var(--gym-text-muted)",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Conteo de resultados */}
      <p className="text-xs mt-1" style={{ color: "var(--gym-text-ghost)" }}>
        {total} elemento{total !== 1 ? "s" : ""}
        {showFavorites && " — mostrando favoritos"}
        {currentCategorySlug && " en esta categoría"}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-16 rounded-2xl mt-2"
          style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
        >
          {showFavorites ? (
            <>
              <Heart className="w-8 h-8" style={{ color: "var(--gym-text-ghost)" }} />
              <p className="text-sm" style={{ color: "var(--gym-text-muted)" }}>
                Aún no tienes favoritos en esta página. Toca el corazón en cualquier contenido.
              </p>
            </>
          ) : (
            <>
              <BookOpen className="w-8 h-8" style={{ color: "var(--gym-text-ghost)" }} />
              <p className="text-sm" style={{ color: "var(--gym-text-muted)" }}>
                No hay contenido disponible con este filtro.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {filtered.map((item) => {
            const TypeIcon = TYPE_ICONS[item.type as ContentType];
            const typeColor = TYPE_COLORS[item.type as ContentType];
            const catColor = (item.category as { color: string } | null)?.color ?? "#FF5E14";
            const catName = (item.category as { name: string } | null)?.name ?? "";
            const isFav = favoriteIds.has(item.id);

            return (
              <div
                key={item.id}
                className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 hover:scale-[1.02]"
                style={{ backgroundColor: "var(--gym-bg-card)", border: "1px solid var(--gym-border)" }}
                onClick={() => setSelectedItem(item)}
              >
                {/* Thumbnail o placeholder de tipo */}
                {item.thumbnail_url ? (
                  <div className="h-[120px] relative overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
                    <Image src={item.thumbnail_url!} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                  </div>
                ) : (
                  <div
                    className="h-[100px] flex items-center justify-center"
                    style={{ backgroundColor: `${typeColor}10`, borderBottom: `1px solid ${typeColor}15` }}
                  >
                    <TypeIcon className="w-10 h-10 opacity-60" style={{ color: typeColor }} />
                  </div>
                )}

                {/* Body de la card */}
                <div className="p-3.5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                    >
                      <TypeIcon className="w-2.5 h-2.5" />
                      {TYPE_LABELS[item.type as ContentType]}
                    </span>
                    {catName && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold ml-auto"
                        style={{ backgroundColor: `${catColor}18`, color: catColor }}
                      >
                        {catName}
                      </span>
                    )}
                  </div>

                  <h3
                    className="text-sm font-semibold leading-snug line-clamp-2 flex-1"
                    style={{ color: "var(--gym-text-primary)" }}
                  >
                    {item.title}
                  </h3>

                  {item.description && (
                    <p
                      className="text-xs mt-1.5 line-clamp-2 leading-relaxed"
                      style={{ color: "var(--gym-text-muted)" }}
                    >
                      {item.description}
                    </p>
                  )}

                  {/* Footer: botón favorito inline */}
                  <div
                    className="flex items-center justify-between mt-3 pt-3"
                    style={{ borderTop: "1px solid var(--gym-border)" }}
                  >
                    <span
                      className="text-[11px] font-medium group-hover:text-[#FF5E14] transition-colors"
                      style={{ color: "var(--gym-text-ghost)" }}
                    >
                      Ver contenido →
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = !isFav;
                        setFavoriteIds((prev) => {
                          const updated = new Set(prev);
                          if (next) updated.add(item.id);
                          else updated.delete(item.id);
                          return updated;
                        });
                        import("@/actions/content-portal.actions").then(({ toggleFavorite }) => {
                          void toggleFavorite(item.id).then((res) => {
                            if (!res.success) {
                              setFavoriteIds((prev) => {
                                const reverted = new Set(prev);
                                if (!next) reverted.add(item.id);
                                else reverted.delete(item.id);
                                return reverted;
                              });
                            }
                          });
                        });
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-full transition-all"
                      style={{ backgroundColor: isFav ? "rgba(239,68,68,0.12)" : "transparent" }}
                    >
                      <Heart
                        className="w-3.5 h-3.5 transition-colors"
                        style={{ color: isFav ? "#EF4444" : "var(--gym-text-ghost)" }}
                        fill={isFav ? "#EF4444" : "none"}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Pagination totalPages={totalPages} currentPage={page} />
        </>
      )}

      {/* Modal de detalle */}
      {selectedItem && (
        <ContentDetailModal
          content={selectedItem}
          isFavorite={favoriteIds.has(selectedItem.id)}
          onClose={() => setSelectedItem(null)}
          onFavoriteToggle={handleFavoriteToggle}
        />
      )}
    </>
  );
}
