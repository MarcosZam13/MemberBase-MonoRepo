// page.tsx — Vista de planes disponibles para el cliente con flujo de suscripción

import { PlansPortalClient } from "@core/app/(portal)/portal/plans/PlansPortalClient";
import { getPlans } from "@core/actions/membership.actions";
import { getUserSubscription } from "@core/actions/payment.actions";
import { getPublicOrgInfo } from "@/actions/settings.actions";

export default async function PortalPlansPage(): Promise<React.ReactNode> {
  const [plans, currentSubscription, orgInfo] = await Promise.all([
    getPlans(true),
    getUserSubscription(),
    getPublicOrgInfo(),
  ]);

  return (
    <PlansPortalClient
      plans={plans}
      currentSubscription={currentSubscription}
      sinpeNumber={orgInfo?.sinpe_number}
      sinpeName={orgInfo?.sinpe_name}
    />
  );
}
