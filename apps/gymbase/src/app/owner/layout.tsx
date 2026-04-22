// layout.tsx — Layout del portal owner con verificación de rol y sidebar independiente

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const supabase = await createClient();

  // Verificar sesión activa
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verificar rol owner — doble verificación en layout para proteger toda la sección
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    redirect(profile?.role === "admin" ? "/admin" : "/portal/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <OwnerSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
