# Inventario de Normativas e Incentivos

Este documento recoge todas las afirmaciones legales, normativas e incentivos económicos que la aplicación PermitFlow ES muestra actualmente en su interfaz (hasta Fase 2), para someterlas a un proceso de verificación riguroso en la Fase 3.

## 1. Deducciones Fiscales Estatales

### 1.1. Deducciones por Rehabilitación Energética (RD 19/2021)
- **Afirmación:** Deducciones del 20%, 40% y 60% en el IRPF por obras de rehabilitación energética.
- **Límites:** Hasta 5.000 €/año (20%), 7.500 €/año (40%), y 15.000 € acumulados (60%).
- **Vigencia afirmada:** 31/12/2026 y 31/12/2027.
- **Requisito:** CEE antes y después de la obra.
- **Problema detectado:** El RD 19/2021 fue sustituido por la Ley 10/2022. Hay que verificar las disposiciones adicionales de la Ley del IRPF (Ley 35/2006) en su versión consolidada vigente.
- **Estado Inicial:** `pending_verification`

### 1.2. Deducción Autoconsumo (RDL 7/2026)
- **Afirmación:** Deducción del 10% (individual) y 20% (edificio residencial) con límite de 5.000 €.
- **Vigencia afirmada:** 2026.
- **Problema detectado:** El RDL 7/2026 oficial (BOE 21/03/2026) corresponde al "Plan Integral de Respuesta a la Crisis en Oriente Medio". Se debe encontrar el artículo exacto (o confirmar que es un error y buscar la norma real).
- **Estado Inicial:** `pending_verification`

### 1.3. Deducción IRVE 15%
- **Afirmación:** Deducción del 15% en el IRPF para la instalación de puntos de recarga particulares (límite 600 € de ahorro).
- **Problema detectado:** Relacionado también con RDL 7/2026 en el código actual. Necesita fuente primaria y verificación de exclusividad frente a la compra del vehículo (Programa Auto+).
- **Estado Inicial:** `pending_verification`

## 2. Normativas y Requisitos Técnicos Estatales

### 2.1. Fotovoltaica de Autoconsumo
- **RD 244/2019:** Regula las condiciones administrativas, técnicas y económicas del autoconsumo de energía eléctrica. (Bajo riesgo)
- **Ley 24/2013:** Sector eléctrico, arts. 9 y 53. (Bajo riesgo)
- **RD 1183/2020:** Acceso y conexión. (Bajo riesgo)
- **CTE DB-HE5:** Contribución mínima de energía renovable. (Bajo riesgo)

### 2.2. IRVE (Recarga Vehículos)
- **RD 1053/2014 (ITC-BT-52):** Regula las instalaciones de recarga de vehículos eléctricos. (Bajo riesgo, ver texto consolidado)
- **RD-ley 29/2021:** Dotación mínima en edificios. (Bajo riesgo)
- **RD 184/2022:** Regula la prestación de servicios de recarga. Se debe distinguir entre acceso público y uso privado.
- **CTE DB-HE6:** Dotación de IRVE en obra nueva. (Bajo riesgo)

### 2.3. Aerotermia y Climatización
- **RITE (RD 1027/2007 mod. RD 178/2021):** Reglamento de Instalaciones Térmicas en los Edificios. (Bajo riesgo)
- **CTE DB-HE4:** Contribución renovable (factor SCOP / SPF > 2.5). (Bajo riesgo)
- **Directiva 2009/28/CE:** Clasificación renovable (ahora RED II / RED III, revisar equivalencia).
- **RD 552/2019 (RSIF):** Refrigerantes fluorados. (Bajo riesgo)

### 2.4. ACS y Legionella
- **RD 487/2022:** Prevención y control de la legionelosis (instalaciones con acumulación). Modificado por RD 614/2024.
- **CTE DB-HE4 y DB-HS4:** Requisitos de renovables y salubridad de agua. (Bajo riesgo)

### 2.5. Gas
- **RD 919/2006:** Reglamento técnico de distribución y utilización de combustibles gaseosos. Actualizado en 2025. (Bajo riesgo)
- **RD 984/2015:** Sobre inspecciones (identificado posible error; las inspecciones domiciliarias IRG-4 deben confirmarse en el texto consolidado de la ITC pertinente).
- **Directiva (UE) 2024/1275 (EPBD 2024):** Restricciones a combustibles fósiles. Se debe acotar al calendario de transposición y medidas en España.

## 3. Planes de Subvención (Fondos)

### 3.1. Plan MOVES III
- **Afirmación:** Cerrado desde 31/12/2025.
- **Clasificación:** Programa histórico cerrado. Mostrar como contexto informativo para explicar por qué no se calcula.

### 3.2. Programa Auto+ (RD 609/2026)
- **Afirmación:** Cubre compra de vehículo, no punto de recarga.
- **Clasificación:** Contexto informativo, no aplicable al presupuesto del punto de recarga.

## 4. Incentivos Autonómicos y Municipales

### 4.1. Deducciones Autonómicas (IRPF)
- **Afirmaciones actuales en el código:** Existen múltiples porcentajes (ej. Baleares 50%, Canarias 12%, Comunidad Valenciana 20-40%, etc.) definidos en `incentivos_ccaa.ts`.
- **Problema detectado:** Todas carecen de fuente_url verificada.
- **Estado Inicial:** `pending_verification` para todas.

### 4.2. Bonificaciones Municipales (IBI e ICIO)
- **Afirmación:** "Muchos ayuntamientos aplican bonificaciones potestativas en el IBI (hasta 50%) y en el ICIO (hasta 95%)."
- **Problema detectado:** Demasiado genérico para mostrarse como aplicable y sumar al ahorro de 10 años sin contrastar ordenanzas específicas de cada municipio.
- **Estado Inicial:** Contexto informativo (no entra en el cálculo de proyecciones económicas).
