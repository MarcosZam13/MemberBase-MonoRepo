// page.tsx — Gestión de pagos con tema oscuro consistente con el panel admin de GymBase

import { getAllPaymentsAdmin } from "@/actions/payment.actions";
import { GymPaymentsClient } from "@/components/gym/payments/GymPaymentsClient";

export default async function PaymentsPage(): Promise<React.ReactNode> {
  const payments = await getAllPaymentsAdmin();
  return (
    <div className="p-6">
      <GymPaymentsClient initialPayments={payments} />
    </div>
  );
}
