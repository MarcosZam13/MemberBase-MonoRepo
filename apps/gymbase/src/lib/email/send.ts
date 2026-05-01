// send.ts — Helpers de envío de emails transaccionales del módulo de calendario

import { resend, FROM_EMAIL } from "./resend";
import { ClassCancelledEmail } from "./templates/ClassCancelledEmail";
import { ClassWaitlistConfirmedEmail } from "./templates/ClassWaitlistConfirmedEmail";

// Formato de fecha/hora legible en español (Costa Rica)
function formatClassDate(date: Date): string {
  return date.toLocaleString("es-CR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Costa_Rica",
  });
}

// Envía notificación de cancelación de clase — fallo no interrumpe el flujo principal
export async function sendClassCancelledEmail(params: {
  memberEmail: string;
  memberName: string;
  className: string;
  classDate: Date;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.memberEmail,
      subject: `Tu clase ${params.className} del ${formatClassDate(params.classDate)} fue cancelada`,
      react: ClassCancelledEmail({
        memberName: params.memberName,
        className: params.className,
        classDate: formatClassDate(params.classDate),
      }),
    });
  } catch (error) {
    console.error("[sendClassCancelledEmail] Error al enviar:", error);
  }
}

// Envía notificación de confirmación desde lista de espera — fallo no interrumpe el flujo principal
export async function sendWaitlistConfirmedEmail(params: {
  memberEmail: string;
  memberName: string;
  className: string;
  classDate: Date;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.memberEmail,
      subject: `¡Conseguiste un lugar en ${params.className}!`,
      react: ClassWaitlistConfirmedEmail({
        memberName: params.memberName,
        className: params.className,
        classDate: formatClassDate(params.classDate),
      }),
    });
  } catch (error) {
    console.error("[sendWaitlistConfirmedEmail] Error al enviar:", error);
  }
}
