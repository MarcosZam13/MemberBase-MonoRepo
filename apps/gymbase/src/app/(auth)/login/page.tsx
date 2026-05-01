// page.tsx — Página de login de GymBase con soporte para Google OAuth
import { LoginForm } from "@core/components/auth/LoginForm";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

// Mensajes de error para los códigos que llegan desde /auth/callback
const oauthErrorMessages: Record<string, string> = {
  oauth_failed: "No se pudo iniciar sesión con Google. Intenta de nuevo.",
  admin_oauth_not_allowed: "Los administradores deben iniciar sesión con email y contraseña.",
  invalid_link: "El enlace expiró o ya fue usado. Solicita uno nuevo.",
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const oauthError = params.error
    ? (oauthErrorMessages[params.error] ?? null)
    : null;

  return (
    <>
      <LoginForm oauthError={oauthError} />

      {/* Divider entre email/password y OAuth */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div
            className="w-full border-t"
            style={{ borderColor: "var(--gym-border)" }}
          />
        </div>
        <div className="relative flex justify-center text-xs">
          <span
            className="px-3"
            style={{
              backgroundColor: "var(--gym-bg-base)",
              color: "var(--gym-text-ghost)",
            }}
          >
            o continúa con
          </span>
        </div>
      </div>

      <GoogleSignInButton />

      <p
        className="mt-3 text-center text-xs"
        style={{ color: "var(--gym-text-ghost)" }}
      >
        Si tu gym te creó una cuenta, puedes entrar con Google usando el mismo
        correo.
      </p>
    </>
  );
}
