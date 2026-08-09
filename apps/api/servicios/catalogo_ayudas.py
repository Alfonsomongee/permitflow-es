"""
apps/api/servicios/catalogo_ayudas.py

Catalogo de ayudas y subvenciones publicas para instalaciones tecnicas en Espana.

ORIGEN DE LOS DATOS:
Investigacion manual realizada en julio-agosto de 2026 mediante busqueda web dirigida a
fuentes oficiales (IDAE, BOE, boletines autonomicos, portales de agencias
energeticas regionales). NO es un feed en vivo ni una base de datos actualizada
automaticamente: cada entrada lleva su propia fecha de consulta y nivel de
fiabilidad, exactamente igual que el patron de "nivel_verificacion" ya usado en
el motor normativo (apps/api/motor_normativo/reglas/**/*.json), para no repetir
el mismo error de credibilidad (ver severidad_verificacion en asistente_context.py
y severidadVerificacion en apps/web/types/plan.ts).

NIVELES DE FIABILIDAD (fiabilidad):
- "oficial": contrastado contra fuente primaria (.gob.es, BOE, boletin autonomico,
  portal oficial de la agencia/ente gestor).
- "secundaria": el dato proviene de un agregador/medio especializado que cita la
  fuente oficial, pero no se ha verificado el texto legal exacto.
- "no_verificado": referencia mencionada por alguna fuente pero sin poder
  contrastar cifras/plazos con una fuente primaria.

ESTADOS POSIBLES (estado):
- "vigente": convocatoria con plazo de solicitud abierto a la fecha de consulta.
- "agotado": programa activo pero fondos agotados o en fase de reasignacion.
- "en_ejecucion": cerrado a nuevas solicitudes, solo gestion de expedientes ya
  concedidos (ejecucion/justificacion).
- "cerrado": sin convocatoria vigente y sin sucesor anunciado.
- "no_localizado": no se encontro programa para esa combinacion comunidad/vertical.

Este modulo es deliberadamente conservador: si una entrada no tiene fuente fiable,
NO se incluye en el catalogo como "vigente" — mejor no mostrar nada que mostrar un
dato inventado. Los verticales/comunidades sin entrada en AYUDAS se tratan como
"sin programa autonomico localizado" por el motor de elegibilidad.

Mantenimiento: estos datos caducan. Revisar cada convocatoria antes de una
campana de tramitacion masiva; los plazos y dotaciones cambian con cada
ejercicio presupuestario.
"""

from dataclasses import dataclass, field
from typing import Literal, Optional

Fiabilidad = Literal["oficial", "secundaria", "no_verificado"]
EstadoAyuda = Literal["vigente", "agotado", "en_ejecucion", "cerrado", "no_localizado"]

Vertical = Literal[
    "fotovoltaica_autoconsumo",
    "irve",
    "climatizacion_aerotermia",
    "acs",
    "gas_baja_presion",
]


@dataclass(frozen=True)
class Ayuda:
    id: str
    comunidad: Optional[str]  # None = ambito estatal
    vertical: Vertical
    nombre: str
    organismo: str
    estado: EstadoAyuda
    resumen_cuantia: str
    requisitos: str
    plazo: str
    fuente_url: str
    fiabilidad: Fiabilidad
    fecha_consulta: str = "2026-08-09"
    notas: str = ""


# --- Ambito estatal (aplica a las 17 CCAA salvo que exista programa propio) ---

