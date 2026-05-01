// SettingsClient.tsx — Componente cliente para editar configuración del gym y administradores

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, X, Shield, Settings, CreditCard, Crown } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@core/components/ui/card";
import { updateOrgSettings, revokeAdmin } from "@/actions/settings.actions";
import type { OrgSettings, AdminProfile } from "@/actions/settings.actions";
import { AddAdminDialog } from "@/components/gym/settings/AddAdminDialog";

const settingsFormSchema = z.object({
  gym_name: z.string().min(1, "El nombre es requerido").max(100),
  slogan: z.string().max(200).optional().or(z.literal("")),
  sinpe_number: z.string().max(20).optional().or(z.literal("")),
  sinpe_name: z.string().max(100).optional().or(z.literal("")),
  max_capacity: z.number().int().min(1).max(10000).optional().nullable(),
  cancel_minutes: z.number().int().min(0).max(1440).optional().nullable(),
});
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface SettingsClientProps {
  settings: OrgSettings | null;
  admins: AdminProfile[];
  currentUserId: string;
  currentUserRole: string;
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  owner: { label: "Owner",         bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  admin: { label: "Administrador", bg: "bg-primary/10",   text: "text-primary",   border: "border-primary/20" },
};

export function SettingsClient({ settings, admins: initialAdmins, currentUserId, currentUserRole }: SettingsClientProps): React.ReactNode {
  const [admins, setAdmins] = useState<AdminProfile[]>(initialAdmins);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      gym_name: settings?.gym_name ?? "",
      slogan: settings?.slogan ?? "",
      sinpe_number: settings?.sinpe_number ?? "",
      sinpe_name: settings?.sinpe_name ?? "",
      max_capacity: settings?.max_capacity ?? null,
      cancel_minutes: settings?.cancel_minutes ?? null,
    },
  });

  async function onSubmitSettings(data: SettingsFormValues): Promise<void> {
    const result = await updateOrgSettings({
      ...data,
      slogan: data.slogan || null,
      sinpe_number: data.sinpe_number || null,
      sinpe_name: data.sinpe_name || null,
    });
    if (result.success) {
      toast.success("Configuración guardada");
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al guardar");
    }
  }

  async function handleRevoke(userId: string): Promise<void> {
    setRevokeLoading(userId);
    const result = await revokeAdmin(userId);
    setRevokeLoading(null);
    if (result.success) {
      toast.success("Permisos revocados");
      setAdmins(prev => prev.filter(a => a.id !== userId));
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al revocar permisos");
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ——— Sección 1: Información del Gym — solo owners ——— */}
      {isOwner && settings && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Información del gym</CardTitle>
            </div>
            <CardDescription>Datos visibles en la app y en los comprobantes de pago</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitSettings)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gym_name">Nombre del gym</Label>
                  <Input id="gym_name" placeholder="Ej: FitPro Studio" {...register("gym_name")} />
                  {errors.gym_name && <p className="text-xs text-destructive">{errors.gym_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="slogan">Eslogan</Label>
                  <Input id="slogan" placeholder="Ej: Entrena diferente" {...register("slogan")} />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Información de pago SINPE</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sinpe_number">Número SINPE</Label>
                    <Input id="sinpe_number" placeholder="8888-1234" {...register("sinpe_number")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sinpe_name">Nombre registrado en SINPE</Label>
                    <Input id="sinpe_name" placeholder="Juan Pérez" {...register("sinpe_name")} />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <span className="text-sm font-medium block mb-3">Capacidad y clases</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="max_capacity">Aforo máximo del gym</Label>
                    <Input
                      id="max_capacity"
                      type="number"
                      min={1}
                      max={10000}
                      placeholder="50"
                      {...register("max_capacity", { valueAsNumber: true })}
                    />
                    {errors.max_capacity && <p className="text-xs text-destructive">{errors.max_capacity.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cancel_minutes">Minutos mín. para cancelar clase</Label>
                    <Input
                      id="cancel_minutes"
                      type="number"
                      min={0}
                      max={1440}
                      placeholder="60"
                      {...register("cancel_minutes", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">0 = sin restricción</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ——— Sección 2: Equipo de administración ——— */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Equipo de administración</CardTitle>
            </div>
            {/* Botón que abre el modal de búsqueda */}
            <AddAdminDialog
              isOwner={isOwner}
              onSuccess={(profile) => setAdmins(prev => [...prev, profile])}
            />
          </div>
          <CardDescription>
            {isOwner
              ? "Administradores y owners con acceso al panel"
              : "Usuarios con acceso al panel de administración"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {admins.map((admin) => {
              const roleCfg = ROLE_CONFIG[admin.role] ?? ROLE_CONFIG.admin;
              const canRevoke =
                admin.id !== currentUserId &&
                !(currentUserRole === "admin" && admin.role === "owner");

              return (
                <div
                  key={admin.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{admin.full_name ?? admin.email}</p>
                      {admin.full_name && (
                        <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${roleCfg.bg} ${roleCfg.text} ${roleCfg.border}`}>
                      {admin.role === "owner" && <Crown className="w-2.5 h-2.5" />}
                      {roleCfg.label}
                    </span>
                  </div>

                  {admin.id === currentUserId ? (
                    <span className="text-xs text-muted-foreground shrink-0">Tú</span>
                  ) : canRevoke ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-destructive hover:text-destructive h-7 text-xs shrink-0"
                      disabled={revokeLoading === admin.id}
                      onClick={() => handleRevoke(admin.id)}
                    >
                      {revokeLoading === admin.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <X className="w-3 h-3" />
                      }
                      Revocar
                    </Button>
                  ) : null}
                </div>
              );
            })}

            {admins.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay administradores registrados.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
