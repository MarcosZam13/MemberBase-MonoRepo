// get-org-config.ts — Lee la configuración visual del gym desde el header x-org-config inyectado por middleware

import { headers } from 'next/headers'
import { DEFAULT_ORG_CONFIG } from '@core/types/org-config'
import type { OrgConfig } from '@core/types/org-config'

// El middleware inyecta x-org-config en cada request con la configuración del gym.
// Si el header no existe (dev sin middleware, o fallo de red), usa el DEFAULT_ORG_CONFIG.
export async function getOrgConfig(): Promise<OrgConfig> {
  const headersList = await headers()
  const configStr = headersList.get('x-org-config')
  if (!configStr) return DEFAULT_ORG_CONFIG
  try {
    const parsed = JSON.parse(configStr) as OrgConfig
    return { ...DEFAULT_ORG_CONFIG, ...parsed }
  } catch {
    return DEFAULT_ORG_CONFIG
  }
}
