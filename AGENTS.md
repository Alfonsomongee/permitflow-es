# PermitFlow ES — Contexto para asistente de código

> Lee este archivo completo antes de escribir una sola línea.
> Si algo no está claro, pregunta antes de asumir.

---

## Qué es este proyecto

Software SaaS B2B que clasifica automáticamente los trámites administrativos
necesarios para cualquier instalación técnica (fotovoltaica, climatización,
ACS, gas, BT) en España, genera la documentación requerida y gestiona el
seguimiento de expedientes.

Cliente objetivo: instaladoras técnicas y gestorías de tramitación.
Modelo: suscripción mensual (79€ / 149€ / 299€).
Objetivo a medio plazo: adquisición por empresa grande del sector energético.

---

## Stack — decisiones cerradas, no cambiar sin consultar

```
Frontend:        Next.js 14 (App Router) + TypeScript estricto
Estilos:         Tailwind CSS + shadcn/ui
Backend:         FastAPI (Python 3.11+)
Base de datos:   PostgreSQL vía Supabase
ORM:             SQLAlchemy 2.0 + Alembic (migraciones)
Caché:           Redis (sesiones, clasificaciones frecuentes)
Auth:            Clerk (multi-tenant desde el día 1)
Pagos:           Stripe (suscripciones + SCA europeo)
IA principal:    DeepSeek API — modelo deepseek-chat (DeepSeek-V3)
                 → toda la lógica de IA en fase inicial: extracción de
                   normativa del BOE, relleno de formularios, consultas
IA futura:       Claude API — claude-sonnet-4-6 (migración cuando haya key)
                 → el cliente está diseñado para que el cambio sea mínimo
Ubicaciones:     Google Cloud APIs
                 → Geocoding API: convierte dirección/municipio en CCAA+provincia
                   (crítico para seleccionar la normativa correcta)
                 → Places API: autocompletado de direcciones en el formulario
                 → Maps JavaScript API: visualización opcional (fase 2)
PDFs:            pypdf + reportlab
Email:           Resend
Hosting:         Vercel (frontend) + Railway (backend Python)
Monitoreo:       Sentry + PostHog
CI/CD:           GitHub Actions
Gestor paquetes: pnpm (frontend) / uv (Python)
```

### APIs de Google — activar en Google Cloud Console
Antes de arrancar el backend, activar estas tres APIs en
console.cloud.google.com → APIs y servicios → Habilitar APIs:
1. Geocoding API
2. Places API (New)
3. Maps JavaScript API (opcional, fase 2)

### Uso de la Geocoding API en el clasificador
Cuando el usuario introduce municipio + provincia, el backend resuelve
la CCAA automáticamente en lugar de pedírsela explícitamente:

```python
# servicios/geocoding_client.py
async def resolver_comunidad_autonoma(
    municipio: str,
    provincia: str,
) -> str:
    """
    Llama a Google Geocoding API y extrae el campo
    administrative_area_level_1 para determinar la CCAA.
    Mapea el nombre de la CA al slug interno (ej: 'Andalucía' → 'andalucia').
    """
```

---

## Estructura del monorepo — respetar exactamente

```
permitflow-es/
├── apps/
│   ├── web/                        # Next.js 14
│   │   ├── app/
│   │   │   ├── (auth)/             # /login, /registro
│   │   │   ├── (dashboard)/        # App principal autenticada
│   │   │   │   ├── nueva-instalacion/
│   │   │   │   ├── expedientes/
│   │   │   │   │   └── [id]/
│   │   │   │   └── ajustes/
│   │   │   └── (marketing)/        # Landing page pública
│   │   ├── components/
│   │   │   ├── ui/                 # Componentes shadcn/ui
│   │   │   ├── expedientes/        # Componentes de dominio
│   │   │   ├── clasificador/
│   │   │   └── layouts/
│   │   ├── lib/
│   │   │   ├── api-client.ts       # Cliente HTTP hacia FastAPI
│   │   │   ├── auth.ts             # Helpers de Clerk
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts            # Tipos TypeScript compartidos en frontend
│   │
│   └── api/                        # FastAPI
│       ├── main.py                 # Entrada principal
│       ├── config.py               # Variables de entorno
│       ├── database.py             # Conexión Supabase/PostgreSQL
│       ├── models/                 # SQLAlchemy models
│       │   ├── organizacion.py
│       │   ├── usuario.py
│       │   ├── expediente.py
│       │   ├── tramite.py
│       │   └── documento.py
│       ├── routers/                # Endpoints FastAPI
│       │   ├── clasificador.py
│       │   ├── documentos.py
│       │   ├── expedientes.py
│       │   └── usuarios.py
│       ├── motor_normativo/        # Núcleo diferencial — leer con atención
│       │   ├── clasificador.py     # Lógica del árbol de decisión
│       │   ├── validador.py        # Validación de inputs
│       │   └── reglas/             # JSONs de trámites por CA
│       │       ├── andalucia/
│       │       │   ├── fotovoltaica.json
│       │       │   ├── climatizacion.json
│       │       │   └── acs.json
│       │       └── _schema.json    # Schema de validación de los JSONs de reglas
│       ├── servicios/
│       │   ├── claude_client.py    # Wrapper Claude API
│       │   ├── pdf_generator.py    # Generación de documentos
│       │   └── notificaciones.py   # Emails vía Resend
│       ├── schemas/                # Pydantic schemas (request/response)
│       │   ├── clasificador.py
│       │   ├── expediente.py
│       │   └── usuario.py
│       └── tests/
│           ├── test_clasificador.py
│           └── test_api.py
│
├── packages/
│   └── types/                      # Tipos compartidos (si se necesitan)
│
├── docs/
│   ├── normativa/                  # PDFs y fuentes normativas descargadas
│   ├── decisiones/                 # ADRs: por qué se tomó cada decisión
│   └── motor-normativo.md          # Documentación del árbol de decisión
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Tests en cada PR
│       └── deploy.yml              # Deploy automático en merge a main
│
├── AGENTS.md                       # Este archivo
├── .env.example                    # Variables requeridas (sin valores reales)
├── .gitignore
└── pnpm-workspace.yaml
```

