// layout.tsx — Layout del panel de administración: sidebar fijo + área de contenido oscura

import { GymAdminSidebar } from "@/components/gym/GymAdminSidebar";
import { getLowStockCount } from "@/actions/inventory.actions";
import { getCurrentUser } from "@/lib/supabase/server";
import { themeConfig } from "@/lib/theme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  // Precarga el conteo de stock bajo para el badge del sidebar — solo si el módulo está activo
  const [inventoryBadgeCount, user] = await Promise.all([
    themeConfig.features.gym_inventory ? getLowStockCount() : Promise.resolve(0),
    getCurrentUser(),
  ]);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--gym-bg-base)" }}>
      <GymAdminSidebar inventoryBadgeCount={inventoryBadgeCount} userRole={user?.role} />
      {/* El área de contenido no tiene max-width propio — cada página lo maneja */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: "var(--gym-bg-base)" }}>
        {children}
      </main>
    </div>
  );
}
