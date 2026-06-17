# PermitFlow ES — Documento Fundacional
> Versión 1.0 — Junio 2026  
> Para uso interno del fundador. Actualizar con cada decisión relevante.

---

## 0. Resumen ejecutivo en una frase

**PermitFlow ES es el software que dice a cualquier instaladora exactamente qué trámites hacer, con qué documentos, ante qué organismo y en qué orden — para cualquier tipo de instalación técnica en España.**

---

## 1. El problema

### 1.1 Descripción técnica del dolor

Una instaladora mediana española (10–20 técnicos, ~200 instalaciones/año) tarda entre **4 y 12 horas por expediente** en resolver la tramitación administrativa. Ese tiempo se distribuye así:

- ~2h identificando qué trámites aplican (normativa fragmentada por CCAA)
- ~2h localizando formularios vigentes (cambian con cada legislatura autonómica)
- ~2h rellenando documentación técnica tipo
- ~2–6h en seguimiento, correcciones y comunicación con organismos

Los errores de tramitación generan **paralizaciones de obra** con coste de 500–3.000€ por expediente. Las normativas relevantes incluyen:

- RITE (Reglamento de Instalaciones Térmicas)
- REBT (Reglamento Electrotécnico de Baja Tensión)
- CTE (Código Técnico de la Edificación)
- RD 244/2019 (autoconsumo fotovoltaico)
- RD 1183/2020 (acceso y conexión a red)
- Normativas autonómicas propias (Decreto 141/2012 en Andalucía, etc.)
- Ordenanzas municipales (variables por ayuntamiento)

### 1.2 A quién le duele más

| Perfil | Por qué duele | Disposición a pagar |
|---|---|---|
| Instaladora mediana (10–20 técnicos) | Volumen alto, sin departamento legal | Alta |
| Gestoría técnica especializada | Su negocio ES tramitar, la eficiencia es su margen | Muy alta |
| Instaladora pequeña (1–5 técnicos) | El propio técnico tramita, tiempo es dinero | Media |
| Ingeniero/ingeniera técnico freelance | Acepta proyectos por toda España, normativa desconocida | Alta |

### 1.3 Por qué no está resuelto

- Requiere conocimiento técnico de instalaciones + conocimiento legal + capacidad de software
- Nadie con los tres perfiles juntos lo ha atacado
- La administración lleva años "digitalizando" sin resolver la fragmentación entre organismos
- Los ERP de instaladoras (Solarwin, SAP, etc.) no tocan la capa normativa

---

## 2. La solución

### 2.1 Qué hace PermitFlow ES

Un motor de clasificación normativa que, dados los parámetros de una instalación, devuelve el **plan de tramitación completo**: trámites obligatorios, organismos, documentación, plazos y formularios rellenados.

### 2.2 Tres módulos core

**Módulo 1 — Clasificador de trámites**
- Input: tipo instalación + CA + municipio + potencia/superficie + uso
- Output: lista ordenada de trámites con organismo responsable, documentación requerida y plazo estimado real

**Módulo 2 — Generador de documentación**
- Rellena automáticamente formularios oficiales con datos del proyecto
- Genera memorias técnicas tipo editables por el usuario
- Produce checklists de documentación por expediente

**Módulo 3 — Panel de seguimiento**
- Estado de cada expediente en tiempo real
- Alertas de vencimiento
- Histórico de tramitaciones (dato diferencial a largo plazo)

### 2.3 Flujo de usuario tipo

```
1. Nueva instalación
   → El usuario introduce: tipo, CA, municipio, potencia, uso
   
2. Clasificación automática (< 3 segundos)
   → El sistema devuelve: trámites necesarios + orden + organismos
   
3. Generación de documentos
   → El usuario introduce datos específicos del proyecto
   → El sistema genera: formularios, memoria tipo, checklist
   
4. Seguimiento
   → El expediente queda en el panel
   → Alertas de plazos activas
   → Estado actualizable por el usuario
```

