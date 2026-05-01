<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Documentación de contexto

Lee primero `docs/obsidian/` para entender el proyecto:

- `docs/obsidian/_CONTEXTO-IA.md` — Historia, decisiones y contexto del proyecto
- `docs/obsidian/_ESTADO-ACTUAL.md` — Estado actual de implementación
- `docs/obsidian/Roadmap GymBase — Demo Completa.md` — Planificación y milestones
- `docs/obsidian/arquitectura/` — Decisiones técnicas, multi-tenancy, schema de Supabase
- `docs/obsidian/features/` — Especificaciones de cada módulo (CheckIn, Rutinas, Pagos, etc.)
- `docs/obsidian/deploy/` — Runbooks y checklists de deployment

**Nota:** Esta documentación está sincronizada desde Obsidian. No editarla aquí directamente; el flujo es unidireccional: Obsidian → repo.

---

## Testing

El proyecto usa **Vitest** + **React Testing Library** para tests en `apps/gymbase`.

### Comandos

```bash
cd apps/gymbase

# Run tests (watch mode)
pnpm test

# Run tests once
pnpm test:run

# Run tests con UI
pnpm test:ui
```

### Cómo escribir tests

1. **Validaciones Zod** — Tests de schema en `src/lib/validations/*.test.ts`
2. **Componentes** — Tests en el mismo folder del componente
3. **Mocks** — Usar `src/test/setup.ts` para agregar mocks globales

### Ejemplo

```typescript
import { describe, it, expect } from 'vitest'
import { loginSchema } from '@core/lib/validations/auth'

describe('loginSchema', () => {
  it('debería validar un login correcto', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '123456' })
    expect(result.success).toBe(true)
  })
})
```

### Importante

- **Ejecutar `pnpm test:run` antes de cada commit** para verificar que no rompiste tests existentes
- Los imports desde `@memberbase/core` usar alias `@core`
- Los tests deben ser rápidos (< 1s cada uno)
