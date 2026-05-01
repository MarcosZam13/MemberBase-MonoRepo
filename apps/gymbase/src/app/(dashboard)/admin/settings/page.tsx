// page.tsx — Página de configuración del gym: datos editables y gestión de admins

import { getCurrentUser } from "@/lib/supabase/server";
import { getOrgSettings, getAdmins } from "@/actions/settings.actions";
import { SettingsClient } from "./SettingsClient";
import { redirect } from "next/navigation";

export default async function SettingsPage(): Promise<React.ReactNode> {
  const user = await getCurrentUser();
  // Admins y owners acceden — admins solo ven gestión de roles, owners también configuración del gym
  if (!user || (user.role !== "owner" && user.role !== "admin")) redirect("/admin");

  const [settings, admins] = await Promise.all([getOrgSettings(), getAdmins()]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground text-sm">
          {user.role === "owner"
            ? "Gestiona la información del gym y los administradores del panel."
            : "Gestiona los administradores del panel."}
        </p>
      </div>

      <SettingsClient
        settings={settings}
        admins={admins}
        currentUserId={user.id}
        currentUserRole={user.role}
      />
    </div>
  );
}
