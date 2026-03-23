// page.tsx — Estado de la membresía y subida de comprobante de pago

import { MembershipClient } from "./MembershipClient";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserSubscription } from "@/actions/payment.actions";

export default async function MembershipPage() {
  const [profile, subscription] = await Promise.all([
    getCurrentUser(),
    getUserSubscription(),
  ]);

  return <MembershipClient profile={profile} subscription={subscription} />;
}
