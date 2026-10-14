# Revisión pendiente: silencio_administrativo por trámite

Generado automáticamente el 2026-08-21 a partir de motor_normativo/reglas/ --
todos los trámites con plazo_legal_dias informado (94 en total), agrupados por
CCAA. Ninguno tiene silencio_administrativo verificado todavía (ver
schemas/clasificador.py::SilencioAdministrativo y
apps/web/lib/silencioAdministrativo.ts).

**Cómo rellenar**: para cada fila, contrastar base_legal contra el texto real
de la norma (o, si base_legal no lo especifica, contra la norma sectorial que
regule el silencio de ese procedimiento -- Ley 39/2015 art. 24 es el régimen
general, pero muchas normas energéticas/sectoriales lo excepcionan a negativo).
Añadir el campo `"silencio_administrativo": "positivo"|"negativo"` al trámite en
el JSON correspondiente solo cuando esté verificado. Mismo criterio que
nivel_verificacion_regla: no rellenar por analogía con otro trámite similar sin
confirmar el texto legal de este procedimiento en concreto.

## andalucia (49)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| AND-ACS-001-1 | 2 | Registro de instalación ACS en PUES | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | RITE RD 1027/2007; Decreto 59/2005 Junta de Andalucía | 30d | _pendiente_ |
| AND-ACS-001-2 | 2 | Registro de instalación ACS en PUES | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | RITE RD 1027/2007; Decreto 59/2005 Junta de Andalucía | 30d | _pendiente_ |
| AND-ACS-001-3 | 2 | Registro de instalación ACS en PUES | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | RITE RD 1027/2007; Decreto 59/2005 Junta de Andalucía | 30d | _pendiente_ |
| AND-ACS-003 | 2 | Notificación sanitaria a la Consejería de Salud de Andalucía | Delegación Territorial de Salud y Consumo (Junta de Andalucía) | RD 487/2022 art. 10; Decreto Andalucía de instalaciones de riesgo sanitario | 30d | _pendiente_ |
| AND-CLIMA-001 | 2 | Comunicación de puesta en funcionamiento (PUES) | Junta de Andalucía - Consejería de Industria, Energía y Minas (Ventanilla Electrónica PUES) | Orden de 5 de marzo de 2013 (Andalucía), Anexo I | 10d | _pendiente_ |
| AND-CLIMA-002 | 2 | Certificado de instalación por OCA (Organismo de Control Autorizado) | OCA acreditada en Andalucía (ej: TÜV Rheinland, Applus, Bureau Veritas) | RITE RD 1027/2007 art. 12; Orden de 5 de marzo de 2013 (Andalucía) | 15d | _pendiente_ |
| AND-CLIMA-002 | 3 | Comunicación de puesta en funcionamiento (PUES) | Junta de Andalucía - Consejería de Industria, Energía y Minas (Ventanilla Electrónica PUES) | Orden de 5 de marzo de 2013 (Andalucía), Anexo I | 10d | _pendiente_ |
| AND-FV-001 | 4 | Registro en PUES — Autoconsumo | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | RD 244/2019 art. 11; Decreto 59/2005 Junta de Andalucía | 45d | _pendiente_ |
| AND-FV-001 | 5 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución (distribuidora de Andalucía) | RD 244/2019 art. 13; RD 1183/2020 | 15d | _pendiente_ |
| AND-FV-001B-1 | 4 | Registro en PUES — Generación BT | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | RD 244/2019; Decreto 59/2005 Junta de Andalucía | 45d | _pendiente_ |
| AND-FV-001B-1 | 5 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución (distribuidora de Andalucía) | RD 244/2019 art. 13 y 15; RD 1183/2020 | 15d | _pendiente_ |
| AND-FV-001B-2 | 4 | Registro en PUES — Generación BT | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | RD 244/2019; Decreto 59/2005 Junta de Andalucía | 45d | _pendiente_ |
| AND-FV-001B-2 | 5 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución (distribuidora de Andalucía) | RD 244/2019 art. 13 y 15; RD 1183/2020 | 15d | _pendiente_ |
| AND-FV-001B-3 | 4 | Registro en PUES — Generación BT | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | RD 244/2019; Decreto 59/2005 Junta de Andalucía | 45d | _pendiente_ |
| AND-FV-001B-3 | 5 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución (distribuidora de Andalucía) | RD 244/2019 art. 13 y 15; RD 1183/2020 | 15d | _pendiente_ |
| AND-FV-001B-4 | 4 | Registro en PUES — Generación BT | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | RD 244/2019; Decreto 59/2005 Junta de Andalucía | 45d | _pendiente_ |
| AND-FV-001B-4 | 5 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución (distribuidora de Andalucía) | RD 244/2019 art. 13 y 15; RD 1183/2020 | 15d | _pendiente_ |
| AND-FV-002-1 | 4 | Registro en PUES — Generación BT | Delegación Territorial de Industria (Junta de Andalucía) | RD 244/2019; Decreto 59/2005 Junta de Andalucía | 45d | _pendiente_ |
| AND-FV-002-1 | 6 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución | RD 244/2019 art. 13; RD 1183/2020 | 30d | _pendiente_ |
| AND-FV-002-2 | 4 | Registro en PUES — Generación BT | Delegación Territorial de Industria (Junta de Andalucía) | RD 244/2019; Decreto 59/2005 Junta de Andalucía | 45d | _pendiente_ |
| AND-FV-002-2 | 6 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución | RD 244/2019 art. 13; RD 1183/2020 | 30d | _pendiente_ |
| AND-FV-002-3 | 4 | Registro en PUES — Generación BT | Delegación Territorial de Industria (Junta de Andalucía) | RD 244/2019; Decreto 59/2005 Junta de Andalucía | 45d | _pendiente_ |
| AND-FV-002-3 | 6 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución | RD 244/2019 art. 13; RD 1183/2020 | 30d | _pendiente_ |
| AND-FV-002-4 | 4 | Registro en PUES — Generación BT | Delegación Territorial de Industria (Junta de Andalucía) | RD 244/2019; Decreto 59/2005 Junta de Andalucía | 45d | _pendiente_ |
| AND-FV-002-4 | 6 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución | RD 244/2019 art. 13; RD 1183/2020 | 30d | _pendiente_ |
| AND-FV-004-1 | 3 | Autorización administrativa previa y de construcción | Secretaria General de Energia / Delegacion Territorial de Economia, Hacienda, Fondos Europeos y de Industria, Energia y Minas (Junta de Andalucia) | Ley 24/2013, de 26 de diciembre, art. 53; RD 1955/2000, de 1 de diciembre | 90d | _pendiente_ |
| AND-FV-004-1 | 4 | Autorización administrativa de explotación | Secretaria General de Energia / Delegacion Territorial de Economia, Hacienda, Fondos Europeos y de Industria, Energia y Minas (Junta de Andalucia) | Ley 24/2013, de 26 de diciembre, art. 53; RD 1955/2000, de 1 de diciembre | 90d | _pendiente_ |
| AND-FV-004-1 | 7 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución | RD 244/2019 art. 13; RD 1183/2020 | 30d | _pendiente_ |
| AND-FV-004-2 | 3 | Autorización administrativa previa y de construcción | Secretaria General de Energia / Delegacion Territorial de Economia, Hacienda, Fondos Europeos y de Industria, Energia y Minas (Junta de Andalucia) | Ley 24/2013, de 26 de diciembre, art. 53; RD 1955/2000, de 1 de diciembre | 90d | _pendiente_ |
| AND-FV-004-2 | 4 | Autorización administrativa de explotación | Secretaria General de Energia / Delegacion Territorial de Economia, Hacienda, Fondos Europeos y de Industria, Energia y Minas (Junta de Andalucia) | Ley 24/2013, de 26 de diciembre, art. 53; RD 1955/2000, de 1 de diciembre | 90d | _pendiente_ |
| AND-FV-004-2 | 7 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución | RD 244/2019 art. 13; RD 1183/2020 | 30d | _pendiente_ |
| AND-FV-004-3 | 3 | Autorización administrativa previa y de construcción | Secretaria General de Energia / Delegacion Territorial de Economia, Hacienda, Fondos Europeos y de Industria, Energia y Minas (Junta de Andalucia) | Ley 24/2013, de 26 de diciembre, art. 53; RD 1955/2000, de 1 de diciembre | 90d | _pendiente_ |
| AND-FV-004-3 | 4 | Autorización administrativa de explotación | Secretaria General de Energia / Delegacion Territorial de Economia, Hacienda, Fondos Europeos y de Industria, Energia y Minas (Junta de Andalucia) | Ley 24/2013, de 26 de diciembre, art. 53; RD 1955/2000, de 1 de diciembre | 90d | _pendiente_ |
| AND-FV-004-3 | 7 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución | RD 244/2019 art. 13; RD 1183/2020 | 30d | _pendiente_ |
| AND-FV-004-4 | 3 | Autorización administrativa previa y de construcción | Secretaria General de Energia / Delegacion Territorial de Economia, Hacienda, Fondos Europeos y de Industria, Energia y Minas (Junta de Andalucia) | Ley 24/2013, de 26 de diciembre, art. 53; RD 1955/2000, de 1 de diciembre | 90d | _pendiente_ |
| AND-FV-004-4 | 4 | Autorización administrativa de explotación | Secretaria General de Energia / Delegacion Territorial de Economia, Hacienda, Fondos Europeos y de Industria, Energia y Minas (Junta de Andalucia) | Ley 24/2013, de 26 de diciembre, art. 53; RD 1955/2000, de 1 de diciembre | 90d | _pendiente_ |
| AND-FV-004-4 | 7 | Comunicación de autoconsumo a la distribuidora | Endesa / E-Distribución | RD 244/2019 art. 13; RD 1183/2020 | 30d | _pendiente_ |
| AND-FV-RADNE-OFICIO | 1 | Inscripción de oficio en el RADNE (no requiere acción del titular) | Delegación Territorial competente en energía (Junta de Andalucía), que remite los datos al RADNE del MITECO | Ley 24/2013 art. 9.4 (redacción del RDL 15/2018) y RD 244/2019; Manual de tramitación de autoconsumo de la Junta de Andalucía, ap. 5.1.7 y 5.2.7 | 30d | _pendiente_ |
| AND-FV-RADNE-SOLICITUD | 1 | Solicitud de inscripción en el RADNE | Ministerio para la Transición Ecológica (MITECO) -- Sede electrónica / Delegación Territorial (inscripción de oficio en BT <100 kW) | Ley 24/2013 art. 9.4 (redacción del RDL 15/2018) y RD 244/2019; Manual de tramitación de autoconsumo de la Junta de Andalucía, ap. 5.1.7 y 5.2.7 | 30d | _pendiente_ |
| AND-GAS-001 | 2 | Certificado de Instalación (CI) y puesta en servicio | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) -- comunicación PUES; NO requiere visado de OCA salvo instalación >70 kW con proyecto | Orden de 5 de marzo de 2013 (Andalucía), Anexo I (instalaciones de gas); RD 919/2006 | 15d | _pendiente_ |
| AND-GAS-002 | 2 | Certificado de Instalación (CI) y puesta en servicio | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) -- comunicación PUES; NO requiere visado de OCA salvo instalación >70 kW con proyecto | Orden de 5 de marzo de 2013 (Andalucía), Anexo I (instalaciones de gas); RD 919/2006 | 20d | _pendiente_ |
| AND-IRVE-001 | 4 | Comunicación a la empresa distribuidora | Empresa distribuidora de la zona (Endesa / E-Distribución en Andalucía) | RD 1183/2020 de acceso y conexión; Circular CNMC 1/2024 | 15d | _pendiente_ |
| AND-IRVE-005-1 | 3 | Registro en PUES — Delegación Territorial de Industria | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | Decreto 59/2005 Junta de Andalucía; Orden 5 marzo 2013 | 45d | _pendiente_ |
| AND-IRVE-005-2 | 3 | Registro en PUES — Delegación Territorial de Industria | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | Decreto 59/2005 Junta de Andalucía; Orden 5 marzo 2013 | 45d | _pendiente_ |
| AND-IRVE-005-3 | 3 | Registro en PUES — Delegación Territorial de Industria | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | Decreto 59/2005 Junta de Andalucía; Orden 5 marzo 2013 | 45d | _pendiente_ |
| AND-IRVE-005-4 | 3 | Registro en PUES — Delegación Territorial de Industria | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | Decreto 59/2005 Junta de Andalucía; Orden 5 marzo 2013 | 45d | _pendiente_ |
| AND-IRVE-002 | 2 | Registro en RIPREE (Registro de Infraestructuras de Puntos de Recarga de Energia Electrica) | Ministerio para la Transicion Ecologica (MITECO) - Direccion General de Politica Energetica y Minas | RD 184/2022, de 8 de marzo, art. 10; Orden TED/445/2023, de 28 de abril (BOE-A-2023-10707); Ley 7/2021, art. 15 | 30d | _pendiente_ |
| AND-IRVE-002 | 3 | Registro PUES — Delegación Territorial de Industria | Delegación Territorial de Industria, Energía y Minas (Junta de Andalucía) | Decreto 59/2005; Orden 5 marzo 2013 Junta de Andalucía | 45d | _pendiente_ |
| AND-IRVE-003 | 10 | Solicitud de acceso y conexión a la red de distribución | Endesa / E-Distribución (distribuidora de Andalucía) | RD 1183/2020 de acceso y conexión a redes de transporte y distribución | 60d | _pendiente_ |

