// page.tsx — Gestión de retos para admin con cards de stats, ranking sidebar y filtros

import Link from "next/link";
import { Plus } from "lucide-react";
import { getChallenges, getChallengeDetail } from "@/actions/challenge.actions";
import { AdminChallengeCard } from "@/components/gym/challenges/AdminChallengeCard";
import { AdminRankingSidebar } from "@/components/gym/challenges/AdminRankingSidebar";
import { ChallengeFilterClient } from "@/components/gym/challenges/ChallengeFilterClient";

export default async function AdminChallengesPage(): Promise<React.ReactNode> {
  const challenges = await getChallenges();

  const now = new Date();
  const activeChallenge = challenges.find(
    (c) => now >= new Date(c.starts_at) && now <= new Date(c.ends_at)
  );
  const challengeDetail = activeChallenge
    ? await getChallengeDetail(activeChallenge.id)
    : null;

  const activeCount = challenges.filter(
    (c) => now >= new Date(c.starts_at) && now <= new Date(c.ends_at)
  ).length;
  const upcomingCount = challenges.filter((c) => now < new Date(c.starts_at)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">Retos</h1>
          <p className="text-xs text-[#555] mt-1">
            {activeCount} activos · {upcomingCount} próximos
          </p>
        </div>
        <Link
          href="/admin/challenges/new"
          className="flex items-center gap-1.5 h-9 px-4 bg-[#FF5E14] hover:bg-[#e5540f] text-white text-sm font-semibold rounded-[10px] transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Crear reto
        </Link>
      </div>

      {challenges.length === 0 ? (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] p-10 text-center">
          <p className="text-[#444] text-sm">No hay retos creados. Crea el primero.</p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 320px" }}>
          {/* Lista de retos con filtros client-side */}
          <ChallengeFilterClient challenges={challenges} />

          {/* Ranking sidebar */}
          <AdminRankingSidebar challenges={challenges} activeDetail={challengeDetail} />
        </div>
      )}
    </div>
  );
}
