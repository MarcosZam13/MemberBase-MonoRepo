// ClassBlock.tsx — Bloque de clase posicionado absolutamente en el grid semanal

"use client";

import { useState } from "react";
import { Loader2, Repeat2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { bookClass, cancelMyBooking, cancelClass, cancelRecurrenceSeries } from "@/actions/calendar.actions";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";
import { utcToLocalDate } from "@/lib/time";
import { toast } from "sonner";

interface ClassBlockProps {
  scheduledClass: ScheduledClass;
  myBooking?: ClassBooking;
  top: number;
  height: number;
  // Columna y total de columnas para distribuir bloques solapados lado a lado
  col: number;
  totalCols: number;
  isAdmin?: boolean;
}

// Gap en px entre bloques solapados para que se distingan visualmente
const BLOCK_GAP = 2;

export function ClassBlock({ scheduledClass, myBooking, top, height, col, totalCols, isAdmin = false }: ClassBlockProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);

  const color = scheduledClass.class_type?.color ?? "#FF5E14";
  const localStart = utcToLocalDate(scheduledClass.starts_at);
  const localEnd = utcToLocalDate(scheduledClass.ends_at);
  const pad = (n: number): string => String(n).padStart(2, "0");
  const startTime = `${pad(localStart.getHours())}:${pad(localStart.getMinutes())}`;
  const endTime = `${pad(localEnd.getHours())}:${pad(localEnd.getMinutes())}`;
  const title = scheduledClass.title || scheduledClass.class_type?.name || "Clase";
  const bookingsCount = scheduledClass.bookings_count ?? 0;
  const maxCapacity = scheduledClass.max_capacity ?? 0;
  const isRecurring = !!scheduledClass.recurrence_group_id;

  const widthPct = 100 / totalCols;
  const leftPct = col * widthPct;
  const blockLeft = `calc(${leftPct}% + ${BLOCK_GAP}px)`;
  const blockWidth = `calc(${widthPct}% - ${BLOCK_GAP * 2}px)`;

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  async function handleBook(e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    setIsLoading(true);
    const result = await bookClass({ class_id: scheduledClass.id });
    if (result.success && result.data?.waitlisted) {
      toast.info("Estás en lista de espera. Te notificaremos si se libera un cupo.");
    }
    setIsLoading(false);
  }

  async function handleCancel(e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    if (!myBooking) return;
    setIsLoading(true);
    await cancelMyBooking(myBooking.id);
    setIsLoading(false);
  }

  async function handleCancelClass(): Promise<void> {
    setIsLoading(true);
    const result = await cancelClass(scheduledClass.id);
    if (!result.success) toast.error(typeof result.error === "string" ? result.error : "Error al cancelar la clase");
    setIsLoading(false);
  }

  async function handleCancelSeries(): Promise<void> {
    if (!scheduledClass.recurrence_group_id) return;
    setIsLoading(true);
    const result = await cancelRecurrenceSeries(scheduledClass.recurrence_group_id);
    if (result.success) {
      toast.success("Serie cancelada. Los miembros serán notificados.");
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al cancelar la serie");
    }
    setIsLoading(false);
  }

  return (
    <div
      className="absolute rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden transition-all hover:brightness-125 z-10"
      style={{
        top,
        height,
        left: blockLeft,
        width: blockWidth,
        backgroundColor: hexToRgba(color, 0.18),
        borderTopWidth: "0.5px",
        borderRightWidth: "0.5px",
        borderBottomWidth: "0.5px",
        borderLeftWidth: "2.5px",
        borderTopStyle: "solid",
        borderRightStyle: "solid",
        borderBottomStyle: "solid",
        borderLeftStyle: "solid",
        borderTopColor: hexToRgba(color, 0.4),
        borderRightColor: hexToRgba(color, 0.4),
        borderBottomColor: hexToRgba(color, 0.4),
        borderLeftColor: color,
      }}
    >
      {/* Header: nombre + ícono de recurrencia */}
      <div className="flex items-start justify-between gap-0.5">
        <p className="text-[10px] font-semibold leading-tight truncate flex-1" style={{ color }}>
          {title}
        </p>
        {/* Ícono indicador de clase recurrente */}
        {isRecurring && (
          <Repeat2
            className="flex-shrink-0 mt-0.5"
            style={{ color, opacity: 0.7, width: 8, height: 8 }}
          />
        )}
      </div>

      {height > 36 && (
        <p className="text-[9px] leading-tight mt-0.5" style={{ color, opacity: 0.7 }}>
          {startTime} – {endTime}
        </p>
      )}

      {height > 52 && maxCapacity > 0 && (
        <p className="text-[9px] leading-tight mt-0.5" style={{ color, opacity: 0.6 }}>
          {bookingsCount}/{maxCapacity}
        </p>
      )}

      {height > 64 && !scheduledClass.is_cancelled && (
        <div className="mt-1 flex flex-col gap-0.5">
          {/* Acciones de miembro */}
          {!isAdmin && (myBooking ? (
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-[9px] px-1.5 py-0.5 rounded border leading-none transition-opacity hover:opacity-80"
              style={{ color, borderColor: hexToRgba(color, 0.4), backgroundColor: hexToRgba(color, 0.1) }}
            >
              {isLoading ? <Loader2 className="w-2 h-2 animate-spin inline" /> : "Cancelar"}
            </button>
          ) : (
            <button
              onClick={handleBook}
              disabled={isLoading}
              className="text-[9px] px-1.5 py-0.5 rounded leading-none text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: color }}
            >
              {isLoading ? <Loader2 className="w-2 h-2 animate-spin inline" /> : "Reservar"}
            </button>
          ))}

          {/* Acciones de admin: cancelar clase / cancelar serie */}
          {isAdmin && height > 80 && (
            <div className="flex flex-col gap-0.5">
              <AlertDialog>
                {/* En base-ui el trigger se estila directamente vía className */}
                <AlertDialogTrigger
                  className="text-[9px] px-1.5 py-0.5 rounded border leading-none text-left cursor-pointer"
                  style={{ color: "#EF4444", borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.08)" }}
                >
                  Cancelar
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar esta clase?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se notificará a todos los miembros con reserva confirmada. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelClass} className="bg-destructive hover:bg-destructive/90">
                      Cancelar clase
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Opción extra para cancelar toda la serie */}
              {isRecurring && (
                <AlertDialog>
                  <AlertDialogTrigger
                    className="text-[9px] px-1.5 py-0.5 rounded border leading-none text-left cursor-pointer"
                    style={{ color: "#FACC15", borderColor: "rgba(250,204,21,0.3)", backgroundColor: "rgba(250,204,21,0.08)" }}
                  >
                    Cancelar serie
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cancelar toda la serie?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se cancelarán todas las instancias futuras de esta serie y se notificará a los miembros afectados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Volver</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelSeries} className="bg-destructive hover:bg-destructive/90">
                        Cancelar serie completa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      )}

      {scheduledClass.is_cancelled && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
          <span className="text-[9px] text-[#EF4444] font-semibold">Cancelada</span>
        </div>
      )}
    </div>
  );
}
