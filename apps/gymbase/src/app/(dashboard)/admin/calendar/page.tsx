// page.tsx — Gestión de calendario de clases para admin

import { getClassTypes, getWeekSchedule } from "@/actions/calendar.actions";
import { getAdmins } from "@/actions/settings.actions";
import { ScheduleForm } from "@/components/gym/calendar/ScheduleForm";
import { ClassTypeForm } from "@/components/gym/calendar/ClassTypeForm";
import { WeekView } from "@/components/gym/calendar/WeekView";
import { AdminCalendarHeader } from "@/components/gym/calendar/AdminCalendarHeader";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}): Promise<React.ReactNode> {
  // Leer el offset de semana desde la URL (?w=0 es la semana actual)
  const params = await searchParams;
  const weekOffset = parseInt(params.w ?? "0", 10) || 0;

  // Calcular lunes de la semana actual + offset
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const [classTypes, weekClasses, instructors] = await Promise.all([
    getClassTypes(),
    getWeekSchedule(monday.toISOString(), sunday.toISOString()),
    getAdmins(),
  ]);

  // Formato del rango de semana para el encabezado
  const weekLabel = `${monday.toLocaleDateString("es-CR", { day: "numeric", month: "long" })} – ${sunday.toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}`;

  // Stats rápidas de la semana
  const totalBookings = weekClasses.reduce((acc, c) => acc + (c.bookings_count ?? 0), 0);
  const avgCapacity = weekClasses.length > 0
    ? Math.round(weekClasses.filter(c => c.max_capacity).reduce((acc, c) => acc + ((c.bookings_count ?? 0) / (c.max_capacity ?? 1)) * 100, 0) / weekClasses.filter(c => c.max_capacity).length)
    : 0;

  return (
    <div className="space-y-0">
      {/* Encabezado con semana y navegación */}
      <AdminCalendarHeader
        weekLabel={weekLabel}
        weekOffset={weekOffset}
      />

      {/* Layout: sidebar izquierdo + grid semanal */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "220px 1fr" }}>

        {/* ── Sidebar izquierdo ── */}
        <div className="space-y-3">

          {/* Tipos de clase */}
          <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em]">
                Tipos de clase
              </span>
            </div>
            {classTypes.length === 0 ? (
              <p className="text-xs text-[#444] text-center py-2">Sin tipos creados</p>
            ) : (
              <div className="space-y-0">
                {classTypes.map((ct) => {
                  const count = weekClasses.filter(c => c.type_id === ct.id).length;
                  return (
                    <div key={ct.id} className="flex items-center gap-2 py-1.5 border-b border-[#141414] last:border-b-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ct.color ?? "#FF5E14" }}
                      />
                      <span className="text-xs text-[#ccc] flex-1 truncate">{ct.name}</span>
                      <span className="text-[10px] text-[#555] font-barlow font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats de la semana */}
          <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] p-4">
            <div className="space-y-0">
              <div className="flex justify-between items-center py-2 border-b border-[#141414]">
                <span className="text-xs text-[#666]">Clases esta semana</span>
                <span className="text-lg font-bold text-[#FF5E14] font-barlow">{weekClasses.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#141414]">
                <span className="text-xs text-[#666]">Reservas activas</span>
                <span className="text-lg font-bold text-white font-barlow">{totalBookings}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[#666]">Capacidad prom.</span>
                <span className="text-lg font-bold text-[#22C55E] font-barlow">{avgCapacity}%</span>
              </div>
            </div>
          </div>

          {/* Formulario nuevo tipo de clase */}
          <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] p-4">
            <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.08em] mb-3">
              Nuevo tipo de clase
            </p>
            <ClassTypeForm />
          </div>
        </div>

        {/* ── Grid semanal ── */}
        <WeekView
          classes={weekClasses}
          myBookings={[]}
          weekStart={monday.toISOString()}
        />
      </div>

      {/* Panel programar clase — debajo del grid */}
      <div className="mt-4 bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1a1a1a]">
          <p className="text-xs font-semibold text-[#666] uppercase tracking-[0.08em]">Programar nueva clase</p>
        </div>
        <div className="p-5">
          <ScheduleForm classTypes={classTypes} instructors={instructors} />
        </div>
      </div>
    </div>
  );
}