## aragon (15)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| ARA-ACS-001 | 2 | Comunicacion de puesta en servicio de instalacion termica en edificios | Servicio Provincial de Industria (Gobierno de Aragon) | RITE RD 1027/2007 | 15d | _pendiente_ |
| ARA-ACS-002 | 2 | Certificado de instalacion por Organismo de Control Autorizado (OCA) | OCA habilitada | RITE RD 1027/2007 | 30d | _pendiente_ |
| ARA-ACS-002 | 3 | Comunicacion de puesta en servicio de instalacion termica en edificios | Servicio Provincial de Industria (Gobierno de Aragon) | RITE RD 1027/2007 | 15d | _pendiente_ |
| ARA-CLIM-001 | 2 | Comunicacion de puesta en servicio de instalacion termica en edificios | Servicio Provincial de Industria (Gobierno de Aragon) | RITE RD 1027/2007; normativa autonomica de procedimiento (vigencia no comprobada) | 15d | _pendiente_ |
| ARA-CLIM-002 | 2 | Certificado de instalacion por Organismo de Control Autorizado (OCA) | OCA habilitada | RITE RD 1027/2007; RD 2200/1995 | 20d | _pendiente_ |
| ARA-CLIM-002 | 3 | Comunicacion de puesta en servicio de instalacion termica en edificios | Servicio Provincial de Industria (Gobierno de Aragon) | RITE RD 1027/2007; normativa autonomica de procedimiento (vigencia no comprobada) | 15d | _pendiente_ |
| ARA-FV-001 | 2 | Trámite Nº 26: Instalaciones eléctricas de baja tensión: comunicación de puesta en servicio, modificación y baja | Servicio Provincial de Industria (Gobierno de Aragon) | RD 842/2002; Orden EIE/1731/2017 | 15d | _pendiente_ |
| ARA-FV-002 | 2 | Certificado de la OCA (EICI) | Organismo de Control Autorizado habilitado en Aragon | RD 2200/1995 | 15d | _pendiente_ |
| ARA-FV-002 | 3 | Trámite Nº 26: Instalaciones eléctricas de baja tensión: comunicación de puesta en servicio, modificación y baja | Servicio Provincial de Industria (Gobierno de Aragon) | RD 842/2002; Orden EIE/1731/2017 | 15d | _pendiente_ |
| ARA-FV-003 | 2 | Autorizacion administrativa (RAIPEE, seccion segunda) y Registro Administrativo de Autoconsumo de Energía Eléctrica (RADNE) | Ministerio competente en energia (RAIPEE) / Servicio Provincial de Industria (Gobierno de Aragon) | Ley 24/2013 art. 53; RD 1955/2000 | 90d | _pendiente_ |
| ARA-GAS-001 | 3 | Trámite Nº 33: Instalaciones receptoras de combustibles gaseosos: comunicación de puesta en servicio, modificación, ampliación y baja | Servicio Provincial de Industria (Gobierno de Aragon) | RD 919/2006; Orden de 30 de marzo de 2007 (Industria, Comercio y Turismo, Aragón) | 15d | _pendiente_ |
| ARA-GAS-002 | 3 | Trámite Nº 33: Instalaciones receptoras de combustibles gaseosos: comunicación de puesta en servicio, modificación, ampliación y baja | Servicio Provincial de Industria (Gobierno de Aragon) | RD 919/2006; Orden de 30 de marzo de 2007 (Industria, Comercio y Turismo, Aragón) | 15d | _pendiente_ |
| ARA-GAS-003 | 3 | Trámite Nº 33: Instalaciones receptoras de combustibles gaseosos: comunicación de puesta en servicio, modificación, ampliación y baja | Servicio Provincial de Industria (Gobierno de Aragon) | RD 919/2006; normativa autonomica | 15d | _pendiente_ |
| ARA-IRVE-001 | 3 | Trámite Nº 26: Instalaciones eléctricas de baja tensión: comunicación de puesta en servicio, modificación y baja | Servicio Provincial de Industria (Gobierno de Aragon) | RD 842/2002; Orden EIE/1731/2017 | 15d | _pendiente_ |
| ARA-IRVE-002 | 3 | Trámite Nº 26: Instalaciones eléctricas de baja tensión: comunicación de puesta en servicio, modificación y baja | Servicio Provincial de Industria (Gobierno de Aragon) | RD 842/2002; Orden EIE/1731/2017 | 20d | _pendiente_ |

