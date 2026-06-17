# Pipeline de Actualización Normativa BOE

## Ejecución automática
Se ejecuta cada lunes a las 9:00h (España) via GitHub Actions.
También ejecutable manualmente desde GitHub → Actions → "Pipeline BOE" → "Run workflow".

## Ejecución manual local
```bash
cd apps/api
uv run python scripts/boe_pipeline.py
```

## Cuando llega un email de alerta
1. Revisa el email — verás N cambios detectados con su nivel de urgencia
2. Ejecuta el revisor interactivo:
```bash
cd apps/api
uv run python scripts/revisar_borrador.py
```
3. Para cada borrador: `s` para aplicar, `n` para descartar, `ver` para ver el JSON completo
4. Si aplicas un cambio: abre el JSON correspondiente en `motor_normativo/reglas/` y edita
5. Haz commit con formato: `fix(normativa): update {CA}-{TIPO} — {nombre de la norma}`

## Secrets necesarios en GitHub
Configurar en Settings → Secrets → Actions:
- `DEEPSEEK_API_KEY`
- `RESEND_API_KEY`
- `NOTIFICATION_EMAIL`
- `RESEND_FROM_DOMAIN`

## Fuentes monitorizadas
- BOE (www.boe.es) — 7 días hábiles anteriores
- BOJA (Andalucía)
- BOCM (Madrid)
- DOGC (Cataluña)

## Añadir más diarios autonómicos
Editar `scripts/boe_pipeline.py` → función `descargar_diarios_autonomicos()` → array `rss_feeds`.
