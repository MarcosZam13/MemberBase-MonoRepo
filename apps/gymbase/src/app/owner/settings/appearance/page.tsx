// page.tsx — Configuración visual del gym: presets de diseño, color primario y logo

import { redirect } from 'next/navigation'
import { getOrgAppearance } from '@/actions/settings.actions'
import { AppearanceClient } from '@/components/owner/AppearanceClient'
import { DEFAULT_ORG_CONFIG } from '@core/types/org-config'
import { Paintbrush } from 'lucide-react'

export default async function AppearancePage(): Promise<React.ReactElement> {
  const appearance = await getOrgAppearance()

  // getOrgAppearance retorna null si el usuario no tiene rol owner
  if (!appearance) redirect('/login')

  const initialConfig = {
    colors: appearance.colors ?? DEFAULT_ORG_CONFIG.colors,
    design: appearance.design ?? DEFAULT_ORG_CONFIG.design,
    media: appearance.media ?? DEFAULT_ORG_CONFIG.media,
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-[#FF5E14]/15 border border-[#FF5E14]/25 flex items-center justify-center">
            <Paintbrush size={17} className="text-[#FF5E14]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-barlow tracking-wide uppercase">
              Apariencia
            </h1>
            <p className="text-sm text-[#737373]">
              Personaliza los colores y estilo visual de tu gym
            </p>
          </div>
        </div>
      </div>

      {/* Editor con preview */}
      <AppearanceClient initialConfig={initialConfig} />
    </div>
  )
}
