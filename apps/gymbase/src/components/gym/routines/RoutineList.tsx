// RoutineList.tsx — Lista de plantillas de rutinas para el panel admin

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Dumbbell, Loader2, Calendar, Clock } from "lucide-react";
import { removeRoutine } from "@/actions/routine.actions";
import { toOpaqueId } from "@/lib/utils/opaque-id";
import type { Routine } from "@/types/gym-routines";

interface RoutineListProps {
  routines: Routine[];
}

export function RoutineList({ routines }: RoutineListProps): React.ReactNode {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, e: React.MouseEvent): Promise<void> {
    e.preventDefault();
    if (!confirm("¿Eliminar esta rutina? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    await removeRoutine(id);
    setDeletingId(null);
    router.refresh();
  }

  if (routines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
          <Dumbbell className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground mb-1">No hay rutinas todavía</p>
        <p className="text-sm text-muted-foreground">
          Crea la primera plantilla de entrenamiento usando el botón de arriba.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {routines.map((routine) => (
        <Link
          key={routine.id}
          href={`/admin/routines/${toOpaqueId(routine.id)}`}
          className="group block rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all overflow-hidden"
        >
          {/* Barra de acento superior — indica visualmente la rutina */}
          <div className="h-0.5 bg-gradient-to-r from-primary/60 to-primary/10" />

          <div className="p-4">
            {/* Cabecera */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Dumbbell className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate leading-tight">{routine.name}</h3>
                {routine.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{routine.description}</p>
                )}
              </div>
            </div>

            {/* Metadatos */}
            <div className="flex flex-wrap gap-2 mb-3">
              {routine.days_per_week && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {routine.days_per_week} días/sem
                </span>
              )}
              {routine.duration_weeks && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {routine.duration_weeks} sem
                </span>
              )}
              {routine.is_template && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                  Plantilla
                </span>
              )}
            </div>

            {/* Footer con acciones */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                Abrir editor →
              </span>
              {/* e.preventDefault() evita que el click en botones internos navegue al href del Link padre */}
            <div className="flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
                <button
                  type="button"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Editar nombre"
                  onClick={(e) => { e.stopPropagation(); router.push(`/admin/routines/${toOpaqueId(routine.id)}/edit`); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(routine.id, e)}
                  disabled={deletingId === routine.id}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Eliminar"
                >
                  {deletingId === routine.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
