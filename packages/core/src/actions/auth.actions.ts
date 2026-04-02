// auth.actions.ts — Server actions para registro, login y logout de usuarios

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import type { ActionResult } from "@/types/database";

// Máximo de intentos fallidos permitidos antes de bloquear temporalmente
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

// Inicia sesión con email y contraseña, redirige según el rol del usuario
export async function signIn(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  // Validar formato antes de llamar a Supabase
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();

  // Verificar cuántos intentos fallidos recientes tiene este email
  const { data: attemptCount, error: rpcError } = await supabase.rpc(
    "count_recent_login_attempts",
    { p_identifier: parsed.data.email, p_minutes: RATE_LIMIT_WINDOW_MINUTES }
  );

  if (!rpcError && attemptCount >= MAX_LOGIN_ATTEMPTS) {
    return {
      success: false,
      error: `Demasiados intentos fallidos. Espera ${RATE_LIMIT_WINDOW_MINUTES} minutos antes de intentar de nuevo.`,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Registrar el intento fallido para el rate limiting
    await supabase.from("login_attempts").insert({ identifier: parsed.data.email });
    // Limpiar intentos viejos en segundo plano para no acumular registros
    await supabase.rpc("cleanup_old_login_attempts");

    // No exponer detalles internos del error al cliente
    console.error("[signIn] Error de autenticación:", error.message);
    return { success: false, error: "Correo o contraseña incorrectos" };
  }

  // Consultar el rol para determinar la redirección correcta
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Error al obtener la sesión" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Redirigir al panel correspondiente según el rol
  redirect(profile?.role === "admin" ? "/admin" : "/portal/dashboard");
}

// Registra un nuevo usuario y crea su perfil en la base de datos
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // El trigger handle_new_user() usará este metadata para crear el perfil
      data: { full_name: parsed.data.full_name },
    },
  });

  if (error) {
    console.error("[signUp] Error al registrar:", error.message, error.code);

    // Mapear los errores más comunes de Supabase a mensajes claros para el usuario
    if (error.message.includes("already registered") || error.code === "user_already_exists") {
      return { success: false, error: "Este correo ya está registrado. Inicia sesión o usa '¿Olvidaste tu contraseña?'." };
    }
    if (error.message.includes("Signup") && error.message.includes("disabled") || error.code === "signup_disabled") {
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

// Cierra la sesión del usuario y redirige al login
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Envía el correo de recuperación de contraseña al email indicado
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const emailParsed = z.string().email("Correo inválido").safeParse(email);
  if (!emailParsed.success) return { success: false, error: "Correo inválido" };

  const supabase = await createClient();
  // redirectTo debe apuntar a la página de reset del app que lo llame
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(emailParsed.data, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    console.error("[requestPasswordReset] Error:", error.message);
    // Responder con éxito genérico para no revelar si el email existe
  }
  return { success: true };
}

// Actualiza la contraseña del usuario autenticado (flujo post-link de reset)
export async function updatePassword(newPassword: string): Promise<ActionResult> {
  const parsed = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").safeParse(newPassword);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });

  if (error) {
    console.error("[updatePassword] Error:", error.message);
    return { success: false, error: "Error al actualizar la contraseña. El enlace puede haber expirado." };
  }
  return { success: true };
}
