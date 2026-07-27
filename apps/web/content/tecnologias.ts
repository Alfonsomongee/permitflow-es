export type FichaTecnologia = {
  id:
    | "fotovoltaica_autoconsumo"
    | "irve"
    | "climatizacion_aerotermia"
    | "acs"
    | "gas_baja_presion";
  nombre: string;
  descripcionCorta: string;
  queEs: string;
  paraQuienEncaja: string[];
  cuandoNoEncaja: string[];
  factorDecisivo: string;
};

export const TECNOLOGIAS: FichaTecnologia[] = [
  {
    id: "fotovoltaica_autoconsumo",
    nombre: "Fotovoltaica de autoconsumo",
    descripcionCorta:
      "Generación eléctrica solar para consumo propio, con o sin excedentes vertidos a red.",
    queEs:
      "Una instalación fotovoltaica de autoconsumo convierte la radiación solar en electricidad mediante paneles instalados en cubierta o suelo. La energía generada se consume directamente en el edificio o actividad, reduciendo la demanda de red. Si la instalación vierte excedentes, el titular recibe compensación económica regulada por el RD 244/2019.",
    paraQuienEncaja: [
      "Naves industriales o comerciales con cubierta disponible y consumo diurno elevado",
      "Comunidades de propietarios con cubierta comunitaria y acuerdo de reparto",
      "Explotaciones agrarias con bombeo o refrigeración diurna",
      "Edificios terciarios (oficinas, centros educativos) con perfil de consumo concentrado en horario solar",
    ],
    cuandoNoEncaja: [
      "Actividades con consumo mayoritariamente nocturno y sin batería de almacenamiento",
      "Cubiertas con orientación predominante norte o sombreamiento permanente por edificios colindantes",
      "Edificios con cubierta insuficiente respecto a la demanda (ratio superficie/consumo muy bajo)",
      "Zonas con restricción urbanística sobre elementos en cubierta (BIC, cascos históricos protegidos)",
    ],
    factorDecisivo:
      "Radiación solar disponible en la ubicación (kWh/m²/año) y coincidencia entre generación y consumo.",
  },
  {
    id: "irve",
    nombre: "Recarga de vehículo eléctrico (IRVE)",
    descripcionCorta:
      "Infraestructura de recarga para vehículos eléctricos en espacios públicos, privados o comunitarios.",
    queEs:
      "Una IRVE es el conjunto de equipos necesarios para suministrar energía eléctrica a vehículos eléctricos o híbridos enchufables. Incluye el punto de recarga, las protecciones eléctricas, el cableado y, en instalaciones de acceso público, el sistema de gestión y pago. La normativa distingue entre instalaciones vinculadas a la red interior del edificio (REBT) y las que requieren nuevo suministro eléctrico.",
    paraQuienEncaja: [
      "Garajes comunitarios que necesitan cumplir la dotación obligatoria del RD-ley 29/2021",
      "Empresas con flota de vehículos eléctricos propios",
      "Estaciones de servicio, centros comerciales o aparcamientos que quieran ofrecer recarga de acceso público",
      "Promotoras que construyen obra nueva con obligación CTE DB-HE6",
    ],
    cuandoNoEncaja: [
      "Garajes sin acometida eléctrica suficiente y sin viabilidad técnica de ampliación de potencia",
      "Localizaciones rurales aisladas sin red de distribución cercana",
      "Instalaciones donde el coste del refuerzo eléctrico supera el valor de uso previsible a medio plazo",
    ],
    factorDecisivo:
      "Potencia disponible en la acometida existente y necesidad (o no) de nuevo suministro eléctrico.",
  },
  {
    id: "climatizacion_aerotermia",
    nombre: "Climatización y aerotermia",
    descripcionCorta:
      "Sistemas de calefacción, refrigeración y producción de calor basados en bomba de calor aerotérmica.",
    queEs:
      "La aerotermia es una tecnología de bomba de calor que extrae energía del aire exterior para calefacción, refrigeración o producción de agua caliente. Está reconocida como energía renovable por la Directiva 2009/28/CE cuando su COP supera los umbrales establecidos. Sustituye total o parcialmente a calderas de combustible fósil, especialmente en sistemas de suelo radiante o fan-coils.",
    paraQuienEncaja: [
      "Edificios con sistema de distribución a baja temperatura (suelo radiante, fan-coils)",
      "Viviendas y locales que buscan sustituir calderas de gasoil o gas en zonas climáticas A-C",
      "Obra nueva obligada a cubrir parte de la demanda con renovables (CTE DB-HE4)",
      "Edificios terciarios con necesidades simultáneas de frío y calor",
    ],
    cuandoNoEncaja: [
      "Edificios con radiadores de alta temperatura existentes (70-80 °C) en zonas climáticas D-E sin reforma del sistema de emisión",
      "Zonas con temperaturas exteriores sostenidas por debajo de -10 °C, donde el rendimiento cae significativamente",
      "Locales sin espacio exterior para la unidad condensadora o con restricciones acústicas severas",
    ],
    factorDecisivo:
      "Zona climática CTE (severidad de invierno) y compatibilidad con el sistema de emisión existente.",
  },
  {
    id: "acs",
    nombre: "ACS y legionella",
    descripcionCorta:
      "Instalaciones de agua caliente sanitaria y su mantenimiento preventivo frente a legionella.",
    queEs:
      "El ACS comprende la producción, acumulación y distribución de agua caliente para uso sanitario (duchas, grifos, cocinas). Toda instalación con acumulación o red de retorno está sujeta al RD 487/2022 de prevención de legionelosis, que exige tratamiento térmico, desinfección y registro de operaciones. El RITE y el CTE DB-HE4 regulan, además, la contribución solar o renovable mínima.",
    paraQuienEncaja: [
      "Hoteles, hospitales, residencias y cualquier edificio con acumulación de ACS y riesgo de legionella",
      "Instalaciones deportivas con duchas colectivas",
      "Viviendas colectivas con producción centralizada de ACS",
      "Rehabilitaciones que necesitan actualizar el sistema de producción de ACS a renovables",
    ],
    cuandoNoEncaja: [
      "Viviendas unifamiliares con calentador instantáneo sin acumulación (el riesgo de legionella es muy bajo)",
      "Locales comerciales sin producción propia de ACS (la demanda es nula o irrelevante)",
    ],
    factorDecisivo:
      "Existencia de acumulación de ACS y volumen del depósito (el riesgo de legionella y las obligaciones de mantenimiento aumentan con el volumen).",
  },
  {
    id: "gas_baja_presion",
    nombre: "Gas baja presión",
    descripcionCorta:
      "Instalaciones receptoras de gas natural o GLP a presión normal o media-baja.",
    queEs:
      "Las instalaciones receptoras de gas canalizan combustible gaseoso (gas natural o GLP) desde la acometida o el depósito hasta los aparatos de consumo (calderas, cocinas, secadoras). La normativa distingue entre presión normal (≤0,05 bar) y media-baja (≤0,4 bar para GLP; ≤4 bar para gas natural). Cada puesta en servicio o modificación requiere certificado IRG3 o IRG4 expedido por un instalador habilitado categoría A o B.",
    paraQuienEncaja: [
      "Viviendas o locales que conectan a red de gas natural por primera vez",
      "Cambio de contador, modificación de recorrido interior o ampliación de puntos de consumo",
      "Sustitución de aparatos de gas que requiere recertificación de la instalación receptora",
      "Comunidades que realizan inspecciones periódicas obligatorias cada 5 años",
    ],
    cuandoNoEncaja: [
      "Edificios que ya han migrado completamente a aerotermia o bomba de calor eléctrica",
      "Zonas sin red de distribución de gas natural y sin depósito de GLP centralizado",
      "Nuevas construcciones que optan por electrificación total (sin acometida de gas desde proyecto)",
    ],
    factorDecisivo:
      "Tipo de gas (natural vs. GLP) y presión de suministro, que determinan la categoría del instalador y el certificado requerido.",
  },
];
