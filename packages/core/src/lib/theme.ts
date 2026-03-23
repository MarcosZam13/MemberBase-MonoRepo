// theme.ts — Re-exporta la configuración del tema para uso interno con el alias @/
// Permite importar desde @/lib/theme en lugar de rutas relativas al directorio raíz

export { themeConfig } from "../../theme.config";
export type { ThemeConfig } from "../../theme.config";
