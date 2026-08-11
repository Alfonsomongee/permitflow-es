# Auditoría de diseño y propuesta de rediseño

**Fecha:** 11 de agosto de 2026
**Alcance:** sistema de diseño, landing pública, área autenticada, componentes base y patrones de interacción.
**Método:** lectura del código real (tokens, componentes, páginas), inventario de efectos y medición de patrones sobre el árbol de ficheros. Todo dato numérico de este informe está contado sobre el repositorio, no estimado.

---

## Evaluación del diseño actual

### Puntos fuertes

No hay que rehacer el producto. La base es mejor de lo que sugiere el resultado visual, y conviene decirlo antes de la lista de problemas:

- **La paleta es sobria y está bien construida.** Azul `#1B4FD8` sobre grises neutros, con escalas `light`/`dark` coherentes para los cuatro estados semánticos. No hay morados degradados ni acentos de moda.
- **Las sombras son correctas.** Cuatro niveles (`xs`, `card`, `card-hover`, `dropdown`) con opacidades bajas (0.04–0.12) y desplazamientos cortos. Esto es exactamente lo que hacen los productos enterprise; la mayoría de plantillas se pasan de sombra.
- **Los radios son moderados** (12/16 px). Ni cuadrado brutalista ni pastilla.
- **La accesibilidad de base está atendida**: `:focus-visible` con outline propio, `prefers-reduced-motion` respetado globalmente, `scroll-padding-top` para el nav sticky, scrollbar discreta.
- **Hay un sistema real**, no clases sueltas: los primitivos de `components/ui/` están tipados con `cva` y los tokens de shadcn están mapeados sobre la paleta propia.

El problema no es el sistema de diseño. Es lo que se ha construido encima.

### Debilidades

**1. Los nombres propios están sin acentuar en toda la aplicación.**

Este es el hallazgo más grave del informe, y no es de diseño visual sino de credibilidad directa:

```
components/nueva-instalacion/types.ts   types/plan.ts
  "Andalucia"        →  Andalucía        "Cataluna"     →  Cataluña
  "Aragon"           →  Aragón           "Pais Vasco"   →  País Vasco
  "Castilla y Leon"  →  Castilla y León  "Gas baja presion" → …presión
  "Climatizacion y aerotermia"           "Recarga de vehiculo electrico"
```

Aparecen en el selector de comunidad, en la cabecera del plan, en el resumen lateral, en el PDF exportado y en el portal del cliente. Y en el `<title>` del sitio: *"PermitFlow ES - Tramitacion automatica de instalaciones"*, que es lo que se ve en la pestaña del navegador y en Google.

Un gestor español lee «Cataluna» y «Pais Vasco» y ya sabe todo lo que necesita saber sobre el cuidado que se ha puesto en el producto. Ninguna mejora tipográfica compensa esto. **Es el primer arreglo, por delante de cualquier otro.**

**2. La landing usa los efectos que identifican una plantilla generada.**

En `HeroSection.tsx` conviven, en 138 líneas:

- `SplitText` — el H1 se anima **letra a letra**.
- `CountUp` — tres cifras que suben desde cero.
- Dos círculos difuminados (`blur-2xl`, `bg-primary/10` y `bg-success/10`) flotando tras la tarjeta.
- Un `radial-gradient` de fondo en la sección.
- Siete `FadeIn` escalonados (delays de 0,1 a 0,7 s), de modo que el contenido termina de aparecer casi un segundo después de la carga.
- `backdrop-blur-sm` en dos contenedores.
- CTA con `hover:-translate-y-0.5`: el botón se despega al pasar el ratón.

Cada uno por separado es defendible. Los siete juntos en la primera pantalla son la firma visual de una landing hecha con plantilla. Un comprador B2B que ha visto veinte de estas las reconoce de inmediato.

**3. El marquee expone el stack tecnológico interno.**

`TechStackMarquee` desplaza indefinidamente: *Next.js 14, TypeScript, Tailwind CSS, FastAPI, Python, PostgreSQL, Supabase, Clerk, Stripe, DeepSeek, Framer Motion, json-logic*.

