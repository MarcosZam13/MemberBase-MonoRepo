// PortalCalendarView.tsx — Vista del calendario para el miembro con week strip y cards de clases

"use client";

import { useState } from "react";
import { cn } from "@core/lib/utils";
import { PortalClassCard } from "./PortalClassCard";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";

interface PortalCalendarViewProps {
  classes: ScheduledClass[];
  myBookings: ClassBooking[];
  weekStart: Date;
}

const DOW_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function PortalCalendarView({ classes, myBookings, weekStart }: PortalCalendarViewProps): React.ReactNode {
  // Índice del día seleccionado (0 = lunes de la semana actual)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Encontrar el índice del día de hoy dentro de la semana
  const todayIndex = (() => {
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) return i;
    }
    return 0;
  })();

  const [selectedDay, setSelectedDay] = useState(todayIndex);

  // Generar los 7 días de la semana
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Clases del día seleccionado, ordenadas por hora
  const selectedDate = days[selectedDay]!.toISOString().split("T")[0];
  const dayClasses = classes
    .filter(cls => new Date(cls.starts_at).toISOString().split("T")[0] === selectedDate)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <div>
      {/* Week strip horizontal */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {days.map((day, i) => {
          const dateKey = day.toISOString().split("T")[0];
          const hasClasses = classes.some(c => new Date(c.starts_at).toISOString().split("T")[0] === dateKey);
          const isToday = day.getTime() === today.getTime();

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={cn(
                "flex-1 min-w-[44px] text-center py-2 px-1 rounded-xl border transition-all",
                selectedDay === i
                  ? "bg-[#FF5E14] border-[#FF5E14]"
                  : "bg-transparent border-transparent hover:bg-[#161616]"
              )}
            >
              <div className={cn(
                "text-[9px] uppercase font-medium tracking-wide mb-1",
                selectedDay === i ? "text-white" : isToday ? "text-[#FF5E14]" : "text-[#555]"
              )}>
                {DOW_SHORT[i]}
              </div>
              <div className={cn(
                "text-base font-bold font-barlow leading-tight",
                selectedDay === i ? "text-white" : isToday ? "text-[#FF5E14]" : "text-[#aaa]"
              )}>
                {day.getDate()}
              </div>
              {/* Dot indicador de clases */}
              <div className={cn(
                "w-1 h-1 rounded-full mx-auto mt-1 transition-colors",
                hasClasses
                  ? selectedDay === i ? "bg-white/60" : "bg-[#FF5E14]"
                  : "invisible"
              )} />
            </button>
          );
        })}
      </div>

      {/* Contador de clases */}
      <p className="text-[10px] text-[#444] uppercase tracking-[0.08em] mb-3">
        {dayClasses.length} {dayClasses.length === 1 ? "clase disponible" : "clases disponibles"}
      </p>

      {/* Cards de clases */}
      {dayClasses.length === 0 ? (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] py-10 text-center">
          <p className="text-[#444] text-sm">No hay clases programadas este día</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayClasses.map(cls => {
            const booking = myBookings.find(b => b.class_id === cls.id);
            return <PortalClassCard key={cls.id} scheduledClass={cls} myBooking={booking} />;
          })}
        </div>
      )}
    </div>
  );
}
