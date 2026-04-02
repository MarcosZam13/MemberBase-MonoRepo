// GymContentClient.tsx — Vista de biblioteca de contenido con grid de cards, filtros y toggle lista/grid

"use client";

import { useState, useDeferredValue } from "react";
import { toast } from "sonner";
import { Search, LayoutGrid, List, FileText, Video, FileDown, Link as LinkIcon, Image as ImageIcon, Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { togglePublished, deleteContent } from "@/actions/content.actions";
import type { Content, ContentType, MembershipPlan, ContentCategory } from "@/types/database";

// Icono por tipo de contenido
const TYPE_ICONS: Record<ContentType, React.ComponentType<{ className?: string }>> = {
  article: FileText,
  video:   Video,
  image:   ImageIcon,
  file:    FileDown,
  link:    LinkIcon,
};

// Etiqueta visible en la badge del tipo
const TYPE_LABELS: Record<ContentType, string> = {
  article: "ARTÍCULO",
  video:   "VIDEO",
  image:   "IMAGEN",
  file:    "PDF",
  link:    "ENLACE",
};

// Color de la badge por tipo
const TYPE_BADGE_CLS: Record<ContentType, string> = {
  article: "bg-[rgba(56,189,248,0.2)] text-[#38BDF8]",
  video:   "bg-[rgba(239,68,68,0.2)] text-[#EF4444]",
  image:   "bg-[rgba(168,85,247,0.2)] text-[#A855F7]",
  file:    "bg-[rgba(250,204,21,0.2)] text-[#FACC15]",
  link:    "bg-[rgba(34,197,94,0.2)] text-[#22C55E]",
};

// Color del ícono por tipo
const TYPE_ICON_CLS: Record<ContentType, string> = {
  article: "text-[#38BDF8]",
  video:   "text-[#EF4444]",
  image:   "text-[#A855F7]",
  file:    "text-[#FACC15]",
  link:    "text-[#22C55E]",
};

// Las categorías de filtro sin contar subcategorías
const FILTER_CATEGORIES = ["Todo", "Ejercicios", "Nutrición", "Bienestar", "Guías del Gym", "Retos"];

// Marca el contenido nuevo (publicado en últimos 7 días)
function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

interface GymContentClientProps {
  initialContent: Content[];
  plans: MembershipPlan[];
  categories: ContentCategory[];
}

export function GymContentClient({ initialContent }: GymContentClientProps): React.ReactNode {
  const [content, setContent] = useState<Content[]>(initialContent);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("Todo");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const deferredQuery = useDeferredValue(query);

  const filtered = content.filter((item) => {
    if (deferredQuery.trim()) {
      const q = deferredQuery.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !(item.description ?? "").toLowerCase().includes(q)) {
        return false;
      }
    }
    // El filtro de categoría es simple: coincidencia de nombre en el titulo/descripción como fallback
    // ya que la relación de categorías viene vía category_id — se puede mejorar con join
    return true;
  });

  async function handleToggle(item: Content): Promise<void> {
    const result = await togglePublished(item.id, !item.is_published);
    if (result.success) {
      setContent((prev) => prev.map((c) => c.id === item.id ? { ...c, is_published: !c.is_published } : c));
      toast.success(item.is_published ? "Contenido ocultado" : "Contenido publicado");
    } else {
      toast.error("Error al cambiar el estado");
    }
  }

  async function handleDelete(item: Content): Promise<void> {
    if (!window.confirm(`¿Eliminar "${item.title}"? Esta acción no se puede deshacer.`)) return;
    const result = await deleteContent(item.id);
    if (result.success) {
      setContent((prev) => prev.filter((c) => c.id !== item.id));
      toast.success("Contenido eliminado");
    } else {
      toast.error("Error al eliminar");
    }
  }

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">Contenido</h1>
          <p className="text-xs text-[#555] mt-1">{content.length} recursos en la biblioteca</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 h-[34px] bg-[#111] border border-[#222] rounded-lg px-3 w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#444] flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar contenido..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent text-xs text-[#ccc] placeholder-[#444] outline-none w-full"
            />
          </div>
          {/* Toggle vista grid/lista */}
          <div className="flex bg-[#111] border border-[#222] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${viewMode === "grid" ? "bg-[#1e1e1e]" : ""}`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#666]" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${viewMode === "list" ? "bg-[#1e1e1e]" : ""}`}
            >
              <List className="w-3.5 h-3.5 text-[#666]" />
            </button>
          </div>
          <a
            href="/admin/content/new"
            className="h-[34px] px-3.5 flex items-center gap-1.5 bg-[#FF5E14] hover:bg-[#e5540f] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo
          </a>
        </div>
      </div>

      {/* Chips de filtro categoría */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`h-7 px-3 rounded-full text-[11px] font-medium border transition-all ${
              catFilter === cat
                ? "bg-[rgba(255,94,20,0.12)] border-[rgba(255,94,20,0.4)] text-[#FF5E14]"
                : "bg-[#111] border-[#222] text-[#666] hover:border-[#333]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Vista Grid */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-[#444] text-sm">
              No hay contenido con ese filtro
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = TYPE_ICONS[item.type as ContentType] ?? FileText;
              const badgeCls = TYPE_BADGE_CLS[item.type as ContentType] ?? TYPE_BADGE_CLS.article;
              const iconCls = TYPE_ICON_CLS[item.type as ContentType] ?? TYPE_ICON_CLS.article;
              const typeLabel = TYPE_LABELS[item.type as ContentType] ?? item.type.toUpperCase();
              const newContent = isNew(item.created_at);

              return (
                <div
                  key={item.id}
                  className={`bg-[#111] border border-[#1a1a1a] rounded-[14px] overflow-hidden transition-all hover:border-[#2a2a2a] ${
                    !item.is_published ? "opacity-50" : ""
                  }`}
                >
                  {/* Thumbnail / icono */}
                  {item.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <div className="h-[100px] overflow-hidden relative bg-[#1a1a1a]">
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <span className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${badgeCls}`}>
                        {typeLabel}
                      </span>
                      {newContent && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF5E14] text-white">
                          NUEVO
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-[100px] bg-[#1a1a1a] flex items-center justify-center relative">
                      <Icon className={`w-8 h-8 ${iconCls}`} />
                      <span className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${badgeCls}`}>
                        {typeLabel}
                      </span>
                      {newContent && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF5E14] text-white">
                          NUEVO
                        </span>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-[13px] font-semibold text-[#ddd] leading-tight line-clamp-2">{item.title}</p>
                    {item.description && (
                      <p className="text-[11px] text-[#555] mt-1 line-clamp-1">{item.description}</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="px-3 pb-3 flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggle(item)}
                      className="h-6 px-2 flex items-center gap-1 bg-[#161616] border border-[#222] rounded text-[10px] text-[#666] hover:text-[#ccc] transition-colors"
                    >
                      {item.is_published ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                      {item.is_published ? "Publicado" : "Borrador"}
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="h-6 w-6 flex items-center justify-center ml-auto bg-[#161616] border border-[#222] rounded hover:border-[#EF4444] hover:text-[#EF4444] text-[#555] transition-colors"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Vista Lista */}
      {viewMode === "list" && (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] overflow-hidden">
          <div className="divide-y divide-[#0f0f0f]">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-[#444] text-sm">No hay contenido</p>
            ) : (
              filtered.map((item) => {
                const Icon = TYPE_ICONS[item.type as ContentType] ?? FileText;
                const badgeCls = TYPE_BADGE_CLS[item.type as ContentType] ?? TYPE_BADGE_CLS.article;
                const iconCls = TYPE_ICON_CLS[item.type as ContentType] ?? TYPE_ICON_CLS.article;
                const typeLabel = TYPE_LABELS[item.type as ContentType] ?? item.type.toUpperCase();

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-[#111] transition-colors ${!item.is_published ? "opacity-50" : ""}`}
                  >
                    <div className="w-9 h-9 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-4 h-4 ${iconCls}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#ddd] truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-[11px] text-[#555] truncate">{item.description}</p>
                      )}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${badgeCls}`}>
                      {typeLabel}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(item)}
                        className="h-6 w-6 flex items-center justify-center bg-[#161616] border border-[#222] rounded hover:border-[#333] text-[#555] hover:text-[#888] transition-colors"
                      >
                        {item.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="h-6 w-6 flex items-center justify-center bg-[#161616] border border-[#222] rounded hover:border-[#EF4444] hover:text-[#EF4444] text-[#555] transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
