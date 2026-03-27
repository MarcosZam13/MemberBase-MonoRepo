// page.tsx — Gestión de retos para admin con cards de stats y ranking sidebar

import Link from "next/link";
import { Plus } from "lucide-react";
import { getChallenges, getChallengeDetail } from "@/actions/challenge.actions";
import { AdminChallengeCard } from "@/components/gym/challenges/AdminChallengeCard";
import { AdminRankingSidebar } from "@/components/gym/challenges/AdminRankingSidebar";

export default async function AdminChallengesPage(): Promise<React.ReactNode> {
  const challenges = await getChallenges();

  // Cargar detalle del primer reto activo para mostrar en el ranking sidebar
  const now = new Date();
  const activeChallenge = challenges.find(c =>
    now >= new Date(c.starts_at) && now <= new Date(c.ends_at)
  );
  const challengeDetail = activeChallenge
    ? await getChallengeDetail(activeChallenge.id)
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Retos</h1>
          <p className="text-sm text-[#555] mt-0.5">Gestión de retos y competencias</p>
        </div>
        <Link
          href="/admin/challenges/new"
          className="flex items-center gap-1.5 h-9 px-4 bg-[#FF5E14] hover:bg-[#e5540f] text-white text-sm font-semibold rounded-[10px] transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nuevo reto
        </Link>
      </div>

      {challenges.length === 0 ? (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] p-10 text-center">
          <p className="text-[#444] text-sm">No hay retos creados. Crea el primero.</p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 320px" }}>

          {/* Lista de retos */}
          <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1a1a1a] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#666] uppercase tracking-[0.08em]">Retos</span>
              <div className="flex gap-1.5">
                {/* Filtros rápidos de estado */}
                <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.25)] text-[#22C55E]">
                  Activos ({challenges.filter(c => now >= new Date(c.starts_at) && now <= new Date(c.ends_at)).length})
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#1a1a1a] border border-[#2a2a2a] text-[#555]">
                  Próximos ({challenges.filter(c => now < new Date(c.starts_at)).length})
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {challenges.map((challenge) => (
                <AdminChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </div>

          {/* Ranking sidebar */}
          <AdminRankingSidebar
            challenges={challenges}
            activeDetail={challengeDetail}
          />
        </div>
      )}
    </div>
  );
}
