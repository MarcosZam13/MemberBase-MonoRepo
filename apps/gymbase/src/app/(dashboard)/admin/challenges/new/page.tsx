// page.tsx — Página para crear un nuevo reto; pasa ejercicios y rutinas al formulario

import { getExercises } from "@/actions/exercise.actions";
import { getRoutines } from "@/actions/routine.actions";
import { ChallengeForm } from "@/components/gym/challenges/ChallengeForm";

export default async function NewChallengePage(): Promise<React.ReactNode> {
  const [exercises, routines] = await Promise.all([
    getExercises(),
    getRoutines(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-[26px] font-bold text-white leading-none"
          style={{ fontFamily: "var(--font-barlow)" }}
        >
          Nuevo Reto
        </h1>
        <p className="text-sm text-[#555] mt-1">
          Crea un reto de asistencia, entrenamiento, récord personal o pérdida de peso
        </p>
      </div>
      <ChallengeForm exercises={exercises} routines={routines} />
    </div>
  );
}