---

## Variables de entorno requeridas

Copiar `.env.example` a `.env.local` (frontend) y `.env` (api). Nunca commitear valores reales.

```bash
# Frontend (apps/web/.env.local)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=      # Para Places API (autocompletado)

# Backend (apps/api/.env)
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
DEEPSEEK_API_KEY=                     # DeepSeek API — IA principal (fase inicial)
ANTHROPIC_API_KEY=                    # Claude API — dejar vacío hasta tener key
GOOGLE_MAPS_API_KEY=                  # Geocoding API — resolución de CCAA
CLERK_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SENTRY_DSN=
ENVIRONMENT=development
```

---

## Comandos de desarrollo

```bash
# Instalar todo desde la raíz
pnpm install

# Arrancar frontend (puerto 3000)
pnpm --filter web dev

# Arrancar backend (puerto 8000)
cd apps/api
uv run uvicorn main:app --reload

# Migraciones de base de datos
cd apps/api
uv run alembic upgrade head

# Tests del backend
cd apps/api
uv run pytest

# Build de producción del frontend
pnpm --filter web build
```

---

## Convenciones de código

### TypeScript (frontend)
- Tipado estricto siempre: `strict: true` en tsconfig
- No usar `any`. Si es inevitable, comentar por qué
- Componentes: functional components con tipos explícitos en props
- Nombres de archivos: kebab-case (`nueva-instalacion.tsx`)
- Nombres de componentes: PascalCase (`NuevaInstalacion`)
- Imports: absolutos desde `@/` (configurado en tsconfig)
- Estado global: Zustand (añadir si se necesita, no Redux)
- Fetching: SWR o React Query para datos del servidor

### Python (backend)
- Python 3.11+ con type hints en todas las funciones
- Pydantic v2 para schemas de request/response
- SQLAlchemy 2.0 con sintaxis nueva (no legacy)
- Nombres: snake_case para todo
- Un archivo por modelo, un archivo por router
- Cada router tiene su propio prefijo: `/api/v1/clasificador`, etc.
- Tests con pytest; al menos un test por endpoint nuevo

### Git
- Commits en inglés, imperativos: `add`, `fix`, `refactor`, no `added`, `fixed`
- Formato: `tipo(scope): descripción` — ej: `feat(clasificador): add andalucia fotovoltaica rules`
- Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Una rama por feature: `feature/clasificador-andalucia`, `fix/pdf-generation`
- PRs antes de mergear a main (aunque seas solo tú)

---

## El motor normativo — leer con atención

Es el componente más crítico del producto. Contiene el conocimiento diferencial.

### Cómo funciona

Cada tipo de instalación en cada comunidad autónoma tiene un JSON en `motor_normativo/reglas/`.
El clasificador lee ese JSON, evalúa las condiciones según los parámetros del input,
y devuelve la lista ordenada de trámites aplicables.

### Estructura de un JSON de reglas

```json
{
  "tipo_instalacion": "fotovoltaica_autoconsumo",
  "comunidad": "andalucia",
  "version": "1.0.0",
  "ultima_revision": "2026-06-01",
  "fuentes": [
    "RD 244/2019",
    "Decreto 141/2012 Andalucía"
  ],
  "reglas": [
    {
      "id": "AND-FV-001",
      "condicion": "potencia_kw <= 10 AND uso == 'residencial'",
      "tramites": [
        {
          "orden": 1,
          "nombre": "Comunicación previa a la distribuidora",
          "organismo": "Distribuidora de zona",
          "base_legal": "RD 244/2019, Art. 12",
          "plazo_estimado_dias": 15,
          "documentos_requeridos": ["solicitud_conexion", "esquema_unifilar"],
          "formulario_ref": "AND_FV_DIST_001",
          "notas": ""
        }
      ]
    }
  ]
}
```