Tres problemas, en orden de gravedad:

- **De posicionamiento.** A un instalador o a un gestor energético no le importa el framework. Ese espacio, en la landing de cualquier empresa consolidada, lo ocupan logos de clientes, colegios profesionales, certificaciones o referencias normativas. Enseñar dependencias en su lugar comunica lo contrario de lo que se busca.
- **De credibilidad.** «DeepSeek» y «Framer Motion» en una lista pública dicen «esto lo ha montado alguien recientemente y con ayuda de IA».
- **De seguridad.** Publicar el proveedor de autenticación, la base de datos y el proveedor de LLM es superficie de ataque regalada.

El comentario del fichero dice que la lista «coincide con package.json — no es una lista decorativa». Ese es justamente el problema: es una lista honesta de algo que no debería mostrarse.

**4. El botón primario lleva degradado.**

`buttonVariants.default` usa `bg-gradient-primary` (`linear-gradient(135deg, #1B4FD8, #1340B0)`) más `hover:brightness-[1.04]`. El degradado en el botón principal es uno de los marcadores más fiables de plantilla. Stripe, Linear, Vercel, Datadog: todos usan color plano en el botón primario. El degradado no aporta jerarquía —ya la da el contraste— y sí añade ruido.

**5. Ocho familias de color compitiendo.**

`primary`, `success`, `warning`, `danger`, `ai` (teal), y tres paletas de plataforma (`pues`, `teci`, `miteco`), además de los tokens de shadcn. El consenso de 2026 en producto enterprise va justo al revés: superficie casi monocroma y **un** acento. El color de acento `ai` en teal es especialmente problemático porque marca visualmente «esto lo hace una IA» en un producto cuyo argumento de venta es el rigor normativo.

> **Hallazgo adicional al implementarlo (2026-08-11).** El acento `ai` no solo era contraproducente: era **factualmente incorrecto**. Donde más se usaba era en los documentos «generables» del catálogo de plantillas, y esa generación (`apps/api/documentos/`) es `python-docx` rellenando datos ya conocidos del expediente — comprobado: no hay una sola llamada a `ai_client`, `deepseek` ni `openai` en ese módulo. Se estaba marcando como producto de IA una plantilla determinista. El copy ya era honesto («generable automáticamente», no «con IA»); era solo el color el que sugería otra cosa.

**6. Carga: spinners donde debería haber skeletons.**

18 componentes usan `Loader2` girando; solo 2 usan `animate-pulse`.

> **Corrección posterior (2026-08-11).** Esa proporción, tal como la enuncié, exagera el problema. Al implementarlo comprobé que **10 de esos 18 spinners están dentro de botones**, que es su uso correcto: el usuario acaba de lanzar la acción, sabe qué espera y no hay layout que preservar. Otros aparecen junto al chevron de un panel plegable, donde tampoco molestan.
>
> El problema real es más acotado y afecta a cinco sitios, todos ellos paneles que hacen fetch en cliente y dejan el hueco vacío hasta que llegan los datos: `ValidadorPanel`, `HistorialPanel`, `DocumentosClientePanel`, `SubsanacionesPanel` y `NotificationBell`. Ahí el contenido aparece de golpe y empuja lo que hay debajo.
>
> Conviene anotar de dónde vino el error: conté ocurrencias de `Loader2` sin distinguir el contexto de uso. Es el mismo defecto de método que produjo el falso positivo A-04 de la auditoría de motor normativo — medir agregados y concluir sin mirar los casos.

Un spinner no comunica nada salvo espera y provoca saltos de layout al resolverse. El skeleton preserva la estructura, reduce el desplazamiento acumulado y hace que la espera se perciba más corta.

**7. Los números no están alineados.**

Solo 4 ficheros usan `tabular-nums` en toda la aplicación, y `ExpedientesTable` —la tabla principal del producto— no usa ninguno. En una herramienta de datos, columnas de cifras con anchos de dígito variables se leen como una hoja de cálculo mal montada. Hay una fuente monoespaciada cargada (`GeistMono`) que apenas se aprovecha.

