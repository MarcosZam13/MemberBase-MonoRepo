// AppearanceClient.tsx — Editor visual de apariencia del gym con preview en tiempo real

'use client'

import { useState, useTransition, useEffect } from 'react'
import { DESIGN_PRESETS } from '@core/types/design-presets'
import type { OrgConfig, DesignPreset } from '@core/types/org-config'
import { saveOrgAppearance } from '@/actions/settings.actions'
import { applyThemeToDOM } from '@/lib/theme-vars'
import { toast } from 'sonner'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Label } from '@core/components/ui/label'
import { Check, Save, Palette, Link2 } from 'lucide-react'

interface AppearanceClientProps {
  initialConfig: Pick<OrgConfig, 'colors' | 'design' | 'media'>
}

export function AppearanceClient({ initialConfig }: AppearanceClientProps) {
  const [config, setConfig] = useState(initialConfig)
  const [isPending, startTransition] = useTransition()

  // Aplica los CSS vars al <html> en tiempo real a medida que el usuario edita —
  // el middleware tiene cache de 60s, así que sin esto los cambios no serían visibles hasta reload
  useEffect(() => {
    applyThemeToDOM(config)
  }, [config])

  function handlePresetSelect(preset: DesignPreset) {
    const t = DESIGN_PRESETS[preset].tokens
    setConfig(prev => ({
      ...prev,
      design: {
        ...prev.design,
        preset,
        cardRadius: t.cardRadius ?? prev.design.cardRadius,
        font: t.font ?? prev.design.font,
        headingFont: t.headingFont ?? prev.design.headingFont,
        shadow: t.shadow ?? prev.design.shadow,
      },
      colors: {
        ...prev.colors,
        // El preset cambia los colores base pero preserva el primary personalizado del gym
        background: t.background ?? prev.colors.background,
        surface: t.surface ?? prev.colors.surface,
        border: t.border ?? prev.colors.border,
      },
    }))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveOrgAppearance(config)
      if (result.success) {
        toast.success('Configuración visual guardada. Los cambios se aplican en el próximo request.')
      } else {
        toast.error(typeof result.error === 'string' ? result.error : 'Error al guardar la configuración')
      }
    })
  }

  const p = config.colors.primary
  const bg = config.colors.background
  const surface = config.colors.surface
  const border = config.colors.border
  const radius = config.design.cardRadius

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ── Panel de configuración ─────────────────────────────── */}
      <div className="lg:col-span-2 space-y-8">

        {/* Selector de preset */}
        <section>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Palette size={16} style={{ color: p }} />
            Estilo base
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(DESIGN_PRESETS) as [DesignPreset, typeof DESIGN_PRESETS[DesignPreset]][]).map(
              ([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetSelect(key)}
                  className={[
                    'relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer',
                    config.design.preset === key
                      ? 'border-[#FF5E14] bg-[#FF5E14]/5'
                      : 'border-[#1E1E1E] bg-[#111111] hover:border-[#2A2A2A]',
                  ].join(' ')}
                >
                  {/* Mini preview del preset */}
                  <div
                    className="w-full h-16 rounded-lg mb-3 border overflow-hidden relative"
                    style={{
                      backgroundColor: preset.preview.bg,
                      borderColor: preset.preview.border,
                      borderRadius: preset.preview.radius,
                    }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 h-8 border-t"
                      style={{ backgroundColor: preset.preview.surface, borderColor: preset.preview.border }}
                    />
                    {/* Barra accent del preset usando el primary actual */}
                    <div className="absolute top-2 left-2 w-8 h-2 rounded-full" style={{ backgroundColor: p }} />
                    <div
                      className="absolute top-2 right-2 w-2 h-2 rounded-full"
                      style={{ backgroundColor: p, opacity: 0.5 }}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{preset.label}</p>
                      <p className="text-xs text-[#737373] mt-0.5 leading-snug">{preset.description}</p>
                    </div>
                    {config.design.preset === key && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: p }}>
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>
              )
            )}
          </div>
        </section>

        {/* Color principal */}
        <section>
          <h2 className="text-base font-semibold text-white mb-4">Color principal</h2>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={config.colors.primary}
              onChange={(e) =>
                setConfig(prev => ({ ...prev, colors: { ...prev.colors, primary: e.target.value } }))
              }
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-[#1E1E1E] bg-transparent p-0.5"
            />
            <div>
              <Input
                value={config.colors.primary}
                onChange={(e) =>
                  setConfig(prev => ({ ...prev, colors: { ...prev.colors, primary: e.target.value } }))
                }
                placeholder="#FF5E14"
                maxLength={7}
                className="font-mono w-32 bg-[#111111] border-[#1E1E1E] text-white"
              />
              <p className="text-xs text-[#737373] mt-1">Botones, elementos activos, sidebar</p>
            </div>
          </div>
        </section>

        {/* Color de fondo */}
        <section>
          <h2 className="text-base font-semibold text-white mb-4">Color de fondo</h2>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={config.colors.background}
              onChange={(e) =>
                setConfig(prev => ({ ...prev, colors: { ...prev.colors, background: e.target.value } }))
              }
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-[#1E1E1E] bg-transparent p-0.5"
            />
            <div>
              <Input
                value={config.colors.background}
                onChange={(e) =>
                  setConfig(prev => ({ ...prev, colors: { ...prev.colors, background: e.target.value } }))
                }
                placeholder="#0A0A0A"
                maxLength={7}
                className="font-mono w-32 bg-[#111111] border-[#1E1E1E] text-white"
              />
              <p className="text-xs text-[#737373] mt-1">Fondo principal de la aplicación</p>
            </div>
          </div>
        </section>

        {/* Logo del gym */}
        <section>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Link2 size={16} className="text-[#737373]" />
            Logo del gym
          </h2>
          <div className="space-y-2">
            <Label className="text-[#A3A3A3] text-sm">URL del logo</Label>
            <Input
              value={config.media.logoUrl ?? ''}
              onChange={(e) =>
                setConfig(prev => ({
                  ...prev,
                  media: { ...prev.media, logoUrl: e.target.value || null },
                }))
              }
              placeholder="https://cdn.ejemplo.com/logo.png"
              className="bg-[#111111] border-[#1E1E1E] text-white"
            />
            <p className="text-xs text-[#737373]">PNG o SVG con fondo transparente, formato cuadrado recomendado</p>
          </div>
          {config.media.logoUrl && (
            <div className="mt-3 p-3 bg-[#111111] border border-[#1E1E1E] rounded-xl inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.media.logoUrl} alt="Logo preview" className="h-10 w-auto" />
            </div>
          )}
        </section>

        {/* Guardar */}
        <div className="pt-4 border-t border-[#1E1E1E]">
          <Button
            onClick={handleSave}
            disabled={isPending}
            style={{ backgroundColor: p }}
            className="text-white font-semibold px-6 hover:opacity-90"
          >
            <Save size={15} className="mr-2" />
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          <p className="text-xs text-[#737373] mt-2">
            Los cambios se aplican en el próximo request (el cache del middleware expira en 1 minuto).
          </p>
        </div>
      </div>

      {/* ── Preview en tiempo real ──────────────────────────────── */}
      <div className="lg:col-span-1">
        <h2 className="text-base font-semibold text-white mb-4">Preview</h2>
        <div
          className="overflow-hidden border"
          style={{ backgroundColor: bg, borderColor: border, borderRadius: radius }}
        >
          {/* Mini nav */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ backgroundColor: surface, borderColor: border }}
          >
            <div className="w-5 h-5 rounded-md" style={{ backgroundColor: p }} />
            <div className="flex items-center gap-1.5 flex-1">
              <div className="w-10 h-1.5 rounded-full" style={{ backgroundColor: p }} />
              <div className="w-7 h-1.5 rounded-full opacity-30" style={{ backgroundColor: config.colors.text }} />
              <div className="w-7 h-1.5 rounded-full opacity-30" style={{ backgroundColor: config.colors.text }} />
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Card miembro */}
            <div
              className="border p-4"
              style={{ backgroundColor: surface, borderColor: border, borderRadius: radius }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: p }} />
                <div className="flex-1 space-y-1.5">
                  <div className="w-20 h-2 rounded-full" style={{ backgroundColor: config.colors.text }} />
                  <div className="w-14 h-1.5 rounded-full" style={{ backgroundColor: config.colors.textMuted }} />
                </div>
                <div
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${p}25`, color: p, borderRadius: radius }}
                >
                  Activo
                </div>
              </div>
              {/* Barra de membresía */}
              <div className="w-full h-1.5 rounded-full mb-1" style={{ backgroundColor: border }} />
              <div className="w-3/4 h-1.5 rounded-full -mt-2.5" style={{ backgroundColor: p }} />
              {/* Botón */}
              <div
                className="w-full h-7 rounded-lg mt-3 flex items-center justify-center"
                style={{ backgroundColor: p, borderRadius: radius }}
              >
                <div className="w-14 h-1.5 rounded-full bg-white opacity-80" />
              </div>
            </div>

            {/* Mini stat cards */}
            <div className="grid grid-cols-2 gap-2">
              {([0, 1] as const).map((i) => (
                <div
                  key={i}
                  className="border p-3"
                  style={{ backgroundColor: surface, borderColor: border, borderRadius: radius }}
                >
                  <div className="w-4 h-4 rounded-md mb-2" style={{ backgroundColor: i === 0 ? p : border }} />
                  <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: border }} />
                  <div className="w-3/4 h-1.5 rounded-full mt-1" style={{ backgroundColor: border, opacity: 0.5 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-[#737373] mt-2 text-center">
          Vista previa aproximada — los cambios reales pueden variar
        </p>
      </div>
    </div>
  )
}
