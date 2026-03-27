// WeekView.tsx — Grid semanal de clases con columnas de tiempo (estilo calendario)

import { ClassBlock } from "./ClassBlock";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";

interface WeekViewProps {
  classes: ScheduledClass[];
  myBookings: ClassBooking[];
  weekStart: Date;
}

// Horas visibles en el grid (6am a 9pm)
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
// Altura en px de cada hora en el grid
const HOUR_HEIGHT = 52;

const DOW_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatHour(h: number): string {
  return h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
}

// Calcula la posición top y height del bloque según los horarios
function getBlockStyle(startsAt: string, endsAt: string): { top: number; height: number } {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const gridStartMinutes = HOURS[0] * 60;
  const top = ((startMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 28);
  return { top, height };
}

export function WeekView({ classes, myBookings, weekStart }: WeekViewProps): React.ReactNode {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generar los 7 días de la semana a partir del lunes
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Agrupar clases por fecha ISO (YYYY-MM-DD)
  const classesByDay = new Map<string, ScheduledClass[]>();
  for (const cls of classes) {
    const key = new Date(cls.starts_at).toISOString().split("T")[0];
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
          const isToday = day.getTime() === today.getTime();
          return (
            <div key={i} className="py-3 px-2 text-center border-r border-[#111] last:border-r-0">
              <div className="text-[10px] text-[#555] uppercase font-semibold tracking-[0.06em]">
                {DOW_SHORT[i]}
              </div>
              <div className={`text-[20px] font-bold leading-tight mt-0.5 font-barlow ${isToday ? "text-[#FF5E14]" : "text-white"}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid de horas + días */}
      <div className="overflow-y-auto" style={{ maxHeight: "520px" }}>
        <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>

          {/* Columna de horas */}
          <div className="border-r border-[#111]">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex items-start justify-end pr-2 border-b border-[#111]"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="text-[9px] text-[#333] font-barlow font-semibold pt-1">
                  {formatHour(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {days.map((day, i) => {
            const dateKey = day.toISOString().split("T")[0];
            const dayClasses = classesByDay.get(dateKey) ?? [];
            const isToday = day.getTime() === today.getTime();

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
                  const booking = myBookings.find((b) => b.class_id === cls.id);
                  return (
                    <ClassBlock
                      key={cls.id}
                      scheduledClass={cls}
                      myBooking={booking}
                      top={top}
                      height={height}
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