**8. `GeistVF.woff` está en el repositorio y no se usa.**

`app/fonts/` contiene la variable de Geist Sans, pero solo se declara `GeistMono` en `@font-face`. La app usa Inter de Google Fonts. Inter no está mal —es legible y neutra—, pero es también la tipografía por defecto de prácticamente todo producto generado con asistencia de IA en los últimos tres años, lo que la ha convertido en una señal en sí misma.

**9. El wash del `body` es decorativo y caro.**

Dos `radial-gradient` azules fijos con `background-attachment: fixed`. El comentario dice «sin perder la seriedad del fondo neutro», lo que reconoce implícitamente la tensión. En scroll, `fixed` fuerza repintado en cada frame.

### Problemas detectados, resumidos

| # | Problema | Dónde | Severidad |
|---|---|---|---|
| D-01 | Nombres de comunidades y tecnologías sin tildes | `types.ts`, `types/plan.ts`, `layout.tsx` | **Crítica** |
| D-02 | Efectos de plantilla en el hero (SplitText, CountUp, blobs) | `HeroSection.tsx` | **Crítica** |
| D-03 | Marquee con el stack tecnológico interno | `TechStackMarquee.tsx` | **Crítica** |
| D-04 | Degradado en el botón primario | `ui/button.tsx` | Alta |
| D-05 | Ocho familias de color, acento `ai` en teal | `tailwind.config.ts` | Alta |
| D-06 | Spinners en vez de skeletons (18 vs 2) | 18 componentes | Alta |
| D-07 | Cifras sin `tabular-nums` en tablas | `ExpedientesTable` y otros | Media |
| D-08 | Wash radial fijo en el `body` | `globals.css` | Media |
| D-09 | Geist Sans cargado y sin usar | `app/fonts/` | Baja |
| D-10 | Métrica de vanidad en el hero («< 2 s») | `HeroSection.tsx` | Media |

---

## Benchmark visual

### Patrones encontrados en productos de referencia

La búsqueda de tendencias de producto B2B para 2026 devuelve un consenso bastante unánime, y coincide con lo que se observa en Stripe, Linear, Vercel, Datadog, Retool o Mercury:

**Contención radical.** Superficies casi monocromas, **un** color de acento, y densidad de información conseguida *quitando* elementos, no añadiéndolos. La aproximación anterior —equiparar valor con densidad: más widgets, más filtros, más gráficos— «se lee en 2026 como pensamiento sin terminar».

**Dashboards orientados a decisión.** Lo valioso no es mostrar métricas, sino responder: qué ha cambiado, por qué importa, quién tiene que actuar y qué debería pasar ahora. Tres a cinco KPI con explicación del cambio, por delante de una parrilla de gráficos.

**Tipografía de grano fino.** Los productos enterprise necesitan más pesos de los que se suelen usar: 300 para datos secundarios, 400 para cuerpo, 500 para elementos interactivos, 600–700 para títulos. Y el emparejamiento más eficaz es **sans humanista para la interfaz + monoespaciada para cifras**, porque los números necesitan ancho fijo para alinearse en tablas.

**Densidad tratada como problema tipográfico.** Escalas modulares (tercera menor), interletrado y interlineado definidos específicamente para el contexto de tabla.

### Buenas prácticas relevantes para este producto

- **La confianza en compliance se construye con precisión, no con estética.** Citar la norma, fechar la verificación y admitir lo que no se sabe pesa más que cualquier tratamiento visual. Este producto ya lo hace en el backend (`huecos_verificacion`, base legal por trámite, avisos honestos); el frontend debería explotarlo mucho más, porque es su mejor activo diferencial.
- **Los espacios de prueba social se reservan para prueba social.** Logos de clientes, colegios profesionales, normativa cubierta. Nunca dependencias.
- **La animación se justifica o se elimina.** Transiciones de estado sí; entradas escalonadas del contenido principal no, porque retrasan la lectura sin aportar información.