## asturias (6)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| AST-ACS-001 | 2 | Registro de la instalación térmica (RECE0050T01) | Consejería de Transición Ecológica, Industria y Desarrollo Económico del Principado de Asturias – Servicio de Fluidos y Metrología | RITE RD 1027/2007 art. 23-24; Decreto 11/2015 | 28d | _pendiente_ |
| AST-ACS-002 | 2 | Registro de la instalación térmica e Inspección Inicial (RECE0050T01) | Consejería de Transición Ecológica, Industria y Desarrollo Económico del Principado de Asturias – Servicio de Fluidos y Metrología | RITE RD 1027/2007 art. 15, 23-24; Decreto 11/2015 | 28d | _pendiente_ |
| AST-AER-001 | 2 | Registro de la instalación térmica (RECE0050T01) | Consejería de Transición Ecológica, Industria y Desarrollo Económico – Servicio de Fluidos y Metrología | RITE RD 1027/2007 art. 23-24; Decreto 11/2015 | 28d | _pendiente_ |
| AST-AER-002 | 2 | Registro de la instalación térmica e Inspección Inicial (RECE0050T01) | Consejería de Transición Ecológica, Industria y Desarrollo Económico – Servicio de Fluidos y Metrología | RITE RD 1027/2007 art. 15, 23-24; Decreto 11/2015 | 28d | _pendiente_ |
| AST-GAS-002 | 3 | Comunicación de instalación receptora de gases combustibles (DECO0011T01) | Consejería de Transición Ecológica, Industria y Desarrollo Económico – Servicio de Fluidos y Metrología | RIGLO RD 919/2006 apartado 5.7; ITC-ICG-07 apartado 3.6 | 30d | _pendiente_ |
| AST-GAS-003 | 3 | Comunicación de instalación receptora de gases combustibles (DECO0011T01) | Consejería de Transición Ecológica, Industria y Desarrollo Económico – Servicio de Fluidos y Metrología | RIGLO RD 919/2006 apartado 5.7; ITC-ICG-07 apartado 3.6 | 30d | _pendiente_ |

