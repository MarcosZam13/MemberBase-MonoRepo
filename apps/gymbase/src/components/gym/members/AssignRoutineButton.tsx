// AssignRoutineButton.tsx — Botón cliente para asignar una rutina a un miembro específico desde su perfil

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { assignRoutine } from "@/actions/routine.actions";

interface AssignRoutineButtonProps {
  memberId: string;
  routineId: string;
  isActive?: boolean;
}

export function AssignRoutineButton({ memberId, routineId, isActive = false }: AssignRoutineButtonProps): React.ReactNode {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAssign(): Promise<void> {
    setLoading(true);
    const result = await assignRoutine({ user_id: memberId, routine_id: routineId });
    setLoading(false);
    if (result.success) {
      toast.success("Rutina asignada correctamente");
      router.refresh();
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al asignar la rutina");
    }
  }

  if (isActive) {
    return (
      <span className="h-7 px-3 text-[11px] font-semibold rounded-lg inline-flex items-center border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] text-[#22C55E]">
        Activa
      </span>
    );
  }

  return (
    <button
      onClick={handleAssign}
      disabled={loading}
      className="h-7 px-3 text-[11px] font-semibold rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-[#888] hover:border-[rgba(255,94,20,0.4)] hover:text-[#FF5E14] transition-colors disabled:opacity-50 flex items-center gap-1.5"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
      {loading ? "Asignando…" : "Asignar"}
    </button>
  );
}
