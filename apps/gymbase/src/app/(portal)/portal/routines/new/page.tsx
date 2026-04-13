// page.tsx — Flujo de creación de rutina personalizada del miembro

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getExercisesForMember } from "@/actions/exercise.actions";
import { CreateMyRoutineFlow } from "@/components/gym/routines/CreateMyRoutineFlow";
import { themeConfig } from "@/lib/theme";

export default async function NewMyRoutinePage(): Promise<React.ReactNode> {
  // Verificar feature flag antes de renderizar
  if (!themeConfig.features.gym_routines || !themeConfig.features.gym_member_custom_routines) {
    redirect("/portal/routines");
  }

  // Precargar biblioteca de ejercicios para el buscador del paso 3
  const exercises = await getExercisesForMember();

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 0 80px" }}>
      <CreateMyRoutineFlow exercises={exercises} />
    </div>
  );
}