---

## 3. Mercado y competencia

### 3.1 Tamaño de mercado

- Instaladoras registradas en España: ~25.000
- Gestorías técnicas especializadas: ~2.000–3.000
- Target inicial (Andalucía): ~3.500 instaladoras + ~400 gestorías
- Precio objetivo: 80–150€/mes por sede
- TAM España: ~3M€/mes → ~36M€/año en suscripciones
- TAM Europa (mercado equivalente, sin producto): ~300M€/año

### 3.2 Competencia directa

**No existe.** Esto es una ventana real.

Productos adyacentes que no resuelven el problema:
- **ERP de instaladoras** (Solarwin, Suelo Solar): gestión de obra, no tramitación
- **Portales autonómicos** (Industria): solo tramitación digital propia, sin integración cruzada
- **PermitFlow EEUU**: construcción, no instalaciones técnicas, no Europa
- **Gestorías tradicionales**: servicio humano, no escalable, caro

### 3.3 Riesgo competitivo real

- Una consultora grande podría atacarlo si ve tracción (12–18 meses de ventaja)
- La administración podría digitalizar (lleva 15 años sin lograrlo, riesgo bajo a 3 años)
- Un ERP existente podría añadir el módulo (pero no tienen el conocimiento normativo)

---

## 4. Modelo de negocio

### 4.1 Pricing

| Plan | Precio/mes | Target | Incluye |
|---|---|---|---|
| **Básico** | 79€ | Instaladora pequeña, freelance | Clasificador + documentos (20 expedientes/mes) |
| **Profesional** | 149€ | Instaladora mediana | Todo ilimitado + panel de seguimiento |
| **Gestoría** | 299€ | Gestorías técnicas | Multi-cliente + API + soporte prioritario |

### 4.2 Métricas objetivo (año 1)

- **MRR objetivo mes 12:** 15.000€ (100 clientes de pago)
- **Churn objetivo:** < 5% mensual (el producto tiene stickiness alto)
- **CAC objetivo:** < 300€ (adquisición vía asociaciones + directo)
- **LTV objetivo:** > 2.400€ (vida media > 16 meses)

### 4.3 Ingresos secundarios

- **Datos agregados anonimizados**: plazos reales por organismo, tasas de error — vendibles a aseguradoras, consultoras
- **API para ERP**: licensing a Solarwin u otros para integrar el clasificador
- **Formación**: webinars sobre tramitación para instaladores (upsell y adquisición)

---

## 5. Stack tecnológico

### 5.1 Decisiones de stack y su justificación

```
Frontend:       Next.js 14 (App Router) + TypeScript
                → SSR para SEO, ecosistema maduro, tú lo dominas

Estilos:        Tailwind CSS + shadcn/ui
                → Velocidad de desarrollo, componentes accesibles por defecto

Backend:        FastAPI (Python)
                → La lógica normativa en Python es natural (árboles de decisión,
                   procesamiento de PDFs del BOE, integración con IA)

Base de datos:  PostgreSQL (principal) + Redis (caché de sesiones y clasificaciones)
                → Supabase como hosting managed en fase inicial

ORM:            SQLAlchemy + Alembic (migraciones)

Motor normativo: JSON schema + Python
                → El grafo de trámites es un árbol de decisión en JSON versionado
                   con Git, procesado por Python

IA:             Claude API (claude-sonnet-4-6)
                → Interpretación de PDFs normativos nuevos
                → Relleno inteligente de campos ambiguos en formularios
                → Asistente de consultas normativas (feature futura)

Formularios PDF: pypdf + reportlab
                → Manipulación y generación de PDFs oficiales

Auth:           Clerk
                → Auth gestionado, multi-tenant desde el día 1

Pagos:          Stripe
                → Suscripciones, facturas automáticas, SCA europeo

Email:          Resend
                → Transaccional, plantillas en React

Hosting:        Vercel (frontend) + Railway o Render (backend Python)
                → Sin gestión de infraestructura hasta escala real

Monitoreo:      Sentry (errores) + PostHog (analytics de producto)

Control de versiones: GitHub (monorepo)

CI/CD:          GitHub Actions
```

