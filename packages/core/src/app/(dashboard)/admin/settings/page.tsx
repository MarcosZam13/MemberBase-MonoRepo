// page.tsx — Página de configuración del panel admin (muestra la config actual del tema)

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { themeConfig } from "@/lib/theme";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Para personalizar la marca, edita el archivo{" "}
          <code className="bg-muted px-1 rounded text-sm">theme.config.ts</code> en la raíz del proyecto.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información de la marca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre</span>
              <span className="font-medium">{themeConfig.brand.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slogan</span>
              <span className="font-medium">{themeConfig.brand.tagline}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número SINPE</span>
              <span className="font-medium font-mono">{themeConfig.payment.sinpe_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Instrucciones:</span>
              <p className="mt-1 text-foreground">{themeConfig.payment.instructions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Colores del tema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(themeConfig.colors).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{key}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded border border-border"
                    style={{ backgroundColor: value }}
                  />
                  <span className="font-mono text-xs">{value}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Módulos activos</CardTitle>
            <CardDescription>Activar en theme.config.ts → features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(themeConfig.features).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-muted-foreground capitalize">{key}</span>
                <span className={value ? "text-success font-medium" : "text-muted-foreground"}>
                  {value ? "Activo" : "Inactivo"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