AYUDAS_ESTATALES: list[Ayuda] = [
    Ayuda(
        id="ES-IRPF-EFICIENCIA",
        comunidad=None,
        vertical="climatizacion_aerotermia",
        nombre="Deduccion IRPF por obras de mejora de eficiencia energetica en vivienda",
        organismo="Agencia Tributaria (AEAT)",
        estado="vigente",
        resumen_cuantia="20% (reduccion demanda calefaccion/refrigeracion >=7%, base max. 5.000 EUR/ano), "
        "40% (reduccion consumo energia primaria no renovable >=30% o mejora a clase A/B, base max. 7.500 EUR/ano), "
        "60% (rehabilitacion energetica de edificios completos, base max. 5.000 EUR/ano acumulable hasta 15.000 EUR)",
        requisitos="Requiere certificado de eficiencia energetica antes y despues de la obra. Deduccion aplicable "
        "sobre la vivienda habitual o arrendada.",
        plazo="Obras ejecutadas hasta 31/12/2026 (vivienda individual) o 31/12/2027 (edificios residenciales completos), "
        "prorrogado por RD-ley 16/2025",
        fuente_url="https://sede.agenciatributaria.gob.es/Sede/irpf/campana-renta/deducciones-eficiencia-energetica/deduccion-obras-rehabilitacion-energetica.html",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
        notas="Aplica tambien a solar termica/biomasa/geotermia si logran los umbrales de reduccion de demanda o consumo.",
    ),
    Ayuda(
        id="ES-MOVES-CORREDORES",
        comunidad=None,
        vertical="irve",
        nombre="MOVES Corredores de Recarga (red publica en corredores TEN-T)",
        organismo="IDAE / MITECO",
        estado="cerrado",
        resumen_cuantia="Hasta 70% de la inversion elegible, dotacion 200 M EUR (PRTR)",
        requisitos="Puntos de recarga de acceso publico en la red de corredores europeos TEN-T. No aplica a "
        "recarga domestica/privada.",
        plazo="Convocatoria 30/12/2025-10/02/2026, ya cerrada",
        fuente_url="https://www.idae.es/ayudas-y-financiacion/para-movilidad-y-vehiculos/programa-moves-corredores",
        fiabilidad="secundaria",
        fecha_consulta="2026-08-09",
        notas="MOVES III (compra de vehiculo y recarga privada) cerro definitivamente el 31/12/2025. Su sucesor, "
        "'Plan Auto+' / 'Plan Auto 2030', NO cubre puntos de recarga domesticos o privados, solo compra de "
        "vehiculo electrico/PHEV via descuento en concesionario. Para recarga privada, la unica via activa en 2026 "
        "son las convocatorias propias de cada comunidad autonoma (ver entradas regionales).",
    ),
    Ayuda(
        id="ES-PREE-5000",
        comunidad=None,
        vertical="climatizacion_aerotermia",
        nombre="PREE 5000 - Rehabilitacion energetica en municipios de reto demografico",
        organismo="IDAE (coordinacion) + comunidades autonomas (tramitacion)",
        estado="en_ejecucion",
        resumen_cuantia="Hasta 70% de la inversion subvencionable",
        requisitos="Solo aplica en municipios de menos de 5.000 habitantes. Sustitucion de generacion termica "
        "fosil por renovable: aerotermia, biomasa, solar termica, geotermica/hidrotermica. Cubre tambien ACS.",
        plazo="Sin nuevas solicitudes; plazo de ejecucion y justificacion de expedientes ya concedidos "
        "hasta 30/06/2026",
        fuente_url="https://www.idae.es/en/support-and-funding/renovation-buildings/programa-pree-5000-rehabilitacion-energetica-de-edificios",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
]


# --- Programas autonomicos ---
# Slugs de comunidad alineados con apps/api/motor_normativo/reglas/<comunidad>/

AYUDAS_AUTONOMICAS: list[Ayuda] = [
    # ANDALUCIA
    Ayuda(
        id="AND-FV-INEA",
        comunidad="andalucia",
        vertical="fotovoltaica_autoconsumo",
        nombre="Programa INEA (autoconsumo y almacenamiento)",
        organismo="Agencia Andaluza de la Energia",
        estado="vigente",
        resumen_cuantia="35%-65% segun beneficiario/actuacion; inversion minima 11.000 EUR con subvencion "
        "minima garantizada de 6.000 EUR para FV con almacenamiento",
        requisitos="Autonomos, micro/pequena/mediana empresa, gran empresa, comunidades energeticas",
        plazo="Desde 12/11/2025 hasta 30/09/2027 o agotamiento de fondos (>160 M EUR)",
        fuente_url="https://www.agenciaandaluzadelaenergia.es/en/node/3563",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="AND-IRVE-MOVES3",
        comunidad="andalucia",
        vertical="irve",
        nombre="MOVES III Andalucia 2025 (infraestructura de recarga)",
        organismo="Agencia Andaluza de la Energia",
        estado="cerrado",
        resumen_cuantia="66,78 M EUR (53,42 M EUR vehiculos, 13,35 M EUR infraestructura)",
        requisitos="Particulares, autonomos, empresas, comunidades de propietarios",
        plazo="Solicitud 15/07/2025-31/12/2025, ya cerrada. Sin convocatoria MOVES III abierta en 2026.",
        fuente_url="https://www.agenciaandaluzadelaenergia.es/en/node/3623",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="AND-TERMICAS",
        comunidad="andalucia",
        vertical="climatizacion_aerotermia",
        nombre="Incentivos a renovables termicas en sector residencial",
        organismo="Agencia Andaluza de la Energia",
        estado="no_localizado",
        resumen_cuantia="No confirmado para 2026 (convocatoria previa: 108 M EUR / 6.500 proyectos)",
        requisitos="Solar termica, geotermica, hidrotermica, aerotermica (excepto aire-aire), biomasa",
        plazo="Sin nueva convocatoria oficial publicada para residenciales aislados en BOJA en 2026",
        fuente_url="https://www.agenciaandaluzadelaenergia.es/en/biblioteca/aerotermia",
        fiabilidad="secundaria",
        fecha_consulta="2026-08-09",
        notas="Verificar en BOJA antes de anunciar como vigente.",
    ),
    # ARAGON
    Ayuda(
        id="ARA-FV",
        comunidad="aragon",
        vertical="fotovoltaica_autoconsumo",
        nombre="Autoconsumo renovable (IAF)",
        organismo="Instituto Aragones de Fomento",
        estado="cerrado",
        resumen_cuantia="No disponible - fuera de plazo",
        requisitos="Sector servicios, residencial, AAPP (segun programa)",
        plazo="Fuera del plazo de presentacion, sin convocatoria 2026 confirmada",
        fuente_url="https://www.aragon.es/temas/industria-energia-mineria/ayudas-subvenciones-industria-energia-mineria",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="ARA-IRVE",
        comunidad="aragon",
        vertical="irve",
        nombre="MOVES III Aragon 2025",
        organismo="Gobierno de Aragon",
        estado="cerrado",
        resumen_cuantia="No disponible",
        requisitos="Particulares, autonomos, empresas",
        plazo="Cerrado; se anuncia aviso para bases 2027",
        fuente_url="https://www.aragon.es/tramitador/-/tramite/ayudas-del-programa-moves-iii/moves-iii-2025-implantacion-de-infraestructura-de-recarga-de-vehiculos-electricos",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="ARA-TERMICAS",
        comunidad="aragon",
        vertical="climatizacion_aerotermia",
        nombre="Renovables termicas sector residencial (Programa 6) / Programa 1",
        organismo="Gobierno de Aragon (IAF)",
        estado="no_localizado",
        resumen_cuantia="No confirmado",
        requisitos="Solar termica, biomasa, geotermica, hidrotermica, aerotermica (excluye aire-aire)",
        plazo="No se localizo convocatoria 2026 abierta confirmada; consultar tramitador",
        fuente_url="https://www.aragon.es/tramitador/-/tramite/ayudas-ligadas-al-autoconsumo-almacenamiento-y-sistemas-termicos-con-fuentes-de-energia-renovable-renovables/programa-6-realizacion-de-instalaciones-de-energias-renovables-termicas-en-el-sector-residencial",
        fiabilidad="secundaria",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="ARA-GAS-RENOVE",
        comunidad="aragon",
        vertical="gas_baja_presion",
        nombre="Plan Renove Aragon (calderas de condensacion gas/GLP)",
        organismo="Gobierno de Aragon",
        estado="no_localizado",
        resumen_cuantia="350 EUR/equipo (convocatoria historica 2024, <70 kW clase NOx 6+)",
        requisitos="Calderas de condensacion de gas natural o GLP",
        plazo="No confirmada convocatoria 2026 activa",
        fuente_url="https://www.aragon.es/tramitador/-/tramite/convocatoria-concesion-subvenciones-materia-ahorro-eficiente-energia-traves-puesta-marcha-plan-renove-aragon-2018/convocatoria-2024",
        fiabilidad="secundaria",
        fecha_consulta="2026-08-09",
        notas="Unico programa de gas de baja presion localizado en toda la investigacion (17 CCAA); tratar con "
        "cautela por ser de una convocatoria historica (2024) sin confirmar continuidad.",
    ),
    # BALEARES
    Ayuda(
        id="BAL-FV-FOTOPAR",
        comunidad="baleares",
        vertical="fotovoltaica_autoconsumo",
        nombre="FOTOPAR 2026",
        organismo="Direccio General d'Economia Circular, Transicio Energetica i Canvi Climatic (Govern Balear), "
        "cofinanciado FEDER 2021-2027",
        estado="en_ejecucion",
        resumen_cuantia="No especificado en % - instalaciones FV hasta 5 kWp y/o microeolica hasta 5 kW; "
        "presupuesto 4 M EUR",
        requisitos="Personas fisicas residentes en Baleares sin actividad economica, o con actividad economica "
        "de alta en Censo AEAT. Solo instalaciones nuevas o ampliaciones (baterias anadidas a instalacion "
        "ya operativa NO subvencionables).",
        plazo="Solicitud cerrada el 30/04/2026; expedientes en fase de resolucion/justificacion",
        fuente_url="https://www.caib.es/seucaib/es/tramites/tramite/6439804",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
        notas="Plazo de solicitud finalizado el 30/04/2026. Consultar estado en intranet.caib.es/subvenfront.",
    ),
    Ayuda(
        id="BAL-IRVE",
        comunidad="baleares",
        vertical="irve",
        nombre="MOVES III Baleares",
        organismo="Govern Balear (Direccio General d'Energia)",
        estado="no_localizado",
        resumen_cuantia="40% particulares vivienda urbana, 70% autonomos/PYME/comunidades, hasta 80% municipios "
        "<5.000 hab.; infraestructura hasta 70%, max. 3.000 EUR/punto",
        requisitos="Particulares, autonomos, PYME, comunidades de propietarios, municipios pequenos",
        plazo="No verificado en fuente primaria (BOIB) para 2026",
        fuente_url="https://femp-fondos-europa.es/convocatorias/convocatoria-ayudas-moves-iii-islas-baleares/",
        fiabilidad="no_verificado",
        fecha_consulta="2026-08-09",
        notas="Fuente secundaria unicamente; verificar en BOIB/CAIB antes de mostrar como vigente.",
    ),
    Ayuda(
        id="BAL-TERMICAS",
        comunidad="baleares",
        vertical="climatizacion_aerotermia",
        nombre="Sistemas termicos renovables sector residencial",
        organismo="Govern Balear / Direccio General d'Energia (RD 477/2021, PRTR)",
        estado="cerrado",
        resumen_cuantia="Hasta 70% de la inversion",
        requisitos="Solar termica, biomasa, geotermica, hidrotermica, aerotermica (excluye aire-aire)",
        plazo="Plazo de solicitud finalizado el 30/06/2025; no localizada convocatoria 2026",
        fuente_url="https://www.caib.es/seucaib/es/tramites/tramite/4862280",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    # CANARIAS
    Ayuda(
        id="CAN-FV",
        comunidad="canarias",
        vertical="fotovoltaica_autoconsumo",
        nombre="Transicion Verde Canarias (FEDER 2021-2027)",
        organismo="Consejeria de Transicion Ecologica y Energia, Gobierno de Canarias",
        estado="no_localizado",
        resumen_cuantia="50%-60% del coste subvencionable (dato no reconciliado entre fuentes); "
        "dotacion 18.461.384 EUR",
        requisitos="Administraciones, empresas, particulares, tercer sector, comunidades energeticas",
        plazo="Fechas contradictorias entre fuentes (22/06/2026 vs 13/07/2026); probablemente cerrado a "
        "fecha de hoy",
        fuente_url="https://sede.gobiernodecanarias.org",
        fiabilidad="no_verificado",
        fecha_consulta="2026-08-09",
        notas="Requiere verificacion directa en sede electronica antes de mostrar cifras.",
    ),
    Ayuda(
        id="CAN-IRVE",
        comunidad="canarias",
        vertical="irve",
        nombre="Convocatoria de movilidad sostenible 2026",
        organismo="Consejeria de Transicion Ecologica y Energia (FEDER Canarias 2021-2027)",
        estado="agotado",
        resumen_cuantia="Hasta 100% para puntos de recarga publicos de corporaciones locales/empresas publicas; "
        "hasta 30.000 EUR/vehiculo para transporte colectivo. Dotacion 1.875.000 EUR",
        requisitos="Empresas de transporte, taxistas/VTC, ayuntamientos, cabildos",
        plazo="Plazo citado hasta 13/07/2026 - probablemente agotado a fecha de hoy",
        fuente_url="https://smartgridsinfo.es",
        fiabilidad="secundaria",
        fecha_consulta="2026-08-09",
        notas="No dirigido a particulares/instaladoras, sino a flotas y corporaciones locales.",
    ),
    # CANTABRIA
    Ayuda(
        id="CANT-TERMICAS",
        comunidad="cantabria",
        vertical="climatizacion_aerotermia",
        nombre="Ayudas Renovables Termicas (PRTR)",
        organismo="Direccion General de Industria, Comercio y Consumo, Gobierno de Cantabria",
        estado="cerrado",
        resumen_cuantia="No especificado con fiabilidad suficiente",
        requisitos="Instalaciones termicas con renovables para climatizacion/ACS en viviendas",
        plazo="Vigente hasta 30/06/2026 segun BOC - cerrado a fecha de hoy",
        fuente_url="https://boc.cantabria.es",
        fiabilidad="secundaria",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="CANT-IRVE",
        comunidad="cantabria",
        vertical="irve",
        nombre="MOVES III Cantabria (convocatoria 2025)",
        organismo="Consejeria de Industria, Empleo, Innovacion y Comercio",
        estado="cerrado",
        resumen_cuantia="~2 M EUR para puntos de recarga (uso privado y publico)",
        requisitos="Autonomos, particulares mayores de edad sin actividad economica, comunidades de propietarios",
        plazo="Cerrado; sustituido desde 01/01/2026 por 'Plan Auto Plus' (bases aun no confirmadas en Cantabria)",
        fuente_url="https://sede.cantabria.es",
        fiabilidad="secundaria",
        fecha_consulta="2026-08-09",
    ),
    # CASTILLA-LA MANCHA
    Ayuda(
        id="CLM-FV",
        comunidad="castilla_la_mancha",
        vertical="fotovoltaica_autoconsumo",
        nombre="Programas de incentivos 4 y 5 (autoconsumo y almacenamiento)",
        organismo="Direccion General de Transicion Energetica, JCCM",
        estado="cerrado",
        resumen_cuantia="Dotacion conjunta >6 M EUR (convocatoria historica)",
        requisitos="Particulares, comunidades de propietarios, administraciones publicas, comunidades "
        "energeticas, tercer sector",
        plazo="Cerrado a nuevas solicitudes desde finales de 2023; en fase de resolucion/justificacion",
        fuente_url="https://energia.castillalamancha.es/ayudas/autoconsumo-almacenamiento-e-instalaciones-termicas",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="CLM-IRVE",
        comunidad="castilla_la_mancha",
        vertical="irve",
        nombre="MOVES III Castilla-La Mancha (convocatoria 2025)",
        organismo="Junta de Comunidades de Castilla-La Mancha",
        estado="en_ejecucion",
        resumen_cuantia="Hasta 7.000 EUR compra VE turismo, 1.300 EUR motos, 9.000 EUR furgonetas; "
        "dotacion 16,2 M EUR",
        requisitos="Particulares, autonomos, empresas",
        plazo="Cerrado a nuevas solicitudes desde 31/12/2025; plazo de justificacion hasta 31/12/2026",
        fuente_url="https://energia.castillalamancha.es/ayudas/plan-moves-iii-2025",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    # CASTILLA Y LEON
    Ayuda(
        id="CYL-FV-EREN",
        comunidad="castilla_leon",
        vertical="fotovoltaica_autoconsumo",
        nombre="EREN-Solar 2026",
        organismo="Ente Regional de la Energia (EREN), Junta de Castilla y Leon",
        estado="vigente",
        resumen_cuantia="Hasta 700 EUR/kWp con limite de 5.250 EUR para vivienda unifamiliar, mas "
        "1.200 EUR/kWh para bateria",
        requisitos="Solicitud obligatoria ANTES de iniciar la instalacion (requisito estricto)",
        plazo="01/04/2026 - 31/10/2026",
        fuente_url="https://tramita.jcyl.es",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
        notas="BOCYL n.51, 17/03/2026.",
    ),
    Ayuda(
        id="CYL-TERMICAS",
        comunidad="castilla_leon",
        vertical="climatizacion_aerotermia",
        nombre="Solar Termica, Biomasa, Geotermia y Aerotermia Sector Residencial (PRTR-MRR)",
        organismo="EREN, Junta de Castilla y Leon",
        estado="en_ejecucion",
        resumen_cuantia="No especificado con fiabilidad suficiente",
        requisitos="Solar termica, biomasa, geotermica, hidrotermica o aerotermica (excluye aire-aire) "
        "para calefaccion y/o ACS",
        plazo="Sin nuevas solicitudes; plazo de justificacion hasta 31/05/2026",
        fuente_url="https://energia.jcyl.es/web/es/solar-termica-biomasa-geotermia.html",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    # CATALUNA
    Ayuda(
        id="CAT-FV",
        comunidad="cataluna",
        vertical="fotovoltaica_autoconsumo",
        nombre="Ajuts a l'autoconsum, emmagatzematge i renovables termiques (RD 477/2021)",
        organismo="ICAEN",
        estado="cerrado",
        resumen_cuantia="No aplica - fondos agotados",
        requisitos="Convocatoria 2022, ya sin nuevas solicitudes",
        plazo="Ejecucion/justificacion de expedientes concedidos hasta 31/08/2026",
        fuente_url="https://icaen.gencat.cat/ca/energia/ajuts/energies-renovables/ajuts-renovables-2022",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="CAT-TERMICAS-PREE5000",
        comunidad="cataluna",
        vertical="climatizacion_aerotermia",
        nombre="PREE5000 ICAEN (rehabilitacion energetica edificios)",
        organismo="ICAEN / IDAE",
        estado="en_ejecucion",
        resumen_cuantia="No especificado con fiabilidad suficiente",
        requisitos="Municipios de reto demografico; incluye climatizacion/ACS",
        plazo="Plazo de ejecucion/justificacion vence 08/04/2026, sin nueva convocatoria abierta",
        fuente_url="https://icaen.gencat.cat/es/energia/ajuts/edificis/pree5000-icaen-programa-dajuts-a-la-rehabilitacio-energetica-dedificis/index.html",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    # EXTREMADURA
    Ayuda(
        id="EXT-FV",
        comunidad="extremadura",
        vertical="fotovoltaica_autoconsumo",
        nombre="Ayuda al autoconsumo y sistemas termicos renovables (Decreto 145/2021)",
        organismo="Consejeria de Industria, Energia, Ciencia y Territorio",
        estado="cerrado",
        resumen_cuantia="300-1.188 EUR/kWp segun programa/sector (15%-45% s/coste); almacenamiento "
        "140-700 EUR/kWh",
        requisitos="Personas fisicas, autonomos, PYMEs, comunidades de propietarios, entidades locales, "
        "comunidades energeticas",
        plazo="Plazo 26/01/2022-31/12/2023, sin sucesor 2024-2026",
        fuente_url="https://www.juntaex.es/w/6039",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="EXT-IRVE",
        comunidad="extremadura",
        vertical="irve",
        nombre="Subvenciones MOVES III (RD-ley 3/2025)",
        organismo="Consejeria de Industria, Energia, Ciencia y Territorio",
        estado="cerrado",
        resumen_cuantia="70% coste subvencionable (particulares/autonomos/comunidades), 80% municipios "
        "<5.000 hab.; empresas 20%-55% segun tamano",
        requisitos="Particulares, autonomos, comunidades de propietarios, empresas",
        plazo="Convocatoria 2025: 23/09/2025-31/12/2025, cerrada; sin convocatoria 2026",
        fuente_url="https://www.juntaex.es/w/6033",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="EXT-TERMICAS",
        comunidad="extremadura",
        vertical="climatizacion_aerotermia",
        nombre="Programa de incentivos 6 (termicas renovables) + PREE 5000 Extremadura",
        organismo="Consejeria de Industria, Energia, Ciencia y Territorio",
        estado="cerrado",
        resumen_cuantia="Aerotermia 500 EUR/kW (hasta 3.000 EUR/vivienda), solar termica 450-900 EUR/kW, "
        "biomasa 250 EUR/kW, geotermica/hidrotermica 1.600-2.250 EUR/kW",
        requisitos="Residencial, PREE5000 solo municipios <5.000 hab.",
        plazo="Fuera de plazo (PREE5000: 08/11/2022-31/07/2024)",
        fuente_url="https://www.juntaex.es/w/6099",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    # GALICIA
    Ayuda(
        id="GAL-FV",
        comunidad="galicia",
        vertical="fotovoltaica_autoconsumo",
        nombre="IN421N/IN421O (residencial, fondos FEADER) e IN421S (empresas 100-1.000 kWp, FEDER)",
        organismo="INEGA",
        estado="en_ejecucion",
        resumen_cuantia="50% inversion elegible, max. 4.000 EUR/vivienda (paneles) + 2.000 EUR baterias; "
        "hasta 25.000 EUR multivivienda. Dotacion 2.000.000 EUR (IN421N/O)",
        requisitos="Residencial en ambitos rurales/no urbanos (IN421N/O); empresas 100-1.000 kWp (IN421S)",
        plazo="Solicitud cerrada (IN421S: 28/01/2026-02/03/2026; IN421N/O: 31/10/2025-01/12/2025); ejecucion/justificacion hasta 30/09/2026",
        fuente_url="https://www.inega.gal/es/ayudas/subvenciones-para-el-ano-2025-2026-proyectos-de-energia-fotovoltaica-en-el-sector",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
        notas="Galicia mantiene un ciclo de convocatorias anuales a traves del INEGA. Las lineas 2026 (IN421S, IN421N/O) cerraron su plazo de presentacion en el primer trimestre; vigilar DOG para la proxima convocatoria (previsiblemente dic-2026/ene-2027).",
    ),
    Ayuda(
        id="GAL-IRVE",
        comunidad="galicia",
        vertical="irve",
        nombre="MOVES III Galicia (IN421Q/IN421R)",
        organismo="INEGA",
        estado="en_ejecucion",
        resumen_cuantia="70% (80% municipios <5.000 hab.) particulares/autonomos/comunidades; empresas "
        "20%-60% segun tamano. Presupuesto total 32,9 M EUR",
        requisitos="Particulares, autonomos, comunidades de propietarios, empresas",
        plazo="Solicitud cerrada desde 31/12/2025; ampliaciones sucesivas de credito, ejecucion hasta 31/12/2026",
        fuente_url="https://www.inega.gal/es/ayudas/subvenciones-ano-2025-para-movilidad-electrica-programa-moves-iii-en-galicia-in421q-in421r",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="GAL-TERMICAS",
        comunidad="galicia",
        vertical="climatizacion_aerotermia",
        nombre="IN421H/IN421P - Enerxias renovables de uso termico no sector residencial",
        organismo="INEGA",
        estado="en_ejecucion",
        resumen_cuantia="50% inversion elegible; tope 900 EUR/kW aerotermia (max. 2.500 EUR/vivienda), "
        "biomasa hasta 8.000 EUR/vivienda, geotermia hasta 10.000 EUR/vivienda, solar termica hasta "
        "2.000 EUR/vivienda. Presupuesto 2,1 M EUR (800.000 EUR aerotermia)",
        requisitos="Personas fisicas y comunidades de vecinos en Galicia (solicitud via entidades colaboradoras)",
        plazo="Solicitud 28/01/2026-13/03/2026 (cerrada); ejecucion/justificacion hasta 30/09/2026",
        fuente_url="https://www.inega.gal/es/ayudas/subvencions-para-o-ano-2026-proxectos-de-enerxias-renovables-de-uso-termico-no-sector",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
        notas="Publicado en DOG de 20/01/2026 (Resolucion de 16/12/2025).",
    ),
    # MADRID
    Ayuda(
        id="MAD-FV",
        comunidad="madrid",
        vertical="fotovoltaica_autoconsumo",
        nombre="Ayudas a la inversion en generacion electrica renovable (Comunidad de Madrid)",
        organismo="Comunidad de Madrid / IDAE",
        estado="cerrado",
        resumen_cuantia="No aplica - programa extinguido",
        requisitos="Fotovoltaica autoconsumo 10 kW-10 MW",
        plazo="Plazo finalizo 14/12/2020; sin convocatoria sucesora autonomica localizada",
        fuente_url="https://sede.idae.gob.es/tramites-servicios/comunidad-autonoma-de-madrid-0",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="MAD-IRVE",
        comunidad="madrid",
        vertical="irve",
        nombre="MOVES III Madrid (Programa 2 - infraestructura de recarga)",
        organismo="FENERCOM",
        estado="agotado",
        resumen_cuantia="Presupuesto agotado; 93,2% del presupuesto de recarga concedido",
        requisitos="Particulares, autonomos, empresas, comunidades de propietarios",
        plazo="Solicitud cerrada desde 31/12/2025; reasignaciones periodicas de fondos liberados para lista de espera (ultima 22/07/2026 con 1,5 M EUR), ejecucion vigente hasta 31/12/2026",
        fuente_url="https://www.comunidad.madrid/noticias/2026/07/22/comunidad-madrid-otorga-15-millones-euros-peticiones-espera-programa-moves-iii-2025-fomentar-movilidad-electrica",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
        notas="Puede haber reasignaciones puntuales de fondos liberados por bajas o desestimaciones; consultar FENERCOM para lista de espera.",
    ),
    # MURCIA
    Ayuda(
        id="MUR-FV-PYMES",
        comunidad="murcia",
        vertical="fotovoltaica_autoconsumo",
        nombre="Ayudas a PYMES para eficiencia energetica e instalaciones FV de autoconsumo",
        organismo="Consejeria de Medio Ambiente, Universidades, Investigacion y Mar Menor (CARM), FEDER 2021-2027",
        estado="cerrado",
        resumen_cuantia="Inversion subvencionable minima 6.000 EUR, maxima 60.000 EUR/beneficiario. "
        "Dotacion 5,3 M EUR (3,5 M EUR linea fotovoltaica)",
        requisitos="PYMEs",
        plazo="23/03/2026-30/04/2026, cerrado; pendiente ver si reabre",
        fuente_url="https://sede.carm.es/web/pagina?IDCONTENIDO=4609",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="MUR-IRVE",
        comunidad="murcia",
        vertical="irve",
        nombre="MOVES III (infraestructura de recarga)",
        organismo="ARGEM / CARM",
        estado="en_ejecucion",
        resumen_cuantia="Hasta 70% del coste subvencionable, hasta 80% en municipios <5.000 hab.",
        requisitos="Particulares, autonomos, empresas, comunidades de propietarios, entidades sin animo de "
        "lucro, entidades locales, universidades",
        plazo="Solicitudes cerradas; en fase de resolucion y pago de expedientes presentados en Sede Electronica CARM (procedimiento 3573)",
        fuente_url="https://sede.carm.es/web/pagina?IDCONTENIDO=3573",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    # NAVARRA
    Ayuda(
        id="NAV-IRVE-TXIMISTA",
        comunidad="navarra",
        vertical="irve",
        nombre="Plan Tximista Auto 2026",
        organismo="Gobierno de Navarra",
        estado="vigente",
        resumen_cuantia="Particulares 70% de la inversion en punto de carga (max. 1.000 EUR); empresas "
        "hasta 10.000 EUR (con actividad economica) o 200.000 EUR. Dotacion 4,7 M EUR "
        "(3,7 M EUR vehiculos + 1 M EUR infraestructura)",
        requisitos="Particulares y empresas",
        plazo="01/05/2026-31/08/2026",
        fuente_url="https://www.navarra.es/es/-/nota-prensa/las-ayudas-del-plan-tximista-auto-2026-se-podran-solicitar",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="NAV-TERMICAS",
        comunidad="navarra",
        vertical="climatizacion_aerotermia",
        nombre="Ayudas a la descarbonizacion sector residencial 2026-2027",
        organismo="Gobierno de Navarra",
        estado="en_ejecucion",
        resumen_cuantia="Hasta 4.000 EUR/beneficiario. Dotacion 1.941.236 EUR (dentro de paquete de 5,55 M EUR)",
        requisitos="Sustitucion de calderas fosiles por aerotermia aire-agua, solar termica, biomasa, "
        "geotermia circuito cerrado, hidrotermia. Personas fisicas, comunidades de propietarios, "
        "cooperativas de vivienda",
        plazo="Solicitud 20/01/2026-19/02/2026, ya cerrada",
        fuente_url="https://www.eseficiencia.es/2026/01/19/navarra-lanza-nuevas-ayudas-impulsar-transicion-energetica-descarbonizacion-555-millones",
        fiabilidad="secundaria",
        fecha_consulta="2026-08-09",
    ),
    # PAIS VASCO
    Ayuda(
        id="EUS-FV-EVE",
        comunidad="pais_vasco",
        vertical="fotovoltaica_autoconsumo",
        nombre="EVE - Ayudas a la generacion electrica para autoconsumo mediante energias renovables",
        organismo="Ente Vasco de la Energia (EVE)",
        estado="vigente",
        resumen_cuantia="Hasta 45% del coste subvencionable para pequena empresa en autoconsumo renovable. "
        "Presupuesto 80 M EUR total (60 M EUR autoconsumo + 20 M EUR electrificacion termica)",
        requisitos="Personas fisicas, empresas, autonomos, comunidades de propietarios, organismos publicos",
        plazo="Desde 09/05/2025 hasta 30/09/2026 o agotamiento de fondos",
        fuente_url="https://www.euskadi.eus/ayuda_subvencion/2025/eve-programa-de-ayudas-a-la-generacion-electrica-para-autoconsumo-mediante-energias-renovables",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
    Ayuda(
        id="EUS-TERMICAS-EVE",
        comunidad="pais_vasco",
        vertical="climatizacion_aerotermia",
        nombre="EVE - Electrificacion de consumos termicos mediante energias renovables",
        organismo="Ente Vasco de la Energia (EVE)",
        estado="vigente",
        resumen_cuantia="Hasta 500 EUR/kW de potencia util de calefaccion, maximo 3.000 EUR por instalacion "
        "de aerotermia (aire-agua, geotermia con sondeos verticales, hidrotermia)",
        requisitos="Solicitud OBLIGATORIA antes de firmar contratos o pagos. Personas fisicas sin actividad "
        "economica, empresas, autonomos, comunidades de propietarios, organismos publicos",
        plazo="Hasta 30/09/2026 o agotamiento de fondos",
        fuente_url="https://www.euskadi.eus",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
        notas="Compatible con deduccion fiscal vasca del 15% sobre la inversion.",
    ),
    # LA RIOJA
    Ayuda(
        id="RIO-ENTIDADES-LOCALES",
        comunidad="la_rioja",
        vertical="fotovoltaica_autoconsumo",
        nombre="Convocatoria unica para entidades locales (infraestructuras electricas, IRVE y renovables)",
        organismo="Gobierno de La Rioja",
        estado="vigente",
        resumen_cuantia="Intensidad 90% en municipios <1.000 habitantes, 85% en el resto. Dotacion 500.000 EUR",
        requisitos="SOLO ayuntamientos de hasta 20.000 habitantes, no particulares ni empresas",
        plazo="2 meses desde el 04/07/2026 (hasta aprox. 04/09/2026)",
        fuente_url="https://www.smartgridsinfo.es/2026/07/17/rioja-convoca-ayudas-infraestructuras-electricas-puntos-recarga-proyectos-renovables",
        fiabilidad="secundaria",
        fecha_consulta="2026-08-09",
        notas="No aplica a particulares/instaladoras - solo entidades locales. No se localizo convocatoria "
        "riojana para particulares o empresas en 2026.",
    ),
    # COMUNIDAD VALENCIANA
    Ayuda(
        id="VAL-FV-MUNICIPIOS",
        comunidad="comunidad_valenciana",
        vertical="fotovoltaica_autoconsumo",
        nombre="Ayudas a instalaciones de autoconsumo en municipios de la Comunitat Valenciana",
        organismo="IVACE",
        estado="cerrado",
        resumen_cuantia="Dotacion 2.000.000 EUR",
        requisitos="SOLO ayuntamientos, no particulares ni empresas",
        plazo="Hasta 18/05/2026, cerrado",
        fuente_url="https://cindi.gva.es",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
        notas="No se localizo convocatoria IVACE 2026 propia para particulares/empresas mas alla de esta.",
    ),
    Ayuda(
        id="VAL-IRVE",
        comunidad="comunidad_valenciana",
        vertical="irve",
        nombre="Plan MOVES III (IVACE)",
        organismo="IVACE",
        estado="cerrado",
        resumen_cuantia="No aplica - programa finalizado",
        requisitos="Particulares, autonomos, empresas",
        plazo="Finalizado a fin de 2025, sin nuevas solicitudes en 2026",
        fuente_url="https://moves.ivace.es/es/moves-iii-recarga",
        fiabilidad="oficial",
        fecha_consulta="2026-08-09",
    ),
]


TODAS_LAS_AYUDAS: list[Ayuda] = AYUDAS_ESTATALES + AYUDAS_AUTONOMICAS


def buscar_ayudas(comunidad: str, vertical: str) -> list[Ayuda]:
    """
    Devuelve las ayudas conocidas para una comunidad y vertical dados, incluyendo
    las de ambito estatal aplicables a cualquier comunidad.

    No filtra por estado: el consumidor de esta funcion decide como comunicar
    "vigente" vs "cerrado" vs "no_localizado" al usuario (ver servicios/ayudas.py).
    """
    return [
        a
        for a in TODAS_LAS_AYUDAS
        if a.vertical == vertical and (a.comunidad is None or a.comunidad == comunidad)
    ]