### 5.2 Estructura del monorepo

```
permitflow-es/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, registro
│   │   │   ├── (dashboard)/    # App principal
│   │   │   │   ├── nueva-instalacion/
│   │   │   │   ├── expedientes/
│   │   │   │   └── ajustes/
│   │   │   └── (marketing)/    # Landing page
│   │   └── components/
│   └── api/                    # FastAPI backend
│       ├── routers/
│       │   ├── clasificador.py
│       │   ├── documentos.py
│       │   ├── expedientes.py
│       │   └── usuarios.py
│       ├── motor_normativo/    # El núcleo diferencial
│       │   ├── clasificador.py
│       │   ├── reglas/         # JSONs por CA
│       │   │   ├── andalucia.json
│       │   │   ├── cataluna.json
│       │   │   └── ...
│       │   └── validador.py
│       └── servicios/
│           ├── claude_client.py
│           ├── pdf_generator.py
│           └── notificaciones.py
├── packages/
│   ├── ui/                     # Componentes compartidos
│   └── types/                  # TypeScript types compartidos
└── docs/                       # Documentación interna
    ├── normativa/              # PDFs y notas de fuentes normativas
    └── decisiones/             # ADRs (Architecture Decision Records)
```

### 5.3 Esquema de base de datos (tablas principales)

