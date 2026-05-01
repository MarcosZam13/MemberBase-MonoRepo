// PortalClassCard.tsx — Card de clase para la vista del portal del miembro

"use client";

import { useState } from "react";
import { Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { bookClass, cancelMyBooking } from "@/actions/calendar.actions";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";

interface PortalClassCardProps {
  scheduledClass: ScheduledClass;
  myBooking?: ClassBooking;
}

export function PortalClassCard({ scheduledClass, myBooking }: PortalClassCardProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);

  const color = scheduledClass.class_type?.color ?? "#FF5E14";
  const startTime = new Date(scheduledClass.starts_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  const endTime = new Date(scheduledClass.ends_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  const bookings = scheduledClass.bookings_count ?? 0;
  const maxCapacity = scheduledClass.max_capacity ?? 0;
  const capacityPct = maxCapacity > 0 ? Math.min(100, (bookings / maxCapacity) * 100) : 0;
  const isFull = maxCapacity > 0 && bookings >= maxCapacity;

  // Color de la barra de capacidad según el llenado
  const barColor = capacityPct >= 90 ? "#EF4444" : capacityPct >= 70 ? "#FACC15" : color;

  // Estado de la reserva del miembro
  const isWaitlisted = myBooking?.status === "waitlist";
  const isConfirmed = myBooking?.status === "confirmed";

  // Borde con acento naranja si hay reserva confirmada, amarillo si está en espera
  const cardBorder = isConfirmed
    ? "border-[rgba(255,94,20,0.3)] bg-[#140d06]"
    : isWaitlisted
    ? "border-[rgba(250,204,21,0.25)] bg-[#111108]"
    : "border-[#1e1e1e] hover:border-[#2a2a2a]";

  async function handleBook(): Promise<void> {
    setIsLoading(true);
    const result = await bookClass({ class_id: scheduledClass.id });
    if (result.success) {
      if (result.data?.waitlisted) {
        toast.info("Estás en lista de espera. Te notificaremos si se libera un cupo.");
      }
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al reservar";
      toast.error(msg);
    }
    setIsLoading(false);
  }

  async function handleCancel(): Promise<void> {
    if (!myBooking) return;
    setIsLoading(true);
    const result = await cancelMyBooking(myBooking.id);
    if (!result.success) {
      const msg = typeof result.error === "string" ? result.error : "Error al cancelar";
      toast.error(msg);
    }
    setIsLoading(false);
  }

  const title = scheduledClass.title || scheduledClass.class_type?.name || "Clase";

  return (
    <div className={`bg-[#111] border rounded-[16px] px-4 py-3.5 transition-all ${cardBorder}`}>
      <div className="flex gap-3 items-start mb-3">
        {/* Barra de color izquierda */}
        <div className="w-1 rounded-full self-stretch flex-shrink-0" style={{ backgroundColor: color, minHeight: "36px" }} />

        {/* Nombre + meta */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
          <p className="text-[11px] text-[#555] mt-0.5 flex gap-1.5 flex-wrap">
            {scheduledClass.location && <span>{scheduledClass.location}</span>}
          </p>
        </div>

        {/* Hora + duración */}
        <div className="text-right flex-shrink-0">
          <div className="text-base font-bold font-barlow text-white leading-tight">
            {startTime}
          </div>
          <div className="text-[10px] text-[#555] mt-0.5">
            {(() => {
              const mins = (new Date(scheduledClass.ends_at).getTime() - new Date(scheduledClass.starts_at).getTime()) / 60000;
              return mins >= 60 ? `${mins / 60}h` : `${mins} min`;
            })()}
          </div>
        </div>
      </div>

      {/* Footer: barra de cupos + botón */}
      <div className="flex items-center gap-3">
        {maxCapacity > 0 ? (
          <>
            <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${capacityPct}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: barColor }}>
              {bookings}/{maxCapacity}
            </span>
          </>
        ) : (
          <div className="flex-1" />
        )}

        {/* Acciones */}
        {!scheduledClass.is_cancelled && (
          <div className="flex-shrink-0">
            {isConfirmed ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[rgba(255,94,20,0.1)] border border-[rgba(255,94,20,0.25)] text-[#FF5E14]">
                  Reservada
                </span>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-[rgba(255,94,20,0.3)] text-[#FF5E14] hover:bg-[rgba(255,94,20,0.08)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Cancelar"}
                </button>
              </div>
            ) : isWaitlisted ? (
              // Badge de lista de espera + opción a cancelar
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[rgba(250,204,21,0.1)] border border-[rgba(250,204,21,0.25)] text-[#FACC15] flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  En espera
                </span>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-[rgba(250,204,21,0.2)] text-[#FACC15] hover:bg-[rgba(250,204,21,0.06)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Salir"}
                </button>
              </div>
            ) : isFull ? (
              // Clase llena → entrar a waitlist
              <button
                onClick={handleBook}
                disabled={isLoading}
                className="text-[11px] px-3 py-1.5 rounded-lg font-medium border border-[rgba(250,204,21,0.3)] text-[#FACC15] hover:bg-[rgba(250,204,21,0.08)] transition-colors cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Lista de espera"}
              </button>
            ) : (
              <button
                onClick={handleBook}
                disabled={isLoading}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-88 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: color }}
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Reservar"}
              </button>
            )}
          </div>
        )}
      </div>

      {scheduledClass.is_cancelled && (
        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
          <p className="text-xs text-[#EF4444] font-medium">Clase cancelada</p>
        </div>
      )}
    </div>
  );
}
