// GymRegisterForm.tsx — Formulario de registro que usa la acción signUp de GymBase
// (usa el cliente admin para crear el usuario, evitando restricciones de signup de Supabase)

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { registerMember } from "@/actions/register.actions";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@core/components/ui/card";
import { Alert, AlertDescription } from "@core/components/ui/alert";

const formSchema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export function GymRegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    setIsPending(true);

    const formData = new FormData();
    formData.set("full_name", data.full_name);
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("confirmPassword", data.confirmPassword);

    try {
      const result = await registerMember(formData);
      if (!result.success) {
        setServerError(typeof result.error === "string" ? result.error : "Error al crear la cuenta");
      }
    } catch {
      // WORKAROUND: Next.js redirect() lanza excepción internamente — comportamiento esperado
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Crear cuenta</CardTitle>
        <CardDescription>Completa tus datos para registrarte</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input id="full_name" type="text" placeholder="Juan Pérez" autoComplete="name" {...register("full_name")} />
            {errors.full_name && <p className="text-sm text-danger">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="tu@correo.com" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-sm text-danger">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input id="confirmPassword" type="password" placeholder="Repite tu contraseña" autoComplete="new-password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-sm text-danger">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