## comunidad_valenciana (6)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| CV-FV-004A | 1 | Autorización administrativa e inscripción en Registro de producción | Servicio Territorial competente en materia de energía | Decreto 88/2005 art. 6; Ley 24/2013 art. 53 | 180d | _pendiente_ |
| CV-FV-004B | 1 | Autorización administrativa e inscripción en Registro de producción | Servicio Territorial competente en materia de energía | Decreto 88/2005 art. 6; Ley 24/2013 art. 53 | 180d | _pendiente_ |
| CV-FV-004C | 1 | Autorización administrativa e inscripción en Registro de producción | Servicio Territorial competente en materia de energía | Decreto 88/2005 art. 6; Ley 24/2013 art. 53 | 180d | _pendiente_ |
| CV-GAS-001 | 3 | Registro/comunicación de la instalación | Servicio Territorial de Industria, Energía y Minas | RIGLO RD 919/2006 ITC-ICG-07 | 30d | _pendiente_ |
| CV-GAS-002 | 3 | Registro/comunicación de la instalación | Servicio Territorial de Industria, Energía y Minas | RIGLO RD 919/2006 ITC-ICG-07 | 30d | _pendiente_ |
| CV-GAS-003 | 3 | Registro/comunicación de la instalación | Servicio Territorial de Industria, Energía y Minas | RIGLO RD 919/2006 ITC-ICG-07 | 30d | _pendiente_ |

