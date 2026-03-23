// layout.tsx — Layout del portal del cliente con navbar superior

import { PortalNav } from "@/components/portal/PortalNav";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Obtener el perfil actual para mostrar el nombre en la navbar
  const profile = await getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PortalNav profile={profile} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
