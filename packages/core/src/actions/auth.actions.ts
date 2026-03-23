// auth.actions.ts — Server actions para registro, login y logout de usuarios

"use server";

import { redirect } from "next/navigation";
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
    console.error("[signUp] Error al registrar:", error.message);

    // Diferenciar error de email ya registrado sin exponer detalles internos
    if (error.message.includes("already registered")) {
      return { success: false, error: "Este correo ya está registrado" };
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
