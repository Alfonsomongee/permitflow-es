# PermitFlow ES

Software SaaS B2B que clasifica automáticamente los trámites administrativos
necesarios para instalaciones técnicas en España (fotovoltaica, climatización,
ACS, gas, BT), genera la documentación requerida y gestiona el seguimiento
de expedientes.

**Stack:** Next.js 14 · FastAPI · PostgreSQL (Supabase) · Clerk · Stripe · Claude API

---

## Documentación

- `AGENTS.md` — contexto completo para el agente de código (leer primero)
- `docs/foundation.md` — estrategia de producto, modelo de negocio, roadmap
- `.agents/skills/` — skills especializadas del agente por dominio

## Arranque rápido

```bash
# Instalar dependencias
pnpm install

# Variables de entorno
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env
# → Editar ambos archivos con valores reales

# Frontend (puerto 3000)
pnpm --filter web dev

# Backend (puerto 8000)
cd apps/api && uv run uvicorn main:app --reload
```

## Estado actual

Fase 0 — Inicialización. Ver `AGENTS.md` sección "Estado actual" para detalle.