---

## Propuesta de rediseño

### 1. Corregir la ortografía de todo el texto visible

**Cambio.** Acentuar los nombres de las 17 comunidades, los cinco nombres de tecnología, los rótulos de paso del formulario y los metadatos del sitio.

**Justificación.** Es el error que un usuario español detecta en el primer segundo y del que no se recupera la impresión. Coste: minutos. Impacto: máximo.

**Impacto esperado.** Elimina la señal más fuerte de descuido del producto.

### 2. Rehacer el hero sin efectos de plantilla

**Cambio.** Retirar `SplitText`, `CountUp`, los círculos difuminados y el degradado radial de sección. Sustituir la cascada de siete `FadeIn` por una única aparición del bloque, o ninguna. Mantener la tarjeta de ejemplo del plan, que sí comunica el producto.

**Justificación.** El titular es la promesa; animarlo letra a letra la convierte en espectáculo. Las cifras animadas invitan a mirar la animación en vez de leer el dato.

**Impacto esperado.** El contenido es legible de inmediato en vez de a los 900 ms. Se elimina la firma visual de plantilla.

### 3. Sustituir el marquee de stack por cobertura normativa

**Cambio.** Retirar `TechStackMarquee`. En su lugar, una banda estática con lo que sí genera confianza en este sector: número de comunidades cubiertas, verticales, normativa de referencia (RITE, REBT, RD 244/2019) y fecha de última revisión del motor normativo.

**Justificación.** Ese espacio es el de prueba social. El producto tiene un activo real que enseñar —cobertura normativa verificada y fechada— y en su lugar está enseñando sus dependencias.

**Impacto esperado.** Convierte el punto más contraproducente de la landing en el más diferencial. Además deja de publicar el proveedor de auth, base de datos y LLM.

### 4. Botón primario en color plano

**Cambio.** `bg-gradient-primary` → `bg-primary`, con `hover:bg-primary-dark`.

**Justificación.** El degradado no aporta jerarquía y sí es un marcador de plantilla. El contraste ya distingue el botón primario.

### 5. Reducir el sistema de color

**Cambio.** Mantener `primary` + los cuatro estados semánticos. Retirar el acento `ai` teal y unificar las tres paletas de plataforma en una neutra con el nombre de la plataforma como texto.

**Justificación.** Un acento. Marcar en un color distinto «lo que hace la IA» es contraproducente en un producto cuyo argumento es el rigor normativo: invita a desconfiar justo de las partes que quieres que se usen.

### 6. Skeletons en las vistas con datos

**Cambio.** Sustituir el spinner por skeleton en las vistas donde se conoce la forma del contenido: tabla de expedientes, paneles del expediente, listado de alertas. Mantener el spinner en botones (acción en curso), que es su uso correcto.

**Justificación.** Preserva el layout, reduce el desplazamiento acumulado y acorta la espera percibida.

### 7. Cifras tabulares

**Cambio.** `tabular-nums` en toda columna numérica y en los KPI. Reservar `GeistMono` para códigos de expediente y referencias de formulario.

**Justificación.** Es el patrón estándar en herramientas de datos y el más barato de aplicar.

### 8. Retirar el wash del `body`

**Cambio.** Fondo neutro plano.

**Justificación.** Decorativo, y `background-attachment: fixed` fuerza repintado en scroll.

### Sobre material fotográfico

**Recomendación: no incorporar fotografía de stock de paneles solares, aerogeneradores ni cargadores.** Es la decisión que más ayuda a la percepción de seriedad.

- Toda foto de stock del sector renovable es reconocible: el mismo panel azul contra el mismo cielo, el mismo instalador con casco. Una imagen identificable como stock resta más credibilidad que la ausencia de imagen.
- El producto **no vende instalaciones, vende certidumbre normativa**. Una foto de un panel no comunica eso; una tabla de trámites con su base legal citada, sí.
- Las referencias de este segmento (Stripe, Linear, Datadog, Mercury) usan casi exclusivamente **capturas reales de producto** y diagramas propios.

