// MemberProfileEditForm.tsx — Formulario para editar nombre, teléfono y avatar de un miembro (admin)

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Pencil, X, Check } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { updateMemberProfile } from "@/actions/member.actions";

const schema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
  avatar_url: z.string().url("URL inválida").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface MemberProfileEditFormProps {
  memberId: string;
  initialName: string | null;
  initialPhone: string | null;
  initialAvatarUrl?: string | null;
}

export function MemberProfileEditForm({
  memberId,
  initialName,
  initialPhone,
  initialAvatarUrl,
}: MemberProfileEditFormProps): React.ReactNode {
  const [editing, setEditing] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initialName ?? "",
      phone: initialPhone ?? "",
      avatar_url: initialAvatarUrl ?? "",
    },
  });

  function handleCancel(): void {
    reset({ full_name: initialName ?? "", phone: initialPhone ?? "", avatar_url: initialAvatarUrl ?? "" });
    setEditing(false);
  }

  async function onSubmit(data: FormValues): Promise<void> {
    const result = await updateMemberProfile(memberId, {
      full_name: data.full_name,
      phone: data.phone || null,
      avatar_url: data.avatar_url || null,
    });
    if (result.success) {
      toast.success("Perfil actualizado");
      setEditing(false);
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al guardar los cambios";
      toast.error(msg);
    }
  }

  if (!editing) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 cursor-pointer"
        onClick={() => setEditing(true)}
      >
        <Pencil className="w-3.5 h-3.5" />
        Editar contacto
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-3 p-3 rounded-lg border border-border bg-muted/30">
      <div className="space-y-1.5">
        <Label htmlFor="edit_full_name">Nombre completo</Label>
        <Input id="edit_full_name" placeholder="Juan Pérez" {...register("full_name")} />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_phone">Teléfono</Label>
        <Input id="edit_phone" placeholder="8888-1234" {...register("phone")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit_avatar_url">URL de foto de perfil</Label>
        <Input
          id="edit_avatar_url"
          placeholder="https://ejemplo.com/foto.jpg"
          {...register("avatar_url")}
        />
        {errors.avatar_url && <p className="text-xs text-destructive">{errors.avatar_url.message}</p>}
        <p className="text-[10px] text-muted-foreground">Opcional — link a imagen externa (JPG, PNG, etc.)</p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5 cursor-pointer">
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Guardar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleCancel} className="gap-1.5 cursor-pointer">
          <X className="w-3.5 h-3.5" />
          Cancelar
        </Button>
      </div>
    </form>
  );
}
