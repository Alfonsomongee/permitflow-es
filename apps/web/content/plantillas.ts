export type TipoInstalacion =
  | "fotovoltaica_autoconsumo"
  | "infraestructura_recarga"
  | "climatizacion_aerotermia"
  | "acs_agua_caliente"
  | "gas_baja_presion";

export type Organismo =
  | "distribuidora"
  | "ccaa_industria"
  | "miteco"
  | "ayuntamiento"
  | "comunidad_propietarios"
  | "empresa_autorizada"
  | "idae";

export type PlantillaDocumento = {
  id: string;
  nombre: string;
  descripcion: string;
  tipos_instalacion: TipoInstalacion[];
  organismo: Organismo;
  organismo_label: string;
  ccaa_aplicacion: "estatal" | string[];
  base_legal: string;
  cuando_se_necesita: string;
  hay_formulario_oficial: boolean;
  url_organismo?: string;
  notas?: string;
  /**
   * "mtd" si este documento coincide con un tipo que el motor de generación
   * real (apps/api/documentos/generador.py, VERTICALES_MTD) puede producir
   * automáticamente como borrador DOCX a partir de un expediente ya creado.
   * null si es un documento puramente informativo/de referencia: hoy la
   * mayoría de la tabla (CAU, CIE, IRG-3, declaración responsable...) no
   * tiene generación automática — los emite un tercero (distribuidora,
   * instalador autorizado) o requiere firma de un técnico competente.
   * Antes esta distinción no existía en el catálogo y la página prometía
   * más automatización de la que el backend soporta.
   */
  tipo_generable?: "mtd";
};

/** Traduce el slug de tecnología de este catálogo (contenido de marketing/
 * referencia) al slug que usa el motor normativo/clasificador en el backend.
 * Son namespaces distintos que coincidieron por casualidad en 3 de 5 casos;
 * mantenerlos explícitos evita que un futuro cambio en uno rompa al otro. */
export const TIPO_A_CLASIFICADOR: Record<TipoInstalacion, string> = {
  fotovoltaica_autoconsumo: "fotovoltaica_autoconsumo",
  infraestructura_recarga: "irve",
  climatizacion_aerotermia: "climatizacion_aerotermia",
  acs_agua_caliente: "acs",
  gas_baja_presion: "gas_baja_presion",
};

