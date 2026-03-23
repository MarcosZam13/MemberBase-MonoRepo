// TagFilterBar.tsx — Barra de filtros con etiquetas de colores para contenido y comunidad

"use client";

import { cn } from "@/lib/utils";

export interface FilterTag {
  id: string;
  label: string;
  color: string;    // hex — define el color activo del pill
  count?: number;   // contador opcional que aparece como badge
}

interface TagFilterBarProps {
  tags: FilterTag[];
  activeId: string | null;       // id del tag activo, null = "todos"
  allLabel?: string;             // etiqueta del primer botón (default: "Todos")
  allColor?: string;             // color del botón "Todos" (default: primary navy)
  allCount?: number;
  onSelect: (id: string | null) => void;
  className?: string;
}

export function TagFilterBar({
  tags,
  activeId,
  allLabel = "Todos",
  allColor = "#1E3A5F",
  allCount,
  onSelect,
  className,
}: TagFilterBarProps) {
  const isAllActive = activeId === null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* Etiqueta "Todos" */}
      <TagPill
        label={allLabel}
        color={allColor}
        count={allCount}
        isActive={isAllActive}
        onClick={() => onSelect(null)}
      />

      {tags.map((tag) => (
        <TagPill
          key={tag.id}
          label={tag.label}
          color={tag.color}
          count={tag.count}
          isActive={activeId === tag.id}
          onClick={() => onSelect(tag.id)}
        />
      ))}
    </div>
  );
}

// ─── Pill individual ──────────────────────────────────────────────────────────

interface TagPillProps {
  label: string;
  color: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}

function TagPill({ label, color, count, isActive, onClick }: TagPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Base — transición suave en todos los estados
        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium",
        "border transition-all duration-200 select-none",
        isActive
          ? "text-white shadow-sm"
          : "bg-white border-border text-muted-foreground hover:text-foreground hover:border-opacity-60 hover:shadow-sm"
      )}
      style={
        isActive
          ? { backgroundColor: color, borderColor: color }
          : {
              // Inactive: borde con el color del tag al 30% de opacidad en hover
              // El CSS en línea maneja el color; las clases de Tailwind no pueden hacer colores dinámicos
            }
      }
      // onMouseEnter / onMouseLeave para tinte de color al hacer hover en inactivo
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = color + "80"; // 50% opacity
          (e.currentTarget as HTMLButtonElement).style.color = color;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "";
          (e.currentTarget as HTMLButtonElement).style.color = "";
        }
      }}
    >
      {/* Punto de color — solo en estado inactivo para dar contexto visual */}
      {!isActive && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}

      <span>{label}</span>

      {/* Contador — siempre visible si se pasa */}
      {count !== undefined && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5",
            "rounded-full text-xs font-semibold leading-none",
            isActive
              ? "bg-white/25 text-white"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