```sql
-- Organizaciones (instaladoras, gestorías)
CREATE TABLE organizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('instaladora', 'gestoria', 'freelance')),
  plan TEXT CHECK (plan IN ('basico', 'profesional', 'gestoria')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,  -- sincronizado con Clerk
  organizacion_id UUID REFERENCES organizaciones(id),
  email TEXT NOT NULL,
  rol TEXT CHECK (rol IN ('admin', 'tecnico', 'consulta')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expedientes
CREATE TABLE expedientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id UUID REFERENCES organizaciones(id),
  referencia TEXT NOT NULL,  -- referencia interna del usuario
  tipo_instalacion TEXT NOT NULL,
  comunidad_autonoma TEXT NOT NULL,
  municipio TEXT NOT NULL,
  potencia_kw DECIMAL,
  superficie_m2 DECIMAL,
  uso TEXT CHECK (uso IN ('residencial', 'terciario', 'industrial')),
  estado TEXT DEFAULT 'clasificado',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trámites (resultado del clasificador)
CREATE TABLE tramites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID REFERENCES expedientes(id),
  orden INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  organismo TEXT NOT NULL,
  plazo_dias_estimado INTEGER,
  estado TEXT DEFAULT 'pendiente',
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  documentos_requeridos JSONB,
  notas TEXT
);

-- Documentos generados
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID REFERENCES expedientes(id),
  tramite_id UUID REFERENCES tramites(id),
  tipo TEXT NOT NULL,  -- 'formulario', 'memoria', 'checklist'
  nombre TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Motor normativo — el núcleo del producto

### 6.1 Estructura del árbol de decisión

El clasificador funciona como un árbol de decisión versionado en JSON. Ejemplo simplificado para instalación fotovoltaica en Andalucía:

```json
{
  "tipo": "fotovoltaica_autoconsumo",
  "comunidad": "andalucia",
  "reglas": [
    {
      "condicion": "potencia_kw <= 10 AND uso == 'residencial'",
      "tramites": [
        {
          "orden": 1,
          "nombre": "Comunicación previa a la distribuidora",
          "organismo": "Distribuidora (Endesa/Iberdrola según zona)",
          "base_legal": "RD 244/2019, Art. 12",
          "plazo_estimado_dias": 15,
          "documentos": ["solicitud_conexion", "esquema_unifilar"],
          "formulario_ref": "AND_FV_001"
        },
        {
          "orden": 2,
          "nombre": "Certificado de instalación eléctrica (CIE)",
          "organismo": "Delegación Territorial de Industria (Junta de Andalucía)",
          "base_legal": "Decreto 141/2012 Andalucía",
          "plazo_estimado_dias": 30,
          "documentos": ["cie_modelo_oficial", "memoria_tecnica", "proyecto_si_>25kW"],
          "formulario_ref": "AND_CIE_002",
          "nota": "En instalaciones < 10kW residencial, el CIE lo emite el instalador autorizado sin proyecto previo"
        }
      ]
    },
    {
      "condicion": "potencia_kw > 10 AND potencia_kw <= 100 AND uso == 'residencial'",
      "tramites": [...]
    }
  ]
}
```

### 6.2 Hoja de ruta del motor normativo

**Fase 0 (mes 1–2): Andalucía completa**
- Fotovoltaica autoconsumo (residencial e industrial)
- Climatización (aerotermia, splits, VRF)
- ACS (solar térmica, bomba de calor)
- Instalaciones de gas (baja presión)

**Fase 1 (mes 3–4): Madrid + Cataluña**
- Mismos tipos de instalación, normativa autonómica propia
- Primeras diferencias notables con Andalucía

**Fase 2 (mes 5–8): 4 CCAA más**
- Comunidad Valenciana, País Vasco, Galicia, Castilla y León

**Fase 3 (mes 9–12): Cobertura nacional**
- 17 CCAA + Ceuta y Melilla
- Automatización de detección de cambios normativos (scraping BOE/BOJAs)

### 6.3 Fuentes normativas a indexar

| Fuente | Frecuencia de actualización | Cómo monitorizar |
|---|---|---|
| BOE (boe.es) | Diaria | API oficial BOE + alertas por palabras clave |
| BOJA (Andalucía) | Semanal | RSS disponible |
| DOGC (Cataluña) | Semanal | RSS disponible |
| BOCM (Madrid) | Semanal | RSS disponible |
| Web IDAE | Mensual | Scraping manual inicial |
| REE / CNMC | Variable | APIs parcialmente disponibles |

---

## 7. Identidad visual y diseño

### 7.1 Posicionamiento de marca

PermitFlow ES no es una app bonita para startups. Es una **herramienta de trabajo** para profesionales técnicos. El diseño debe comunicar:
- Precisión y fiabilidad (no "startup vibes")
- Claridad sobre densidad de información
- Confianza institucional sin rigidez burocrática

Referentes visuales: Linear, Clerk (dashboard), Gov.uk (claridad de información técnica)

### 7.2 Paleta de colores

```
--color-primary:       #1B4FD8   /* Azul institucional, pero vivo */
--color-primary-dark:  #1340B0   /* Hover states */
--color-primary-light: #EEF3FE   /* Backgrounds suaves */

--color-success:       #16A34A   /* Trámite completado */
--color-warning:       #D97706   /* Plazo próximo */
--color-danger:        #DC2626   /* Plazo vencido / error */
--color-neutral:       #6B7280   /* Texto secundario */

--color-bg:            #F9FAFB   /* Fondo app */
--color-surface:       #FFFFFF   /* Cards, panels */
--color-border:        #E5E7EB   /* Bordes */

