// page.tsx — Editor completo de rutina: biblioteca de ejercicios + constructor + resumen

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { getRoutineById } from "@/actions/routine.actions";
import { fromOpaqueId } from "@/lib/utils/opaque-id";
import { getExercises } from "@/actions/exercise.actions";
import { getPlans } from "@core/actions/membership.actions";
import { getMembers } from "@core/actions/admin.actions";
import { RoutineBuilderClient } from "@/components/gym/routines/RoutineBuilderClient";
import { RoutineAssignmentSection } from "@/components/gym/routines/RoutineAssignmentSection";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditRoutinePage({ params }: Props): Promise<React.ReactNode> {
  const { id: rawId } = await params;
  const id = fromOpaqueId(rawId);
  const [routine, exercises, plans, members] = await Promise.all([
    getRoutineById(id),
    getExercises(),
    getPlans(),
    getMembers(),
  ]);

  if (!routine) notFound();

  return (
    <div className="space-y-4">
      {/* Navegación y acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <Link href="/admin/routines">
              <ArrowLeft className="w-4 h-4" />
              Rutinas
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{routine.name}</h1>
            {routine.description && (
              <p className="text-xs text-muted-foreground">{routine.description}</p>
            )}
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/admin/routines/${id}/edit`}>
            <Pencil className="w-3.5 h-3.5" />
            Editar meta
          </Link>
        </Button>
      </div>

      {/* Constructor principal — 3 columnas */}
      <RoutineBuilderClient routine={routine} exercises={exercises} />

      {/* Sección de asignación por plan o miembro */}
      <RoutineAssignmentSection routineId={id} plans={plans} members={members} />
    </div>
  );
}
