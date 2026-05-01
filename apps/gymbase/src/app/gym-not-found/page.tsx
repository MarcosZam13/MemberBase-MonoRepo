// gym-not-found/page.tsx — Página de error cuando el dominio no corresponde a ningún gym registrado

export default function GymNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4 text-white">
      <div className="text-center">
        <p className="text-6xl font-bold text-[#FF5E14]">404</p>
        <h1 className="mt-4 font-['Barlow_Condensed'] text-4xl font-bold uppercase tracking-wide">
          Gym no encontrado
        </h1>
        <p className="mt-3 text-[#737373]">
          El dominio que ingresaste no corresponde a ningún gym registrado.
        </p>
        <a
          href="https://gymbase.app"
          className="mt-8 inline-block text-sm text-[#FF5E14] underline-offset-4 hover:underline"
        >
          ¿Querés registrar tu gym? → gymbase.app
        </a>
      </div>
    </div>
  );
}