export const catalogoPlantillas: PlantillaDocumento[] = [
  {
    id: "cau",
    nombre: "CAU — Código de Autoconsumo",
    descripcion: "Solicitud del código de identificación de la instalación de autoconsumo ante la empresa distribuidora. Es el primer paso obligatorio para cualquier instalación fotovoltaica de autoconsumo.",
    tipos_instalacion: ["fotovoltaica_autoconsumo"],
    organismo: "distribuidora",
    organismo_label: "Empresa Distribuidora de zona",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 244/2019, Art. 5",
    cuando_se_necesita: "Siempre — primer paso antes de cualquier otro trámite",
    hay_formulario_oficial: false,
    notas: "Cada distribuidora (Endesa, Iberdrola, UFD...) tiene su propio formulario.",
  },
  {
    id: "acuerdo_reparto_colectivo",
    nombre: "Acuerdo de Reparto de Energía (Autoconsumo Colectivo)",
    descripcion: "Documento que formaliza el reparto de la energía generada entre los participantes de un autoconsumo colectivo. El IDAE ofrece modelos descargables.",
    tipos_instalacion: ["fotovoltaica_autoconsumo"],
    organismo: "idae",
    organismo_label: "IDAE (modelo descargable)",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 244/2019, Art. 17 y siguientes",
    cuando_se_necesita: "Solo en instalaciones de autoconsumo colectivo (varios participantes)",
    hay_formulario_oficial: true,
    url_organismo: "https://www.idae.es",
    notas: "Modelo en ZIP en la sección de Autoconsumo del IDAE.",
  },
  {
    id: "mtd_fv",
    nombre: "MTD — Memoria Técnica de Diseño (Fotovoltaica < 10 kW)",
    descripcion: "Documento técnico que describe la instalación fotovoltaica. Requerido para instalaciones de autoconsumo de hasta 10 kWp.",
    tipos_instalacion: ["fotovoltaica_autoconsumo"],
    organismo: "ccaa_industria",
    organismo_label: "Consejería de Industria / Energía de la CCAA",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 244/2019 + ITC-BT-04",
    cuando_se_necesita: "Instalaciones fotovoltaicas de hasta 10 kWp",
    hay_formulario_oficial: false,
    notas: "Cada CCAA tiene su propio modelo. Presentar en la sede electrónica de la Consejería de Industria.",
    tipo_generable: "mtd",
  },
  {
    id: "proyecto_tecnico_fv",
    nombre: "Proyecto Técnico + Certificado de Dirección de Obra (FV > 10 kW)",
    descripcion: "Proyecto técnico firmado por ingeniero competente y acta de dirección de obra, requerido para instalaciones fotovoltaicas superiores a 10 kWp.",
    tipos_instalacion: ["fotovoltaica_autoconsumo"],
    organismo: "ccaa_industria",
    organismo_label: "Consejería de Industria / Energía de la CCAA",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 244/2019 + ITC-BT-04",
    cuando_se_necesita: "Instalaciones fotovoltaicas de más de 10 kWp",
    hay_formulario_oficial: false,
    notas: "Firmado por ingeniero competente. Puede requerir visado del colegio profesional según CCAA.",
  },
  {
    id: "ficha_pues_andalucia",
    nombre: "Ficha Técnica PUES (Andalucía)",
    descripcion: "Documento específico de la Junta de Andalucía para instalaciones de autoconsumo de hasta 500 kW, tramitado vía la plataforma TECI/PUES.",
    tipos_instalacion: ["fotovoltaica_autoconsumo"],
    organismo: "ccaa_industria",
    organismo_label: "Junta de Andalucía — Plataforma TECI/PUES",
    ccaa_aplicacion: ["andalucia"],
    base_legal: "Decreto 141/2012 Andalucía (y posteriores)",
    cuando_se_necesita: "Instalaciones en Andalucía de hasta 500 kWp",
    hay_formulario_oficial: true,
    url_organismo: "https://www.juntadeandalucia.es",
  },
  {
    id: "inscripcion_registro_autoconsumo",
    nombre: "Inscripción en el Registro Administrativo de Autoconsumo",
    descripcion: "Trámite final para registrar la instalación de autoconsumo ante el MITECO o la CCAA delegada. Obligatorio para completar la legalización.",
    tipos_instalacion: ["fotovoltaica_autoconsumo"],
    organismo: "miteco",
    organismo_label: "MITECO / CCAA delegada",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 244/2019, Art. 20",
    cuando_se_necesita: "Siempre — último paso de la legalización",
    hay_formulario_oficial: true,
    url_organismo: "https://sedeaplicaciones.minetur.gob.es",
  },
  {
    id: "cie_irve",
    nombre: "CIE — Certificado de Instalación Eléctrica (IRVE)",
    descripcion: "El \"Boletín Eléctrico\" para instalaciones de recarga de vehículos eléctricos. Emitido por el instalador autorizado al terminar la obra, obligatorio para la legalización ante la CCAA.",
    tipos_instalacion: ["infraestructura_recarga"],
    organismo: "ccaa_industria",
    organismo_label: "Consejería de Industria de la CCAA",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 1053/2014 ITC-BT-52",
    cuando_se_necesita: "Siempre, en toda instalación IRVE",
    hay_formulario_oficial: false,
    notas: "Emitido exclusivamente por instalador eléctrico autorizado.",
  },
  {
    id: "mtd_irve",
    nombre: "MTD — Memoria Técnica de Diseño (IRVE pequeña)",
    descripcion: "Memoria técnica para instalaciones de recarga de potencia reducida.",
    tipos_instalacion: ["infraestructura_recarga"],
    organismo: "ccaa_industria",
    organismo_label: "Consejería de Industria de la CCAA",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 1053/2014 ITC-BT-52 + ITC-BT-04",
    cuando_se_necesita: "Instalaciones interiores < 50 kW / Instalaciones exteriores < 10 kW",
    hay_formulario_oficial: false,
    tipo_generable: "mtd",
  },
  {
    id: "proyecto_tecnico_irve",
    nombre: "Proyecto Técnico (IRVE grande)",
    descripcion: "Proyecto técnico firmado por ingeniero para instalaciones IRVE de alta potencia.",
    tipos_instalacion: ["infraestructura_recarga"],
    organismo: "ccaa_industria",
    organismo_label: "Consejería de Industria de la CCAA",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 1053/2014 ITC-BT-04",
    cuando_se_necesita: "Instalaciones interiores > 50 kW / Instalaciones exteriores > 10 kW",
    hay_formulario_oficial: false,
    notas: "Firmado por ingeniero competente.",
  },
  {
    id: "comunicacion_pan_irve",
    nombre: "Comunicación al Punto de Acceso Nacional (IRVE público)",
    descripcion: "Información de ubicación, precios y disponibilidad de puntos de recarga de acceso público. Actualizar en máximo 1 semana ante cambios.",
    tipos_instalacion: ["infraestructura_recarga"],
    organismo: "miteco",
    organismo_label: "MITECO / DGT",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 184/2022, Art. 12",
    cuando_se_necesita: "Solo en puntos de recarga de acceso público",
    hay_formulario_oficial: true,
    url_organismo: "https://puntorecarga.es",
  },
  {
    id: "comunicacion_comunidad_irve",
    nombre: "Comunicación a Comunidad de Propietarios (IRVE en edificio)",
    descripcion: "Documento informativo previo a la instalación de punto de recarga en plaza privada de garaje comunitario. No requiere aprobación de la junta.",
    tipos_instalacion: ["infraestructura_recarga"],
    organismo: "comunidad_propietarios",
    organismo_label: "Comunidad de Propietarios",
    ccaa_aplicacion: "estatal",
    base_legal: "Ley 49/1960 LPH + RD-ley 29/2021",
    cuando_se_necesita: "Instalación en plaza privada de edificio comunitario",
    hay_formulario_oficial: false,
    notas: "Plazo: comunicar 30 días antes del inicio de las obras. No requiere aprobación — solo comunicación.",
  },
  {
    id: "mtd_rite",
    nombre: "MTD — Memoria Técnica de Diseño Térmica (5–70 kW)",
    descripcion: "Memoria técnica simplificada para instalaciones térmicas (aerotermia, ACS) de potencia media.",
    tipos_instalacion: ["climatizacion_aerotermia", "acs_agua_caliente"],
    organismo: "ccaa_industria",
    organismo_label: "Consejería de Industria de la CCAA",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 1027/2007 RITE",
    cuando_se_necesita: "Instalaciones térmicas de 5 kW a 70 kW de potencia",
    hay_formulario_oficial: false,
    notas: "Cada CCAA tiene su propio modelo de MTD simplificada. El borrador generado por PermitFlow es genérico (RITE); revísalo contra el modelo autonómico correspondiente antes de presentarlo.",
    tipo_generable: "mtd",
  },
  {
    id: "proyecto_tecnico_rite",
    nombre: "Proyecto Técnico Térmico (> 70 kW)",
    descripcion: "Proyecto técnico visado para instalaciones térmicas de gran potencia.",
    tipos_instalacion: ["climatizacion_aerotermia", "acs_agua_caliente"],
    organismo: "ccaa_industria",
    organismo_label: "Consejería de Industria de la CCAA",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 1027/2007 RITE, Art. 15",
    cuando_se_necesita: "Instalaciones térmicas de más de 70 kW de potencia",
    hay_formulario_oficial: false,
    notas: "Requiere firma de ingeniero industrial y visado del colegio profesional.",
  },
  {
    id: "cit",
    nombre: "CIT — Certificado de Instalación Térmica",
    descripcion: "Certificado emitido por el instalador al finalizar la instalación térmica, acreditando que cumple el RITE. Obligatorio para el registro ante Industria de la CCAA.",
    tipos_instalacion: ["climatizacion_aerotermia", "acs_agua_caliente"],
    organismo: "ccaa_industria",
    organismo_label: "Consejería de Industria de la CCAA",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 1027/2007 RITE, Art. 27",
    cuando_se_necesita: "Siempre al terminar cualquier instalación térmica",
    hay_formulario_oficial: false,
    notas: "Emitido por instalador térmico autorizado.",
  },
  {
    id: "irg3",
    nombre: "IRG-3 — Certificado de Instalación de Gas",
    descripcion: "El \"Boletín de Gas\". Obligatorio para el alta de suministro en instalaciones nuevas, modificaciones y reformas (como cambio de caldera). También requerido en reactivaciones tras baja prolongada.",
    tipos_instalacion: ["gas_baja_presion"],
    organismo: "empresa_autorizada",
    organismo_label: "Empresa / Instalador de Gas Autorizado",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 919/2006 + RD 984/2015",
    cuando_se_necesita: "Alta nueva, modification, reforma (cambio de caldera) o reactivación del suministro",
    hay_formulario_oficial: false,
    notas: "Impreso oficial normalizado. Solo puede emitirlo una empresa/instalador de gas autorizado.",
  },
  {
    id: "irg4",
    nombre: "IRG-4 — Certificado de Revisión Periódica de Gas",
    descripcion: "Certificado emitido tras la inspección periódica obligatoria de la instalación de gas. Acredita que la instalación existente sigue siendo segura.",
    tipos_instalacion: ["gas_baja_presion"],
    organismo: "empresa_autorizada",
    organismo_label: "Empresa / Instalador de Gas Autorizado",
    ccaa_aplicacion: "estatal",
    base_legal: "RD 919/2006, periodicidad cada 5 años",
    cuando_se_necesita: "Inspección periódica obligatoria cada 5 años",
    hay_formulario_oficial: false,
    notas: "Emitido exclusivamente por empresa/instalador de gas autorizado.",
  },
  {
    id: "declaracion_responsable",
    nombre: "Declaración Responsable Urbanística",
    descripcion: "Permite iniciar las obras de forma inmediata al presentarla, sin esperar resolución previa del ayuntamiento. Es el estándar actual para instalaciones FV e IRVE.",
    tipos_instalacion: ["fotovoltaica_autoconsumo", "infraestructura_recarga"],
    organismo: "ayuntamiento",
    organismo_label: "Ayuntamiento",
    ccaa_aplicacion: "estatal",
    base_legal: "Ley 39/2015 + legislación urbanística de cada CCAA",
    cuando_se_necesita: "Antes del inicio de las obras en la mayoría de instalaciones FV e IRVE",
    hay_formulario_oficial: false,
    notas: "Cada municipio tiene su propio modelo. Inicio de obras inmediato. La Licencia de Obras solo se requiere en edificios protegidos o BIC.",
  },
];

export const ORGANISMOS_LABELS: Record<Organismo, string> = {
  distribuidora: "Distribuidora",
  ccaa_industria: "CCAA (Industria)",
  miteco: "MITECO",
  ayuntamiento: "Ayuntamiento",
  comunidad_propietarios: "Comunidad de Propietarios",
  empresa_autorizada: "Empresa Autorizada",
  idae: "IDAE",
};

export const TIPOS_INSTALACION_LABELS: Record<TipoInstalacion, string> = {
  fotovoltaica_autoconsumo: "Fotovoltaica",
  infraestructura_recarga: "IRVE",
  climatizacion_aerotermia: "Aerotermia",
  acs_agua_caliente: "ACS",
  gas_baja_presion: "Gas",
};