--color-text-primary:  #111827   /* Texto principal */
--color-text-secondary:#6B7280   /* Texto secundario */
```

### 7.3 Tipografía

```
Display / Headings:  Inter (700, 600) — legibilidad en dashboard
Body:                Inter (400, 500) — consistencia total con sistema
Datos / Código:      JetBrains Mono — referencias normativas, códigos
```

Inter como única familia: coherencia total, excelente legibilidad en datos técnicos, no parece genérico porque la jerarquía la dan los pesos y tamaños, no la familia.

### 7.4 Tamaños tipográficos (escala)

```
h1:   2rem    / 700   — Títulos de página
h2:   1.5rem  / 600   — Títulos de sección
h3:   1.125rem/ 600   — Subtítulos de card
body: 0.875rem/ 400   — Texto estándar de app
sm:   0.75rem / 400   — Labels, metadatos
mono: 0.8rem  / 400   — Códigos normativos, referencias
```

### 7.5 Componentes clave de UI

**Badge de estado de trámite**
```
Pendiente     → gris   (#6B7280) con fondo #F3F4F6
En curso      → azul   (#1B4FD8) con fondo #EEF3FE
Completado    → verde  (#16A34A) con fondo #F0FDF4
Vencido       → rojo   (#DC2626) con fondo #FEF2F2
Próximo       → ámbar  (#D97706) con fondo #FFFBEB
```

**Card de expediente**
- Referencia interna (bold) + tipo de instalación
- Comunidad autónoma + municipio
- Progreso visual: X de Y trámites completados (barra o pasos)
- Próxima acción requerida destacada
- Fecha del próximo vencimiento

**Clasificador (wizard de nueva instalación)**
- 4 pasos máximo: Tipo → Ubicación → Parámetros → Resultado
- Progreso visible en todo momento
- Resultado en pantalla completa: lista de trámites ordenada, tiempo estimado total, advertencias relevantes

---

## 8. APIs externas e integraciones

### 8.1 APIs que usarás desde el primer día

| API | Para qué | Coste | Docs |
|---|---|---|---|
| **Claude API** (Anthropic) | Interpretación de normativa, relleno de formularios | ~$0.003/1K tokens | docs.anthropic.com |
| **Stripe** | Pagos y suscripciones | 1.4% + 0.25€ por transacción EU | stripe.com/docs |
| **Clerk** | Autenticación multi-tenant | Gratuito hasta 10.000 MAU | clerk.com/docs |
| **Resend** | Emails transaccionales | Gratuito hasta 3.000/mes | resend.com/docs |
| **Supabase** | PostgreSQL managed + storage | Gratuito hasta 500MB | supabase.com/docs |
| **Sentry** | Monitoreo de errores | Gratuito hasta 5.000 errores/mes | docs.sentry.io |
| **PostHog** | Analytics de producto | Gratuito hasta 1M eventos/mes | posthog.com/docs |

### 8.2 APIs externas de datos normativos

| Fuente | API disponible | Alternativa |
|---|---|---|
| **BOE** | Sí — api.boe.es | — |
| **BOJA, DOGC, etc.** | No oficial | RSS + scraping con BeautifulSoup |
| **Catastro** | Sí — sedecatastro.gob.es | — |
| **Registro de instaladores (CCAA)** | No | Scraping manual por CA |
| **Distribuidoras (Endesa, Iberdrola)** | Parcial | Formularios manuales en fase inicial |

### 8.3 Integración Claude API — casos de uso concretos

```python
# Caso 1: Interpretar un PDF de normativa nueva
prompt = """
Eres un experto en normativa de instalaciones técnicas en España.
Analiza este fragmento del BOE y extrae:
1. Qué tipos de instalación afecta
2. Qué trámites nuevos o modificados introduce
3. Qué comunidades autónomas quedan afectadas
4. Fecha de entrada en vigor

Responde en JSON con esta estructura: {...}

Fragmento normativo:
{texto_boe}
"""

# Caso 2: Rellenar campos ambiguos de formulario
prompt = """
Dado este proyecto de instalación:
{datos_proyecto}

Y este formulario oficial con estos campos vacíos:
{campos_vacios}

Rellena los campos usando terminología técnica oficial española.
Si algún campo requiere dato que no tengo, indícalo con null y explica qué dato falta.

Responde en JSON.
"""

# Caso 3: Asistente de consultas (feature mes 4+)
prompt = """
Eres el asistente de tramitación de PermitFlow ES.
El usuario es un instalador autorizado en España.
Responde preguntas sobre normativa de instalaciones con precisión técnica.
Cita siempre la base legal (RD, Decreto, Artículo).
Si no estás seguro al 100%, indícalo explícitamente.

Pregunta: {pregunta_usuario}
"""
```

---

## 9. Plan de validación (antes de construir el producto)

**Esto es lo más importante del documento.**

No construyas el clasificador completo antes de validar. El riesgo es construir algo que nadie paga.

### 9.1 Semana 1–2: Entrevistas de problema

Objetivo: confirmar que el dolor existe y es lo suficientemente grave.

Contactos a través de tu red:
- 5 personas en instaladoras (técnicos o administrativos)
- 2–3 personas en gestorías técnicas si puedes llegar

Preguntas clave:
1. "¿Cuánto tiempo tardáis en tramitar una instalación de media?"
2. "¿Qué parte del proceso os genera más problemas?"
3. "¿Habéis tenido expedientes paralizados por errores de tramitación? ¿Cuánto os costó?"
4. "¿Usáis alguna herramienta para gestionar esto o lo hacéis a mano?"
5. "Si existiera algo que os dijera exactamente qué tramitar y os generara los documentos, ¿cuánto pagaríais?"

### 9.2 Semana 3: Demo estática (Figma o HTML)

Crea una demo no funcional del clasificador. Solo pantallas:
- Pantalla de input: tipo de instalación, CA, parámetros
- Pantalla de resultado: lista de trámites con organismos y documentación
- Panel de expedientes

Enséñaselo a las mismas personas. Observa dónde hacen clic, qué preguntan, qué les genera dudas.

### 9.3 Semana 4: "Concierge MVP"

Antes de automatizar: ofrece el servicio manualmente a 2–3 instaladoras de prueba.
- Ellas te dan los datos de su instalación
- Tú produces el plan de tramitación a mano (usando tu conocimiento + normativa)
- Ellas te dan feedback sobre si el output es útil y correcto

Esto te da:
- Validación del output real antes de codificar
- Primeros casos de uso reales para alimentar el motor normativo
- Posibles primeros clientes de pago

---

## 10. Hoja de ruta de producto

### Fase 0 — Validación (mes 1–2)
- [ ] 10 entrevistas de problema
- [ ] Demo estática en Figma
- [ ] Concierge MVP con 3 instaladoras reales
- [ ] Primer árbol normativo: fotovoltaica + climatización en Andalucía
- [ ] Landing page con lista de espera

### Fase 1 — MVP (mes 3–4)
- [ ] Clasificador funcional (Andalucía, 4 tipos de instalación)
- [ ] Generación de checklist de documentación
- [ ] Panel de expedientes básico
- [ ] Auth + multi-tenant (Clerk)
- [ ] Pagos (Stripe, plan Profesional)
- [ ] 10 primeros clientes de pago

### Fase 2 — Crecimiento (mes 5–8)
- [ ] Generación automática de documentos PDF
- [ ] Madrid + Cataluña en el motor normativo
- [ ] Alertas de vencimiento por email
- [ ] Plan Gestoría (multi-cliente)
- [ ] Integraciones con distribuidoras (formularios pre-rellenados)
- [ ] 50+ clientes de pago

### Fase 3 — Escala (mes 9–12)
- [ ] Cobertura nacional (17 CCAA)
- [ ] Asistente IA de consultas normativas
- [ ] API para ERP de terceros
- [ ] Monitoreo automático de cambios normativos (BOE scraping)
- [ ] 100+ clientes, MRR 15.000€+
- [ ] Inicio de conversaciones de adquisición

---

## 11. Go-to-market

### 11.1 Canal primario: asociaciones del sector

- **CONAIF** (Confederación Nacional de Asociaciones de Instaladores y Mantenedores)
- **AEFYT** (Asociación Española de Fabricantes de Equipos de Climatización)
- **ASEAN** (Asociación de Empresas de Instalaciones)
- Asociaciones autonómicas andaluzas: COAATSE, FENIE Andalucía

Táctica: pide hablar 15 minutos en su próxima reunión mensual. Demo en vivo. No vendas, enseña. El boca a boca en estos sectores es brutal.

### 11.2 Canal secundario: LinkedIn técnico

Contenido semanal sobre tramitación de instalaciones:
- "Los 3 errores más comunes al tramitar una instalación fotovoltaica en Andalucía"
- "Qué cambia con el nuevo RD X para las instaladoras en Madrid"
- Casos reales de expedientes mal tramitados y sus consecuencias

No es contenido de startup. Es contenido de experto técnico. Eso genera confianza en el sector.

### 11.3 Canal terciario: SEO técnico

Páginas de destino por tipo de trámite + comunidad:
- "Cómo tramitar instalación fotovoltaica en Andalucía 2026"
- "Qué documentos necesito para instalar aerotermia en Madrid"
- "Registro de instalaciones térmicas en Cataluña: guía completa"

Volumen de búsqueda bajo pero intención altísima. El instalador que busca esto tiene el problema ahora mismo.

---

## 12. Pitch de adquisición

### 12.1 Compradores potenciales y su lógica

| Comprador | Por qué compraría | Precio estimado | Cuándo |
|---|---|---|---|
| **Schneider Electric** | Completa su software para instaladores (EcoStruxure) | 3–8M€ | Con 50+ clientes |
| **Siemens Smart Infrastructure** | Mismo caso que Schneider | 3–8M€ | Con 50+ clientes |
| **PermitFlow (EEUU)** | Expansión europea sin construir desde cero | 5–15M€ | Con cobertura nacional |
| **Ferrovial Servicios** | Internalizarían para sus propias instalaciones | 2–5M€ | Con producto maduro |
| **Wood Mackenzie / Verisk** | Base de datos normativa europea única | 2–6M€ | Con datos de tramitación reales |

### 12.2 El pitch en tres frases

*"PermitFlow ES es el único software que dice a cualquier instaladora exactamente qué tramitar, ante quién y con qué documentos — para cualquier tipo de instalación técnica en España. Tenemos la única base de conocimiento normativo técnico estructurado del mercado europeo, construida por ingenieros, no por juristas. 100 instaladoras activas, MRR de 15.000€, creciendo un 20% mensual."*

---

## 13. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| La administración digitaliza bien | Baja | Alto | La fragmentación multi-organismo hace imposible una solución pública integral a 3 años |
| Competidor con más recursos entra | Media | Alto | Ventaja en base normativa + clientes actuales + velocidad de iteración |
| Coste de mantenimiento normativo alto | Alta | Medio | Automatizar detección de cambios desde mes 6; comunidad de usuarios que reporta cambios |
| Ciclo de venta lento | Alta | Medio | Entrar por gestorías técnicas (adopción más rápida) antes que instaladoras directas |
| Errores en el clasificador dañan reputación | Media | Alto | Siempre mostrar la base legal del resultado; versionar el motor normativo; advertencia explícita de "verificar con el organismo" |

---

## 14. Primeros pasos concretos — semana 1

**Lunes:** Configura el monorepo en GitHub. Estructura de carpetas según sección 5.2.

**Martes:** Instala y configura: Clerk (auth), Supabase (DB), Vercel (deploy automático). Que el esqueleto de la app esté online aunque esté vacío.

**Miércoles–Jueves:** Contacta a tus 5 primeros entrevistados. No vendas. Solo "estoy investigando el problema de tramitación de instalaciones, ¿me dedicas 20 minutos?".

**Viernes:** Empieza el primer JSON normativo: fotovoltaica autoconsumo residencial en Andalucía < 10kW. Documenta cada trámite con su base legal.

**Semana 2:** Repite entrevistas + construye la demo estática en Figma o HTML puro.

---

*Documento vivo. Actualizar con cada decisión de producto, cambio normativo relevante o aprendizaje de cliente.*
