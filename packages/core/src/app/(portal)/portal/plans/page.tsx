// page.tsx — Vista de planes disponibles para el cliente con flujo de suscripción

import { PlansPortalClient } from "./PlansPortalClient";
import { getPlans } from "@/actions/membership.actions";
import { getUserSubscription } from "@/actions/payment.actions";

export default async function PortalPlansPage() {
  const [plans, currentSubscription] = await Promise.all([
    getPlans(true), // Solo planes activos
    getUserSubscription(),
  ]);

  return (
    <PlansPortalClient
      plans={plans}
      currentSubscription={currentSubscription}
    />
  );
}
