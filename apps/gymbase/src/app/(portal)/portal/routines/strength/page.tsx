// strength/page.tsx — Vista unificada "Mi Rendimiento": PRs, progresión y tests 1RM

import { getMyOneRepMaxHistory, getMyPRs } from "@/actions/workout.actions";
import { StrengthTracker } from "@/components/gym/routines/StrengthTracker";
import { themeConfig } from "@/lib/theme";

export default async function StrengthPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_routines) return null;

  // Cargar ambas fuentes de datos en paralelo para minimizar latencia
  const [tests, prs] = await Promise.all([
    getMyOneRepMaxHistory(),
    getMyPRs(),
  ]);

  return <StrengthTracker initialTests={tests} initialPRs={prs} />;
}