**Dónde sí tendría sentido material visual, por orden de valor:**

1. **Capturas reales del plan de tramitación** en la landing, a tamaño grande y sin mockup de portátil. Es lo que el comprador quiere ver antes de registrarse.
2. **Diagrama del flujo normativo** (parámetros → clasificación → plan → seguimiento), en SVG propio con la paleta del producto.
3. **Iconografía de vertical**, ya resuelta con Lucide y coherente. No necesita sustitución.
4. **Escudos o referencias de las 17 comunidades** en la página de cobertura, si se resuelve el uso correcto de los símbolos oficiales. Requiere verificación legal previa: no es un quick win.

**Dónde no:** hero, cabeceras de sección, fondos, tarjetas de tecnología y estados vacíos. En ninguno de esos sitios una fotografía añade información.

---

## Quick Wins

Alto impacto, bajo esfuerzo. En este orden:

1. **Acentuar comunidades, tecnologías y metadatos** (D-01). Dos ficheros de constantes más `layout.tsx`.
2. **Retirar `SplitText` y `CountUp` del hero** (D-02). Borrar dos usos; el titular y las cifras se quedan estáticos.
3. **Eliminar los círculos difuminados y el radial del hero** (D-02). Cuatro líneas.
4. **Botón primario a color plano** (D-04). Una línea en `button.tsx`.
5. **Retirar el wash del `body`** (D-08). Cuatro líneas en `globals.css`.
6. **`tabular-nums` en la tabla de expedientes y los KPI** (D-07).
7. **Quitar el `hover:-translate-y-0.5`** del CTA principal.

## Prioridad Alta

Obligatorias antes de enseñar el producto a un cliente:

1. **Sustituir el marquee de stack por la banda de cobertura normativa** (D-03). Es el cambio con más recorrido de todo el informe: elimina el peor punto y crea el mejor.
2. **Reducir la cascada de `FadeIn` del hero** a una sola aparición (D-02).
3. **Skeletons en las tres vistas principales con datos** (D-06).
4. **Retirar el acento `ai` teal** (D-05).
5. **Sustituir la métrica «< 2 s» por una que le importe al comprador** (D-10): por ejemplo, número de trámites cubiertos o fecha de última verificación normativa. El tiempo de respuesta es una métrica de vanidad técnica y además una promesa que puede incumplirse.

---

## Resultado final esperado

**Los primeros 30 segundos de un usuario nuevo, si se aplica lo anterior:**

Abre la página. El titular está ahí, quieto y legible, sin esperar a que termine de escribirse. Dice qué hace el producto en una frase. Debajo, una banda sobria informa de que el motor cubre 17 comunidades y 5 tecnologías, cita RITE, REBT y el RD 244/2019, y muestra la fecha de última revisión. No hay nada moviéndose en la pantalla.

A la derecha ve una captura real del plan de tramitación: trámites numerados, cada uno con su organismo, su plazo y su base legal citada. Entiende el producto sin leer una línea más de copy.

Entra. La aplicación carga mostrando la estructura de la tabla antes que los datos, así que nada salta de sitio. Las cifras de las columnas están alineadas. Los nombres de las comunidades están bien escritos —no lo nota conscientemente, que es exactamente el objetivo—. Hay un solo color de acento y aparece solo donde hay que actuar.

Genera un plan. El resultado no le dice solo qué hacer: le dice en qué norma se basa, qué está verificado y qué no. Cuando algo no se ha podido confirmar, la aplicación lo dice.

**La conclusión que debería sacar:** «esto lo ha hecho gente que entiende de tramitación, no gente que ha hecho una web bonita sobre tramitación».

Esa percepción no la produce el tratamiento visual. La produce la coherencia entre lo que la interfaz promete y lo que el motor entrega —y este producto ya tiene la segunda mitad resuelta. El trabajo de diseño pendiente consiste, casi todo, en **dejar de tapar** con efectos un rigor que ya está ahí.
