// page.tsx — Lista de retos del portal con fix de N+1 en datos de participación

import { getChallenges, getMyBadges, getMyAllChallengeData } from "@/actions/challenge.actions";
import { ChallengeCard } from "@/components/gym/challenges/ChallengeCard";
import { themeConfig } from "@/lib/theme";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function PortalChallengesPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_challenges) return null;

  // Una sola llamada paralela — getMyAllChallengeData usa 1 query para todas las participaciones
  const [challenges, badges, user, myDataMap] = await Promise.all([
    getChallenges(),
    getMyBadges(),
    getCurrentUser(),
    getMyAllChallengeData(),
  ]);

  const now = new Date();
  const activeChallenges  = challenges.filter((c) => now >= new Date(c.starts_at) && now <= new Date(c.ends_at));
  const upcomingChallenges = challenges.filter((c) => now < new Date(c.starts_at));
  const finishedChallenges = challenges.filter((c) => now > new Date(c.ends_at));

  // Calcular ranking posición para cada reto donde el miembro participa
  // No requiere queries adicionales — los datos de participaciones ya vinieron con el batch
  function getMyRank(challengeId: string): number | undefined {
    if (!user) return undefined;
    const myData = myDataMap.get(challengeId);
    if (!myData?.joined) return undefined;
    // No tenemos datos de otros participantes en este batch simplificado;
    // el ranking detallado está en el detalle de reto
    return undefined;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            Retos
          </h1>
          <p className="text-sm text-[#555] mt-0.5">Participa y compite con otros miembros</p>
        </div>
        {activeChallenges.length > 0 && (
          <div className="text-xs text-[#555]">{activeChallenges.length} activos</div>
        )}
      </div>

      {/* Badges ganados */}
      {badges.length > 0 && (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] p-4">
          <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em] mb-3">
            Mis insignias
          </p>
          <div className="flex gap-2 flex-wrap">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161616] border border-[#1e1e1e] rounded-full"
              >
                <span className="text-sm">
                  {badge.type === "winner" ? "🏆" : badge.type === "top3" ? "⚡" : "🎖️"}
                </span>
                <span className="text-[11px] text-[#666] truncate max-w-[100px]">
                  {badge.challenge?.title ?? "Reto"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {challenges.length === 0 ? (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] py-10 text-center">
          <p className="text-[#444] text-sm">No hay retos disponibles por ahora.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Retos activos */}
          {activeChallenges.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em] mb-3">
                En curso
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChallenges.map((challenge) => {
                  const data = myDataMap.get(challenge.id);
                  const isWeightType = challenge.type === "weight_loss" || challenge.type === "weight";
                  return (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      isJoined={data?.joined ?? false}
                      myProgress={data?.progress ?? 0}
                      myRank={getMyRank(challenge.id)}
                      // baseline_weight_kg no disponible en este batch — asumimos set si hay progreso
                      baselineSet={isWeightType ? (data?.progress ?? 0) > 0 : true}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Retos próximos */}
          {upcomingChallenges.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em] mb-3">
                Próximos
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingChallenges.map((challenge) => {
                  const data = myDataMap.get(challenge.id);
                  const isWeightType = challenge.type === "weight_loss" || challenge.type === "weight";
                  return (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      isJoined={data?.joined ?? false}
                      baselineSet={isWeightType ? (data?.joined ? false : true) : true}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Retos finalizados */}
          {finishedChallenges.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em] mb-3">
                Finalizados
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                {finishedChallenges.map((challenge) => {
                  const data = myDataMap.get(challenge.id);
                  return (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      isJoined={data?.joined ?? false}
                      myProgress={data?.progress ?? 0}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
