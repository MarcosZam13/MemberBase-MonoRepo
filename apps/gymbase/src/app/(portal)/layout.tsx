// layout.tsx — Layout del portal del cliente: top navbar + área de contenido + bottom nav mobile

import { redirect } from "next/navigation";
import { GymPortalNav } from "@/components/gym/GymPortalNav";
import { GymPortalBottomNav } from "@/components/gym/GymPortalBottomNav";
import { SubscriptionGuard } from "@/components/gym/SubscriptionGuard";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserSubscription } from "@core/actions/payment.actions";
import { getPublicOrgInfo } from "@/actions/settings.actions";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  const [profile, subscription, orgInfo] = await Promise.all([
    getCurrentUser(),
    getUserSubscription(),
    getPublicOrgInfo(),
  ]);

  // Owner y admin tienen sus propias áreas — el portal es solo para miembros
  if (profile?.role === "owner") redirect("/owner/dashboard");
  if (profile?.role === "admin") redirect("/admin");

  // Membresía activa: estado "active" y no vencida
  const isActive =
    subscription?.status === "active" &&
    !!subscription?.expires_at &&
    new Date(subscription.expires_at) > new Date();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--gym-bg-base)" }}>
      {/* Guard client-side: redirige a /portal/membership si la membresía no está activa */}
      <SubscriptionGuard isActive={isActive} />

      {/* Navbar fijo en la parte superior — filtra links según estado de membresía */}
      <GymPortalNav profile={profile} isActive={isActive} gymName={orgInfo?.gym_name ?? undefined} />

      {/* Contenido principal — en mobile agrega padding inferior para el bottom nav */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 pt-24 pb-20 md:pb-8">
        {children}
      </main>

      {/* Bottom navigation — solo visible en mobile (<768px) */}
      <GymPortalBottomNav profile={profile} isActive={isActive} />
    </div>
  );
}
