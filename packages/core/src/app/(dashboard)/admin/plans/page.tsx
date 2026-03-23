// page.tsx — Gestión de planes de membresía (CRUD)

import { PlansClient } from "./PlansClient";
import { getPlans } from "@/actions/membership.actions";

export default async function PlansPage() {
  const plans = await getPlans();
  return <PlansClient initialPlans={plans} />;
}
