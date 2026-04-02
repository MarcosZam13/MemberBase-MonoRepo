// WeekView.tsx — Grid semanal de clases con columnas de tiempo (estilo calendario)
// Cliente para poder importar date-fns-tz (no disponible en Server Components con Turbopack)

"use client";

import { ClassBlock } from "./ClassBlock";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";
import { utcToLocalDate, utcToLocalDateKey, todayLocalDateKey } from "@/lib/time";

interface WeekViewProps {
  classes: ScheduledClass[];
  myBookings: ClassBooking[];
  // ISO string del lunes de la semana (calculado en UTC por el servidor)
  weekStart: string;
}

// Horas visibles en el grid (6am a 9pm)
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
// Altura en px de cada hora en el grid
const HOUR_HEIGHT = 60;

const DOW_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatHour(h: number): string {
  return h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
}

// Calcula top y height usando la hora LOCAL del gym (America/Costa_Rica via date-fns-tz)
// Independiente del timezone del navegador o del servidor
function getBlockStyle(startsAt: string, endsAt: string): { top: number; height: number } {
  const start = utcToLocalDate(startsAt);
  const end = utcToLocalDate(endsAt);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const gridStartMinutes = HOURS[0] * 60;
  const top = ((startMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 32);
  return { top, height };
}

function overlaps(a: ScheduledClass, b: ScheduledClass): boolean {
  return (
    new Date(a.starts_at).getTime() < new Date(b.ends_at).getTime() &&
    new Date(b.starts_at).getTime() < new Date(a.ends_at).getTime()
  );
}

// Asigna columnas a clases que se solapan en el mismo día usando interval coloring
function computeColumnLayout(
  dayClasses: ScheduledClass[]
): Map<string, { col: number; totalCols: number }> {
  const result = new Map<string, { col: number; totalCols: number }>();
  if (dayClasses.length === 0) return result;

  const sorted = [...dayClasses].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const processed = new Set<string>();

  for (const cls of sorted) {
    if (processed.has(cls.id)) continue;

    // BFS para encontrar el cluster completo de clases transitivamente solapadas
    const cluster: ScheduledClass[] = [];
    const queue: ScheduledClass[] = [cls];
    const visited = new Set<string>([cls.id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      cluster.push(current);
      for (const other of sorted) {
        if (!visited.has(other.id) && overlaps(current, other)) {
          visited.add(other.id);
          queue.push(other);
        }
      }
    }

    cluster.forEach((c) => processed.add(c.id));

    const clusterSorted = [...cluster].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
    const colEndTimes: number[] = [];
    const colAssign = new Map<string, number>();

    for (const event of clusterSorted) {
      const start = new Date(event.starts_at).getTime();
      const end = new Date(event.ends_at).getTime();
      let col = colEndTimes.findIndex((t) => t <= start);
      if (col === -1) {
        col = colEndTimes.length;
        colEndTimes.push(end);
      } else {
        colEndTimes[col] = end;
      }
      colAssign.set(event.id, col);
    }

    const totalCols = colEndTimes.length;
    for (const event of cluster) {
      result.set(event.id, { col: colAssign.get(event.id) ?? 0, totalCols });
    }
  }

  return result;
}

export function WeekView({ classes, myBookings, weekStart }: WeekViewProps): React.ReactNode {
  // Fecha de hoy en la zona horaria del gym para resaltar la columna correcta
  const todayKey = todayLocalDateKey();

  // Generar los 7 días a partir del weekStart usando aritmética UTC
  // (el servidor calculó weekStart como lunes UTC, mantenemos coherencia)
  const weekStartDate = new Date(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setUTCDate(weekStartDate.getUTCDate() + i);
    return d;
  });

  // Agrupar clases por fecha LOCAL del gym para asignarlas al día correcto del grid
  const classesByDay = new Map<string, ScheduledClass[]>();
  for (const cls of classes) {
    const key = utcToLocalDateKey(cls.starts_at);
    if (!classesByDay.has(key)) classesByDay.set(key, []);
    classesByDay.get(key)!.push(cls);
  }

  const totalGridHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <div className="bg-[#0D0D0D] border border-[#1e1e1e] rounded-[18px] overflow-hidden">
      {/* Encabezado con días */}
      <div className="grid border-b border-[#1a1a1a]" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
        <div className="border-r border-[#111]" />
        {days.map((day, i) => {
          // dateKey en la zona horaria del gym para comparar con todayKey
          const dateKey = utcToLocalDateKey(day.toISOString());
          const isToday = dateKey === todayKey;
          // getUTCDate para obtener el número de día coherente con el weekStart UTC
          const dayNumber = day.getUTCDate();
          return (
            <div key={i} className="py-3 px-2 text-center border-r border-[#111] last:border-r-0">
              <div className="text-[10px] text-[#555] uppercase font-semibold tracking-[0.06em]">
                {DOW_SHORT[i]}
              </div>
              <div className={`text-[20px] font-bold leading-tight mt-0.5 font-barlow ${isToday ? "text-[#FF5E14]" : "text-white"}`}>
                {dayNumber}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid de horas + días con scroll vertical */}
      <div className="overflow-y-auto" style={{ maxHeight: "580px" }}>
        <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>

          {/* Columna de horas */}
          <div className="border-r border-[#111]">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex items-start justify-end pr-2 border-b border-[#111]"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="text-[9px] text-[#333] font-barlow font-semibold pt-1.5">
                  {formatHour(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {days.map((day, i) => {
            const dateKey = utcToLocalDateKey(day.toISOString());
            const dayClasses = classesByDay.get(dateKey) ?? [];
            const isToday = dateKey === todayKey;
            const layout = computeColumnLayout(dayClasses);

            return (
              <div
                key={i}
                className={`relative border-r border-[#111] last:border-r-0 ${isToday ? "bg-[rgba(255,94,20,0.015)]" : ""}`}
                style={{ height: totalGridHeight }}
              >
                {/* Líneas de hora */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-b border-[#111]"
                    style={{ top: (h - HOURS[0]) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Bloques de clase */}
                {dayClasses.map((cls) => {
                  const { top, height } = getBlockStyle(cls.starts_at, cls.ends_at);
                  const { col, totalCols } = layout.get(cls.id) ?? { col: 0, totalCols: 1 };
                  const booking = myBookings.find((b) => b.class_id === cls.id);
                  return (
                    <ClassBlock
                      key={cls.id}
                      scheduledClass={cls}
                      myBooking={booking}
                      top={top}
                      height={height}
                      col={col}
                      totalCols={totalCols}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