## pais_vasco (6)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| PV-FV-003A | 1 | Autorización administrativa previa (grupo primero) | Dirección competente en materia de energía del Gobierno Vasco | Decreto 48/2020; Ley 24/2013 art. 53 | 180d | _pendiente_ |
| PV-FV-003B | 1 | Autorización administrativa previa (grupo primero) | Dirección competente en materia de energía del Gobierno Vasco | Decreto 48/2020; Ley 24/2013 art. 53 | 180d | _pendiente_ |
| PV-FV-003C | 1 | Autorización administrativa previa (grupo primero) | Dirección competente en materia de energía del Gobierno Vasco | Decreto 48/2020; Ley 24/2013 art. 53 | 180d | _pendiente_ |
| PV-GAS-001 | 2 | Certificado de instalación (CI) y puesta en servicio con ECA | Entidad Colaboradora de la Administración (ECA) autorizada en País Vasco | RIGLO RD 919/2006; Decreto 229/2012 | 30d | _pendiente_ |
| PV-GAS-002 | 2 | Certificado de instalación (CI) y puesta en servicio | Órgano competente del País Vasco o entidad colaboradora (ECA) | RIGLO RD 919/2006; Decreto 229/2012 | 20d | _pendiente_ |
| PV-GAS-003 | 2 | Certificado de instalación (CI) y puesta en servicio con ECA | Entidad Colaboradora de la Administración (ECA) autorizada en País Vasco | RIGLO RD 919/2006; Decreto 229/2012 | 30d | _pendiente_ |

