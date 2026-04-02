// register.actions.ts — Server action de registro para GymBase
// Usa auth.admin.createUser() con el service role key para crear el usuario
// independientemente de si "Enable email signup" está activado en Supabase.

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

const gymRegisterSchema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export async function registerMember(formData: FormData): Promise<ActionResult> {
  const raw = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = gymRegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { full_name, email, password } = parsed.data;
  const adminClient = createAdminClient();

  // Crear el usuario con service role — bypasea "Enable email signup" del proyecto.
  // email_confirm: true auto-confirma sin requerir SMTP.
  const { error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: "member" },
  });

  if (createError) {
    console.error("[registerMember] Error:", createError.message, createError.code);

    if (createError.message.includes("already registered") || createError.code === "email_exists") {
      return { success: false, error: "Este correo ya está registrado. Inicia sesión o usa '¿Olvidaste tu contraseña?'." };
    }
    return { success: false, error: "Error al crear la cuenta. Intenta de nuevo." };
  }

  // Iniciar sesión automáticamente con las credenciales recién creadas
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("[registerMember] Error al iniciar sesión post-registro:", signInError.message);
    redirect("/login");
  }

  redirect("/portal/dashboard");
}
