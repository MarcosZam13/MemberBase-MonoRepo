// page.tsx — Edición de metadatos de una rutina (nombre, descripción, duración)

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { getRoutineById } from "@/actions/routine.actions";
import { RoutineForm } from "@/components/gym/routines/RoutineForm";
import { fromOpaqueId, toOpaqueId } from "@/lib/utils/opaque-id";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditRoutineMetaPage({ params }: Props): Promise<React.ReactNode> {
  const { id: rawId } = await params;
  const id = fromOpaqueId(rawId);
  const opaqueId = toOpaqueId(id);
  const routine = await getRoutineById(id);

  if (!routine) notFound();

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <Link href={`/admin/routines/${opaqueId}`}>
            <ArrowLeft className="w-4 h-4" />
            Volver al editor
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Editar rutina</h1>
          <p className="text-xs text-muted-foreground">{routine.name}</p>
        </div>
      </div>

      <RoutineForm routine={routine} />
    </div>
  );
}
