// PortalCalendarView.tsx — Vista del calendario para el miembro con week strip, navegación y filtros

"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@core/lib/utils";
import { PortalClassCard } from "./PortalClassCard";
import { getWeekSchedule } from "@/actions/calendar.actions";
import type { ScheduledClass, ClassBooking, ClassType } from "@/types/gym-calendar";

interface PortalCalendarViewProps {
  classes: ScheduledClass[];
  myBookings: ClassBooking[];
  classTypes: ClassType[];
  weekStart: Date;
}

const DOW_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Obtiene el lunes de la semana de una fecha (ISO: lunes = día 1)
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Formatea el rango de semana visible: "14 – 20 abr 2026"
function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = monday.toLocaleDateString("es-CR", opts);
  const end = sunday.toLocaleDateString("es-CR", { ...opts, year: "numeric" });
  return `${start} – ${end}`;
}

export function PortalCalendarView({ classes: initialClasses, myBookings, classTypes, weekStart }: PortalCalendarViewProps): React.ReactNode {
  const [weekOffset, setWeekOffset] = useState(0);
  const [classes, setClasses] = useState<ScheduledClass[]>(initialClasses);
  const [isPending, startTransition] = useTransition();
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calcular el lunes de la semana actual + offset
  const baseMonday = getMondayOf(weekStart);
  const currentMonday = new Date(baseMonday);
  currentMonday.setDate(baseMonday.getDate() + weekOffset * 7);
  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);
  currentSunday.setHours(23, 59, 59, 999);

  // Generar los 7 días de la semana visible
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    return d;
  });

  // Día seleccionado (hoy si está en la semana actual, sino el lunes)
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    if (weekOffset === 0) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseMonday);
        d.setDate(baseMonday.getDate() + i);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === today.getTime()) return i;
      }
    }
    return 0;
  });

  // Cargar las clases de la nueva semana cuando cambia el offset
  function navigateWeek(delta: number): void {
    if (weekOffset + delta < 0) return;
    const newOffset = weekOffset + delta;
    const newMonday = new Date(baseMonday);
    newMonday.setDate(baseMonday.getDate() + newOffset * 7);
    const newSunday = new Date(newMonday);
    newSunday.setDate(newMonday.getDate() + 6);
    newSunday.setHours(23, 59, 59, 999);

    startTransition(async () => {
      const fetched = await getWeekSchedule(newMonday.toISOString(), newSunday.toISOString());
      setClasses(fetched);
      setWeekOffset(newOffset);
      // Al navegar, seleccionar el día lunes de la nueva semana
      setSelectedDay(0);
    });
  }

  // Filtrar clases por tipo seleccionado
  const filteredClasses = activeTypeId
    ? classes.filter((c) => c.type_id === activeTypeId)
    : classes;

  // Clases del día seleccionado
  const selectedDateStr = days[selectedDay]!.toISOString().split("T")[0];
  const dayClasses = filteredClasses
    .filter((cls) => new Date(cls.starts_at).toISOString().split("T")[0] === selectedDateStr)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <div>
      {/* ── Navegación de semanas ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateWeek(-1)}
          disabled={weekOffset === 0 || isPending}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#1e1e1e] text-[#555] hover:border-[#333] hover:text-[#aaa] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-medium text-[#666] capitalize">
          {formatWeekRange(currentMonday)}
        </span>

        <button
          onClick={() => navigateWeek(1)}
          disabled={isPending}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#1e1e1e] text-[#555] hover:border-[#333] hover:text-[#aaa] disabled:opacity-30 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Week strip horizontal ── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {days.map((day, i) => {
          const dateKey = day.toISOString().split("T")[0];
          const hasClasses = filteredClasses.some((c) => new Date(c.starts_at).toISOString().split("T")[0] === dateKey);
          const isToday = day.getTime() === today.getTime();

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={cn(
                "flex-1 min-w-[44px] text-center py-2 px-1 rounded-xl border transition-all cursor-pointer",
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

      {/* ── Filtro por tipo de clase ── */}
      {classTypes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button
            onClick={() => setActiveTypeId(null)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer",
              !activeTypeId
                ? "bg-[#FF5E14] border-[#FF5E14] text-white"
                : "bg-[#161616] border-[#2a2a2a] text-[#666] hover:border-[#444]"
            )}
          >
            Todas
          </button>
          {classTypes.map((ct) => (
            <button
              key={ct.id}
              onClick={() => setActiveTypeId(activeTypeId === ct.id ? null : ct.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer",
                activeTypeId === ct.id
                  ? "text-white"
                  : "bg-[#161616] border-[#2a2a2a] text-[#666] hover:border-[#444]"
              )}
              style={activeTypeId === ct.id ? {
                backgroundColor: ct.color ?? "#FF5E14",
                borderColor: ct.color ?? "#FF5E14",
              } : {}}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: ct.color ?? "#FF5E14" }}
              />
              {ct.name}
            </button>
          ))}
        </div>
      )}

      {/* Contador + loading indicator */}
      <p className="text-[10px] text-[#444] uppercase tracking-[0.08em] mb-3">
        {isPending ? "Cargando…" : `${dayClasses.length} ${dayClasses.length === 1 ? "clase disponible" : "clases disponibles"}`}
      </p>

      {/* ── Cards de clases ── */}
      {dayClasses.length === 0 ? (
        <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[16px] py-10 text-center">
          <p className="text-[#444] text-sm">
            {isPending ? "Cargando clases…" : "No hay clases programadas este día"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayClasses.map((cls) => {
            const booking = myBookings.find((b) => b.class_id === cls.id);
            return <PortalClassCard key={cls.id} scheduledClass={cls} myBooking={booking} />;
          })}
        </div>
      )}
    </div>
  );
}
