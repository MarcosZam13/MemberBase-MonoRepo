// page.tsx — Panel de salud del gym: KPIs, tabla de miembros y distribución de pesos

import Link from "next/link";
import { HeartPulse, Users, Scale, Camera, Activity } from "lucide-react";
import { getGymHealthStats, getMembersHealthSummary } from "@/actions/health.actions";
import { toOpaqueId } from "@/lib/utils/opaque-id";
import { themeConfig } from "@/lib/theme";

function avatarColor(id: string): { bg: string; text: string } {
  const PALETTES = [
    { bg: "#1e0f06", text: "#FF5E14" }, { bg: "#0d1a0d", text: "#22C55E" },
    { bg: "#0d0d2a", text: "#818CF8" }, { bg: "#1a0d1a", text: "#E879F9" },
    { bg: "#0d1a1a", text: "#38BDF8" }, { bg: "#1a1a0d", text: "#FACC15" },
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// Histograma de distribución de pesos en rangos de 10 kg
function WeightHistogram({
  weights,
}: {
  weights: number[];
}): React.ReactNode {
  if (weights.length === 0) {
    return (
      <p className="text-center text-[11px] py-6" style={{ color: "#444" }}>
        Sin datos suficientes para el histograma
      </p>
    );
  }

  const RANGES = [
    { label: "< 50kg", min: 0, max: 50 },
    { label: "50–60", min: 50, max: 60 },
    { label: "60–70", min: 60, max: 70 },
    { label: "70–80", min: 70, max: 80 },
    { label: "80–90", min: 80, max: 90 },
    { label: "90–100", min: 90, max: 100 },
    { label: "100+", min: 100, max: Infinity },
  ];

  const counts = RANGES.map((r) => ({
    label: r.label,
    count: weights.filter((w) => w >= r.min && w < r.max).length,
  }));
  const maxCount = Math.max(...counts.map((r) => r.count), 1);

  return (
    <div className="space-y-2 mt-2">
      {counts.map(({ label, count }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-[10px] w-16 shrink-0 text-right" style={{ color: "#666" }}>
            {label}
          </span>
          <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
            <div
              className="h-full rounded-full flex items-center pl-2 transition-all"
              style={{
                width: `${(count / maxCount) * 100}%`,
                backgroundColor: "#FF5E1430",
                border: "1px solid #FF5E1450",
                minWidth: count > 0 ? "20px" : "0",
              }}
            />
          </div>
          <span className="text-[11px] w-6 shrink-0 font-semibold" style={{ color: count > 0 ? "#FF5E14" : "#333" }}>
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function AdminHealthPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_health_metrics) {
    return (
      <div className="p-6">
        <p className="text-[#555] text-sm">El módulo de salud no está activo en la configuración.</p>
      </div>
    );
  }

  const [stats, members] = await Promise.all([
    getGymHealthStats(),
    getMembersHealthSummary(),
  ]);

  // Pesos del último snapshot de cada miembro para el histograma
  const weights = members.map((m) => m.lastWeight).filter((w): w is number => w != null);

  return (
    <div className="p-6 max-w-4xl space-y-5">

      {/* Encabezado */}
      <div>
        <h1 className="text-[24px] font-bold text-white font-barlow tracking-tight">Panel de Salud</h1>
        <p className="text-[11px] text-[#555] mt-0.5">Vista agregada del estado físico de los miembros</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Con perfil de salud",
            value: stats?.membersWithProfile ?? "—",
            icon: <Users className="w-4 h-4" />,
            color: "#FF5E14",
          },
          {
            label: "Peso promedio",
            value: stats?.avgWeight != null ? `${stats.avgWeight} kg` : "—",
            icon: <Scale className="w-4 h-4" />,
            color: "#FF5E14",
          },
          {
            label: "Activos este mes",
            value: stats?.activeThisMonth ?? "—",
            icon: <Activity className="w-4 h-4" />,
            color: "#22C55E",
          },
          {
            label: "Fotos de progreso",
            value: stats?.totalPhotos ?? "—",
            icon: <Camera className="w-4 h-4" />,
            color: "#818CF8",
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
            <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
              {icon}
              <p className="text-[9px] font-semibold uppercase tracking-[0.08em]">{label}</p>
            </div>
            <p className="text-[22px] font-bold font-barlow" style={{ color }}>
              {String(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Tabla de miembros con métricas */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-[#FF5E14]" />
            <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em]">
              Métricas por miembro
            </p>
          </div>
          <span className="text-[10px] text-[#444]">{members.length} con perfil</span>
        </div>

        {members.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[12px] text-[#444]">Ningún miembro ha registrado métricas de salud aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  {["Miembro", "Último peso", "Grasa %", "Músculo", "Último registro", "Fotos"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] text-[#444] uppercase tracking-[0.07em] font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const colors = avatarColor(m.userId);
                  return (
                    <tr
                      key={m.userId}
                      className="border-b border-[#0f0f0f] last:border-0 hover:bg-[#0f0f0f] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/members/${toOpaqueId(m.userId)}?tab=health`}
                          className="flex items-center gap-2.5"
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-barlow shrink-0 overflow-hidden"
                            style={m.avatarUrl ? {} : { background: colors.bg, color: colors.text }}
                          >
                            {m.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.avatarUrl} alt={m.fullName ?? "Avatar"} className="w-full h-full object-cover" />
                            ) : (
                              initials(m.fullName)
                            )}
                          </div>
                          <span className="text-[12px] font-medium text-[#ccc]">
                            {m.fullName ?? "Sin nombre"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold font-barlow text-[#FF5E14]">
                        {m.lastWeight != null ? `${m.lastWeight} kg` : "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#F59E0B]">
                        {m.lastBodyFat != null ? `${m.lastBodyFat}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#22C55E]">
                        {m.lastMuscleMass != null ? `${m.lastMuscleMass} kg` : "—"}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#666]">
                        {m.lastSnapshotAt
                          ? new Date(m.lastSnapshotAt).toLocaleDateString("es-CR", {
                              day: "numeric", month: "short", year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#888]">
                        {m.photoCount > 0 ? (
                          <span className="flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {m.photoCount}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Histograma de distribución de pesos */}
      {weights.length > 0 && (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
          <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-3">
            Distribución de pesos
          </p>
          <WeightHistogram weights={weights} />
        </div>
      )}

    </div>
  );
}
