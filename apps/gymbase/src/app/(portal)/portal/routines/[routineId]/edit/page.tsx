// page.tsx — Editor de rutina propia del miembro

import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getRoutineById } from "@/actions/routine.actions";
import { getExercisesForMember } from "@/actions/exercise.actions";
import { EditMyRoutineFlow } from "@/components/gym/routines/EditMyRoutineFlow";
import { themeConfig } from "@/lib/theme";

interface Props {
  params: Promise<{ routineId: string }>;
}

export default async function EditMyRoutinePage({ params }: Props): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_routines || !themeConfig.features.gym_member_custom_routines) {
    redirect("/portal/routines");
  }

  const { routineId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [routine, exercises] = await Promise.all([
    getRoutineById(routineId),
    getExercisesForMember(),
  ]);

  // Verificar que la rutina existe, pertenece al miembro y fue creada por él
  if (!routine) notFound();
  if (!routine.is_member_created || routine.created_by !== user.id) {
    redirect("/portal/routines");
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 0 80px" }}>
      <EditMyRoutineFlow routine={routine} exercises={exercises} />
    </div>
  );
}
