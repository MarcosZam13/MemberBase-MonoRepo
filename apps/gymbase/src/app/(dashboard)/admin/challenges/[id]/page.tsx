// page.tsx — Detalle de un reto para admin: stats, ranking con otorgamiento de badges

import { notFound } from "next/navigation";
import { Trophy, Target, Calendar, Users, Award } from "lucide-react";
import { getChallengeDetail } from "@/actions/challenge.actions";
import { ChallengeRanking } from "@/components/gym/challenges/ChallengeRanking";

interface Props {
  params: Promise<{ id: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  attendance:      "Asistencia",
  workout:         "Entrenamiento",
  weight:          "Peso",
  weight_loss:     "Pérdida de Peso",
  personal_record: "Récord Personal",
  custom:          "Personalizado",
};

const TYPE_ICONS: Record<string, string> = {
  attendance: "🏃", workout: "💪", weight: "⚖️",
  weight_loss: "⚖️", personal_record: "🏋️", custom: "⭐",
};

export default async function AdminChallengeDetailPage({ params }: Props): Promise<React.ReactNode> {
  const { id } = await params;
  const { challenge, participants } = await getChallengeDetail(id);
  if (!challenge) notFound();

  const now = new Date();
  const isActive = now >= new Date(challenge.starts_at) && now <= new Date(challenge.ends_at);
  const isUpcoming = now < new Date(challenge.starts_at);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{TYPE_ICONS[challenge.type] ?? "⭐"}</span>
            <h1
              className="text-[26px] font-bold text-white leading-none"
              style={{ fontFamily: "var(--font-barlow)" }}
            >
              {challenge.title}
            </h1>
          </div>
          {challenge.description && (
            <p className="text-sm text-[#555] mt-1">{challenge.description}</p>
          )}
        </div>
        {isActive && (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)] text-[#22C55E] flex-shrink-0">
            EN CURSO
          </span>
        )}
        {isUpcoming && (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[rgba(56,189,248,0.1)] border border-[rgba(56,189,248,0.25)] text-[#38BDF8] flex-shrink-0">
            PRÓXIMO
          </span>
        )}
        {!isActive && !isUpcoming && (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] flex-shrink-0">
            FINALIZADO
          </span>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-[14px] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-[#FF5E14]" />
            <span className="text-[10px] text-[#555] uppercase tracking-[0.08em]">Tipo</span>
          </div>
          <p className="text-sm font-semibold text-white">{TYPE_LABELS[challenge.type] ?? challenge.type}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-[14px] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-[#FF5E14]" />
            <span className="text-[10px] text-[#555] uppercase tracking-[0.08em]">Meta</span>
          </div>
          <p className="text-sm font-semibold text-white">{challenge.goal_value} {challenge.goal_unit}</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-[14px] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#FF5E14]" />
            <span className="text-[10px] text-[#555] uppercase tracking-[0.08em]">Período</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {new Date(challenge.starts_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
            {" – "}
            {new Date(challenge.ends_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
          </p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-[14px] p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5 text-[#FF5E14]" />
            <span className="text-[10px] text-[#555] uppercase tracking-[0.08em]">Participantes</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {participants.length}
            {challenge.max_participants && <span className="text-[#555]"> / {challenge.max_participants}</span>}
          </p>
        </div>
      </div>

      {/* Premio */}
      {challenge.prize_description && (
        <div className="flex items-center gap-2.5 p-3.5 bg-[rgba(255,94,20,0.06)] border border-[rgba(255,94,20,0.2)] rounded-[14px]">
          <Award className="w-4 h-4 text-[#FF5E14] flex-shrink-0" />
          <div>
            <p className="text-[10px] text-[#FF5E14] font-semibold uppercase tracking-[0.08em] mb-0.5">Premio</p>
            <p className="text-sm text-white">{challenge.prize_description}</p>
          </div>
        </div>
      )}

      {/* Ranking con acciones de badge */}
      <div>
        <p className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em] mb-3 flex items-center gap-2">
          <Trophy className="w-3 h-3" /> Ranking · Los botones 🏆⚡🎖️ otorgan badges manualmente
        </p>
        <ChallengeRanking participants={participants} challenge={challenge} isAdmin={true} />
      </div>
    </div>
  );
}
