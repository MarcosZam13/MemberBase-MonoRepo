// page.tsx — Landing page pública de MemberBase

import Link from "next/link";
import { Check, ArrowRight, Shield, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlans } from "@/actions/membership.actions";
import { formatPrice } from "@/lib/utils";
import { themeConfig } from "@/lib/theme";

export default async function LandingPage() {
  const plans = await getPlans(true);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar pública */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">{themeConfig.brand.name}</span>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Crear cuenta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge className="bg-white/20 text-primary-foreground border-white/30">
            ✨ Plataforma de membresías
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            {themeConfig.brand.name}
          </h1>
          <p className="text-xl opacity-80 max-w-2xl mx-auto">
            {themeConfig.brand.tagline}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link href="/register" className="gap-2">
                Comenzar ahora <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 text-primary-foreground hover:bg-white/10"
            >
              <Link href="/login">Ya tengo cuenta</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Características */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">¿Por qué elegirnos?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Acceso inmediato",
                desc: "Una vez aprobado tu pago, accedes al contenido al instante.",
              },
              {
                icon: Shield,
                title: "Pago seguro",
                desc: "Proceso de pago manual y verificado por nuestro equipo.",
              },
              {
                icon: Users,
                title: "Contenido exclusivo",
                desc: "Material de calidad disponible solo para miembros activos.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes */}
      {plans.length > 0 && (
        <section className="py-16 px-4 bg-muted">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">Nuestros planes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold text-primary">
                      {formatPrice(plan.price, plan.currency)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        / {plan.duration_days} días
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="w-full">
                      <Link href="/register">Suscribirme</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 px-4 mt-auto">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {themeConfig.brand.name}. Todos los derechos reservados.
          </p>
          {themeConfig.contact.email && (
            <p className="mt-1">Contacto: {themeConfig.contact.email}</p>
          )}
        </div>
      </footer>
    </div>
  );
}
