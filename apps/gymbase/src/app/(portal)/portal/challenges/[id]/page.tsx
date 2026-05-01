// page.tsx — Detalle de reto del portal con progreso personal y ranking con fila resaltada

import { notFound } from "next/navigation";
import { Target } from "lucide-react";
import { getChallengeDetail } from "@/actions/challenge.actions";
import { getCurrentUser } from "@/lib/supabase/server";
import { ChallengeRanking } from "@/components/gym/challenges/ChallengeRanking";
import { LogProgressForm } from "@/components/gym/challenges/LogProgressForm";
import { themeConfig } from "@/lib/theme";

interface Props {
  params: Promise<{ id: string }>;
}

const TYPE_META: Record<string, { icon: string; label: string; accent: string }> = {
  attendance:      { icon: "🏃", label: "Asistencia",       accent: "#38BDF8" },
  workout:         { icon: "💪", label: "Workout",           accent: "#FF5E14" },
  weight:          { icon: "⚖️", label: "Peso",              accent: "#22C55E" },
  weight_loss:     { icon: "⚖️", label: "Pérdida de Peso",   accent: "#22C55E" },
  personal_record: { icon: "🏋️", label: "Récord Personal",   accent: "#EF4444" },
  custom:          { icon: "⭐", label: "Personalizado",     accent: "#A855F7" },
};

export default async function PortalChallengeDetailPage({ params }: Props): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_challenges) return null;

  const { id } = await params;
  const [{ challenge, participants, myParticipation, myProgress }, user] = await Promise.all([
    getChallengeDetail(id),
    getCurrentUser(),
  ]);

  if (!challenge) notFound();

  const now = new Date();
  const isActive = now >= new Date(challenge.starts_at) && now <= new Date(challenge.ends_at);
  const isWeightType = challenge.type === "weight_loss" || challenge.type === "weight";
  const isCustomOrManual = challenge.type === "custom";

  const progressPct = Math.min(100, Math.round((myProgress / (challenge.goal_value || 1)) * 100));
  const meta = TYPE_META[challenge.type] ?? TYPE_META.custom;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{meta.icon}</span>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-barlow)" }}
          >
            {challenge.title}
          </h1>
        </div>
        {challenge.description && (
          <p className="text-sm text-[#666] mt-1">{challenge.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: `${meta.accent}18`, color: meta.accent }}
          >
            {meta.label}
          </span>
          <span className="text-[11px] text-[#555]">
            {new Date(challenge.starts_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
            {" – "}
            {new Date(challenge.ends_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Mi progreso — solo si está inscrito */}
      {myParticipation && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-[16px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4" style={{ color: meta.accent }} />
            <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em]">Mi progreso</p>
          </div>

          {isWeightType ? (
            <p className="text-sm text-[#888]">
              El progreso se actualiza automáticamente al registrar snapshots de salud.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#888]">
                  {myProgress} / {challenge.goal_value} {challenge.goal_unit}
                </span>
                <span
                  className="font-semibold font-barlow text-lg"
                  style={{ color: meta.accent }}
                >
                  {progressPct}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#1e1e1e] rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressPct}%`, backgroundColor: meta.accent }}
                />
              </div>
            </>
          )}

          {/* Formulario de progreso manual — solo para retos custom y si está activo */}
          {isActive && isCustomOrManual && (
            <div className="mt-3 pt-3 border-t border-[#1e1e1e]">
              <LogProgressForm challengeId={challenge.id} goalUnit={challenge.goal_unit} />
            </div>
          )}
        </div>
      )}

      {/* Ranking */}
      <ChallengeRanking
        participants={participants}
        challenge={challenge}
        myUserId={user?.id}
        isAdmin={false}
      />
    </div>
  );
}
