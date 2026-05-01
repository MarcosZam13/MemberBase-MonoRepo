// page.tsx — Calendario de clases disponibles y reservas del miembro

import { getWeekSchedule, getMyBookings, getClassTypes } from "@/actions/calendar.actions";
import { PortalCalendarView } from "@/components/gym/calendar/PortalCalendarView";
import { BookingList } from "@/components/gym/calendar/BookingList";
import { themeConfig } from "@/lib/theme";

export default async function PortalCalendarPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_calendar) return null;

  // Calcular semana actual (lunes a domingo)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const [weekClasses, myBookings, classTypes] = await Promise.all([
    getWeekSchedule(monday.toISOString(), sunday.toISOString()),
    getMyBookings(),
    getClassTypes(),
  ]);

  const monthLabel = now.toLocaleDateString("es-CR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clases</h1>
          <p className="text-sm text-[#555] capitalize">{monthLabel}</p>
        </div>
      </div>

      {/* Layout: vista de semana + mis reservas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Vista principal — week strip + cards */}
        <div className="lg:col-span-2">
          <PortalCalendarView
            classes={weekClasses}
            myBookings={myBookings}
            classTypes={classTypes}
            weekStart={monday}
          />
        </div>

        {/* Sidebar: mis reservas */}
        <div>
          <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <p className="text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em]">Mis reservas</p>
            </div>
            <div className="p-4">
              <BookingList bookings={myBookings} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