### Reglas para modificar el motor normativo

1. Cada cambio en un JSON de reglas debe tener su ADR en `docs/decisiones/`
2. Incluir siempre la fuente legal (RD, Decreto, artículo)
3. Versionar el JSON (semver: mayor si cambia estructura, menor si añade regla)
4. Añadir test en `test_clasificador.py` para cada nueva regla
5. Nunca eliminar una regla — marcar como `"obsoleta": true` con fecha

---


---

## Cliente de IA — diseño para migración sin fricción

El cliente de IA vive en `servicios/ai_client.py` y expone una interfaz
única independiente del proveedor. Cambiar de DeepSeek a Claude es modificar
dos líneas, no refactorizar el código.

### Interfaz del cliente

```python
# servicios/ai_client.py

from openai import AsyncOpenAI  # DeepSeek es compatible con la OpenAI SDK
from config import settings

# --- Configuración del proveedor activo ---
# Para cambiar a Claude: sustituir base_url y api_key, cambiar model en cada llamada

_client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com",  # ← cambiar a "https://api.anthropic.com" para Claude
)

DEFAULT_MODEL = "deepseek-chat"  # ← cambiar a "claude-sonnet-4-6" para Claude


async def completar(
    prompt: str,
    system: str = "",
    max_tokens: int = 1000,
    temperatura: float = 0.1,   # baja por defecto — respuestas deterministas
    json_mode: bool = False,
) -> str:
    """
    Interfaz única para llamadas de IA.
    Devuelve el texto de la respuesta como string.
    Si json_mode=True, fuerza respuesta JSON válida.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperatura,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await _client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


async def completar_con_pdf(
    prompt: str,
    pdf_texto: str,
    system: str = "",
    max_tokens: int = 2000,
) -> str:
    """
    Para procesar PDFs normativos (BOE, diarios autonómicos).
    El PDF se pasa como texto extraído, no como binario.
    """
    prompt_completo = f"{prompt}\n\nTexto del documento:\n{pdf_texto}"
    return await completar(prompt_completo, system=system, max_tokens=max_tokens)
```

### Cómo migrar a Claude cuando haya API key

1. En `config.py`: añadir `ANTHROPIC_API_KEY`
2. En `ai_client.py`: cambiar `api_key`, `base_url` y `DEFAULT_MODEL`
3. Nada más. El resto del código no cambia.

### Dependencia Python a instalar

```bash
# DeepSeek usa la misma SDK que OpenAI
uv add openai
```

## Estado actual del proyecto

> Actualizar esta sección en cada sesión de trabajo.

**Fase:** 1 — Desarrollo de funcionalidades y UX

**Completado:**
- [x] Monorepo inicializado
- [x] Next.js configurado con Tailwind + shadcn/ui + Base UI
- [x] FastAPI con estructura base y endpoints de expedientes/clasificador
- [x] Supabase conectado + esquema de base de datos aplicado
- [x] Clerk configurado (auth multi-tenant)
- [x] Motor normativo y verificación de fuentes por CCAA (17/17 comunidades)
- [x] Mejoras UX B2B (Sidebar animado, Base UI Select, Command Palette `Cmd+K`, atajo `/` en tabla, autocompletado de dirección con Google Places y dynamic imports)

**En curso:**
- Validación final y optimización pre-despliegue

**Próxima tarea:**
- Probar `pnpm build` en entorno de despliegue con la clave `GOOGLE_MAPS_API_KEY` configurada

**Bloqueado:**
- Nada actualmente

---

## Lo que NO hacer sin consultar primero

- Cambiar el stack (ni añadir librerías grandes sin justificación)
- Modificar el esquema de base de datos sin crear una migración Alembic
- Cambiar la estructura del motor normativo (los JSONs de reglas)
- Añadir dependencias de terceros nuevas sin evaluar alternativas
- Hacer commits directamente a `main`
- Usar `any` en TypeScript
- Hardcodear valores que deberían ser variables de entorno

---

## Paleta de colores (Tailwind config)

```js
// tailwind.config.ts — colors a añadir
colors: {
  primary: {
    DEFAULT: '#1B4FD8',
    dark:    '#1340B0',
    light:   '#EEF3FE',
  },
  success: '#16A34A',
  warning: '#D97706',
  danger:  '#DC2626',
}
```

---

## Recursos clave

- Documento fundacional del producto: `docs/foundation.md`
- DeepSeek API: https://platform.deepseek.com/api-docs
- Claude API (futura): https://docs.anthropic.com/en/api/
- Google Geocoding API: https://developers.google.com/maps/documentation/geocoding
- Google Places API: https://developers.google.com/maps/documentation/places/web-service
- Supabase docs: https://supabase.com/docs
- Clerk docs: https://clerk.com/docs
- shadcn/ui: https://ui.shadcn.com
- BOE API: https://api.boe.es/api.php