## murcia (4)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| MUR-CL-000 | 2 | Registro de instalación térmica en edificios | Dirección General de Energía y Actividad Industrial y Minera (CARM) | Decreto 20/2003; RITE RD 1027/2007 art. 24 | 15d | _pendiente_ |
| MUR-CL-001 | 2 | Registro de instalación térmica en edificios | Dirección General de Energía y Actividad Industrial y Minera (CARM) | Decreto 20/2003; RITE RD 1027/2007 art. 24 | 15d | _pendiente_ |
| MUR-CL-002 | 2 | Puesta en servicio con inspección inicial (OCA) | Organismo de Control Autorizado (OCA) acreditado en la Región de Murcia | Decreto 20/2003; RITE RD 1027/2007 art. 15 | 30d | _pendiente_ |
| MUR-IRVE-002 | 2 | Inspección inicial por Organismo de Control (OCA) y emisión de CIE | Organismo de Control Autorizado (OCA) habilitado en la Región de Murcia | REBT RD 842/2002 | 20d | _pendiente_ |

## canarias (2)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| ICAN-FV-002 | 4 | Autorización administrativa de instalaciones de producción de energía eléctrica a partir de fuentes renovables (SICAC 2721) | Dirección General de Energía del Gobierno de Canarias — Servicio de Combustibles y Energías Renovables | Decreto 141/2009 art. 12-14; Ley 24/2013 art. 53; art. 3 Ley 5/2021 (compatibilidad urbanística) | 180d | _pendiente_ |
| ICAN-GBP-001 | 4 | Comunicación de instalación receptora de combustibles gaseosos (SICAC 3905) | Dirección General de Energía del Gobierno de Canarias — Servicio de Transporte y Generación en Régimen Ordinario | RD 919/2006 RIGLO ITC-ICG-07 | 30d | _pendiente_ |

## cantabria (2)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| CANT-GBP-001 | 3 | Comunicación y puesta en servicio de instalaciones receptoras de gas de uso no industrial que requieran proyecto | Dirección General de Industria, Energía y Minas del Gobierno de Cantabria | RD 919/2006 RIGLO ITC-ICG-07; Orden IND/23/2009 | 30d | _pendiente_ |
| CANT-GBP-002 | 3 | Registro y puesta en servicio de instalaciones receptoras de combustibles gaseosos | Dirección General de Industria, Energía y Minas del Gobierno de Cantabria | RD 919/2006 RIGLO ITC-ICG-07; Orden IND/23/2009 | 30d | _pendiente_ |

## madrid (2)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| MAD-GAS-SIN-PROYECTO | 1 | Comunicación de puesta en servicio de instalación receptora de gas | Dirección General de Transición Energética y Economía Circular | RD 919/2006 | 15d | _pendiente_ |
| MAD-GAS-CON-PROYECTO | 2 | Comunicación de puesta en servicio de instalación receptora de gas | Dirección General de Transición Energética y Economía Circular | RD 919/2006 | 15d | _pendiente_ |

## castilla_la_mancha (1)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| CLM-GBP-002 | 3 | Comunicación de instalación receptora de gas ante el órgano competente | Dirección General de Industria, Energía y Minas (Consejería de Desarrollo Sostenible) | RIGLO RD 919/2006 ITC-ICG-07 | 30d | _pendiente_ |

## la_rioja (1)

| Regla | Orden | Trámite | Organismo | Base legal citada | Plazo | Efecto |
|---|---|---|---|---|---|---|
| RIO-FV-002 | 3 | Autorización administrativa y de construcción, autorización de explotación, registro (modelo AUTee) | Servicio de Industria, Comercio y Transición Energética del Gobierno de La Rioja | Ley 24/2013 art. 53; RD 244/2019 | 180d | _pendiente_ |
