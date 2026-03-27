// page.tsx — Lista de retos disponibles para el miembro

import { getChallenges, getMyBadges, getChallengeDetail } from "@/actions/challenge.actions";
import { ChallengeCard } from "@/components/gym/challenges/ChallengeCard";
import { themeConfig } from "@/lib/theme";
import { getCurrentUser, createClient } from "@/lib/supabase/server";
import { fetchMyParticipation, fetchChallengeProgressTotal } from "@/services/challenge.service";

export default async function PortalChallengesPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_challenges) return null;

  const [challenges, badges, user] = await Promise.all([
    getChallenges(),
    getMyBadges(),
    getCurrentUser(),
  ]);

  // Determinar en qué retos está inscrito el usuario y su progreso + ranking
  const supabase = await createClient();
  const challengeData = new Map<string, { joined: boolean; progress: number; rank: number }>();

  if (user) {
    await Promise.all(
      challenges.map(async (c) => {
        const participation = await fetchMyParticipation(supabase, c.id, user.id);
        if (participation) {
          const progress = await fetchChallengeProgressTotal(supabase, participation.id);
          // Obtener todos los participantes para calcular el ranking
          const detail = await getChallengeDetail(c.id);
          const sorted = [...detail.participants].sort((a, b) => (b.total_progress ?? 0) - (a.total_progress ?? 0));
          const rank = sorted.findIndex(p => p.user_id === user.id) + 1;
          challengeData.set(c.id, { joined: true, progress, rank });
        } else {
          challengeData.set(c.id, { joined: false, progress: 0, rank: 0 });
        }
      })
    );
  }

  const now = new Date();
  const activeChallenges = challenges.filter(c => now >= new Date(c.starts_at) && now <= new Date(c.ends_at));
  const upcomingChallenges = challenges.filter(c => now < new Date(c.starts_at));
  const finishedChallenges = challenges.filter(c => now > new Date(c.ends_at));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Retos</h1>
          <p className="text-sm text-[#555] mt-0.5">Participa y compite con otros miembros</p>
        </div>
        {activeChallenges.length > 0 && (
          <div className="text-sm text-[#555]">{activeChallenges.length} activos</div>
        )}
      </div>

      {/* Badges ganados */}
      {badges.length > 0 && (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] p-4">
          <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em] mb-3">Mis insignias</p>
          <div className="flex gap-2 flex-wrap">
            {badges.map((badge) => (
              <div key={badge.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161616] border border-[#1e1e1e] rounded-full">
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
                  const data = challengeData.get(challenge.id);
                  return (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      isJoined={data?.joined ?? false}
                      myProgress={data?.progress ?? 0}
                      myRank={data?.rank || undefined}
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
                  const data = challengeData.get(challenge.id);
                  return (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      isJoined={data?.joined ?? false}
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
                  const data = challengeData.get(challenge.id);
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
