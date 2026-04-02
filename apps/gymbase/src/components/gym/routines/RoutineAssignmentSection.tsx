// RoutineAssignmentSection.tsx — Sección de asignación de rutina por plan de membresía o miembro individual

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, Loader2, Check } from "lucide-react";
import { assignRoutineByPlans, assignRoutine } from "@/actions/routine.actions";
import type { MembershipPlan } from "@/types/database";
import type { MemberWithSubscription } from "@/types/database";

type AssignMode = "plan" | "member";

interface RoutineAssignmentSectionProps {
  routineId: string;
  plans: MembershipPlan[];
  members: MemberWithSubscription[];
}

export function RoutineAssignmentSection({ routineId, plans, members }: RoutineAssignmentSectionProps): React.ReactNode {
  const [mode, setMode] = useState<AssignMode>("plan");
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function togglePlan(id: string): void {
    setSelectedPlanIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  // Filtra miembros por nombre o email según el texto de búsqueda
  const filteredMembers = members.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  async function handleAssignByPlan(): Promise<void> {
    if (selectedPlanIds.length === 0) {
      toast.error("Selecciona al menos un plan");
      return;
    }
    setIsSubmitting(true);
    const result = await assignRoutineByPlans(routineId, selectedPlanIds);
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al asignar");
      return;
    }
    const count = result.data?.assigned ?? 0;
    toast.success(`Rutina asignada a ${count} miembro${count !== 1 ? "s" : ""}`);
    setSelectedPlanIds([]);
  }

  async function handleAssignToMember(): Promise<void> {
    if (!selectedMemberId) {
      toast.error("Selecciona un miembro");
      return;
    }
    setIsSubmitting(true);
    const result = await assignRoutine({ user_id: selectedMemberId, routine_id: routineId });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al asignar");
      return;
    }
    const member = members.find((m) => m.id === selectedMemberId);
    toast.success(`Rutina asignada a ${member?.full_name ?? "el miembro"}`);
    setSelectedMemberId(null);
  }

  return (
    <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] p-5">
      <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-4">
        Asignar rutina
      </p>

      {/* Toggle modo */}
      <div className="flex gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-0.5 mb-4">
        {(["plan", "member"] as AssignMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 h-7 rounded-md text-[11px] font-medium transition-colors ${
              mode === m ? "bg-[#1e1e1e] text-white" : "text-[#555] hover:text-[#888]"
            }`}
          >
            {m === "plan" ? "Por membresía" : "A miembro específico"}
          </button>
        ))}
      </div>

      {/* Modo: por plan */}
      {mode === "plan" && (
        <div className="space-y-3">
          <p className="text-[11px] text-[#555]">
            Selecciona los planes que recibirán esta rutina. Se asignará a todos los miembros activos de esos planes.
          </p>
          {plans.length === 0 ? (
            <p className="text-[11px] text-[#444] text-center py-4">No hay planes de membresía creados.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => togglePlan(plan.id)}
                  className={`border rounded-[10px] px-3 py-2.5 text-center transition-all cursor-pointer ${
                    selectedPlanIds.includes(plan.id)
                      ? "border-[rgba(255,94,20,0.5)] bg-[rgba(255,94,20,0.08)]"
                      : "border-[#1e1e1e] hover:border-[#2a2a2a]"
                  }`}
                >
                  <p className={`text-[11px] font-semibold ${selectedPlanIds.includes(plan.id) ? "text-[#FF5E14]" : "text-[#ccc]"}`}>
                    {plan.name}
                  </p>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleAssignByPlan}
            disabled={isSubmitting || selectedPlanIds.length === 0}
            className="w-full h-9 bg-[#FF5E14] text-white text-sm font-semibold rounded-[10px] disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Asignando...</>
              : `Asignar a ${selectedPlanIds.length} plan${selectedPlanIds.length !== 1 ? "es" : ""}`
            }
          </button>
        </div>
      )}

      {/* Modo: miembro específico */}
      {mode === "member" && (
        <div className="space-y-3">
          <p className="text-[11px] text-[#555]">
            Busca y selecciona un miembro para asignarle esta rutina directamente.
          </p>

          {/* Buscador de miembros */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444] pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre o email…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full h-8 bg-[#111] border border-[#1e1e1e] rounded-lg pl-8 pr-3 text-[12px] text-[#ccc] placeholder:text-[#444] outline-none focus:border-[#333] transition-colors"
            />
          </div>

          {/* Lista de miembros filtrados */}
          <div className="max-h-[200px] overflow-y-auto space-y-1 pr-0.5">
            {filteredMembers.length === 0 ? (
              <p className="text-[11px] text-[#444] text-center py-4">
                {members.length === 0 ? "No hay miembros registrados." : "Sin resultados."}
              </p>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = selectedMemberId === member.id;
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-left transition-all ${
                      isSelected
                        ? "bg-[rgba(255,94,20,0.1)] border border-[rgba(255,94,20,0.3)]"
                        : "bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a]"
                    }`}
                  >
                    {/* Avatar inicial */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: isSelected ? "rgba(255,94,20,0.2)" : "#1a1a1a", color: isSelected ? "#FF5E14" : "#666" }}
                    >
                      {member.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-medium truncate ${isSelected ? "text-[#FF5E14]" : "text-[#ccc]"}`}>
                        {member.full_name ?? "Sin nombre"}
                      </p>
                      <p className="text-[10px] text-[#555] truncate">{member.email}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#FF5E14] flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <button
            onClick={handleAssignToMember}
            disabled={isSubmitting || !selectedMemberId}
            className="w-full h-9 bg-[#FF5E14] text-white text-sm font-semibold rounded-[10px] disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Asignando...</>
              : selectedMemberId
                ? `Asignar a ${members.find((m) => m.id === selectedMemberId)?.full_name ?? "miembro"}`
                : "Selecciona un miembro"
            }
          </button>
        </div>
      )}
    </div>
  );
}
