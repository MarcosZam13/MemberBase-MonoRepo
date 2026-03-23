// page.tsx — Revisión de comprobantes de pago pendientes

import { PaymentsClient } from "./PaymentsClient";
import { getPendingPayments } from "@/actions/payment.actions";

export default async function PaymentsPage() {
  const payments = await getPendingPayments();
  return <PaymentsClient initialPayments={payments} />;
}
