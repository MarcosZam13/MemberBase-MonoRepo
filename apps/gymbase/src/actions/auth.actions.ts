// auth.actions.ts — Re-exporta acciones de autenticación desde core; override de signUp para org_id

"use server";

// WORKAROUND: 'use server' no permite export * desde otro módulo — se re-exportan
// como wrappers async. Requerido por Next.js 16 + Turbopack.
import {
  signIn as _signIn,
  signOut as _signOut,
  requestPasswordReset as _requestPasswordReset,
  updatePassword as _updatePassword,
} from "@core/actions/auth.actions";
import { redirect } from "next/navigation";
import { createClient, getOrgId } from "@/lib/supabase/server";
import { registerSchema } from "@core/lib/validations/auth";
import type { ActionResult } from "@/types/database";

export async function signIn(formData: FormData): ReturnType<typeof _signIn> {
  return _signIn(formData);
}

// Override: pasa org_id en options.data para que el trigger handle_new_user()
// lo asigne al perfil — sin esto, nuevos usuarios quedan sin org_id y son invisibles para RLS
export async function signUp(formData: FormData): Promise<ActionResult> {
  const raw = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const [supabase, orgId] = await Promise.all([createClient(), getOrgId()]);
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, org_id: orgId },
    },
  });

  if (error) {
    console.error("[signUp] Error al registrar:", error.message, error.code);
    if (error.message.includes("already registered") || error.code === "user_already_exists") {
      return { success: false, error: "Este correo ya está registrado. Inicia sesión o usa '¿Olvidaste tu contraseña?'." };
    }
    if ((error.message.includes("Signup") && error.message.includes("disabled")) || error.code === "signup_disabled") {
      return { success: false, error: "El registro público no está habilitado. Contacta al administrador para recibir una invitación." };
    }
    if (error.message.includes("rate limit") || error.code === "over_email_send_rate_limit") {
      return { success: false, error: "Demasiados intentos. Espera unos minutos antes de intentar de nuevo." };
    }
    if (error.message.includes("password") || error.code === "weak_password") {
      return { success: false, error: "La contraseña es demasiado débil. Usa al menos 6 caracteres." };
    }
    if (error.message.includes("email") && error.message.includes("invalid")) {
      return { success: false, error: "El formato del correo electrónico no es válido." };
    }
    return { success: false, error: "Error al crear la cuenta. Intenta de nuevo." };
  }

  redirect("/portal/dashboard");
}

export async function signOut(): ReturnType<typeof _signOut> {
  return _signOut();
}

export async function requestPasswordReset(email: string): ReturnType<typeof _requestPasswordReset> {
  return _requestPasswordReset(email);
}

export async function updatePassword(newPassword: string): ReturnType<typeof _updatePassword> {
  return _updatePassword(newPassword);
}
