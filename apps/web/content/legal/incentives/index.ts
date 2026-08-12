import { Incentive } from '@/lib/legal/types';

export const stateIncentives: Incentive[] = [
  {
    id: 'inc-state-irpf-rehab',
    title: 'Deducción IRPF por Rehabilitación Energética',
    description: 'Deducciones del 20%, 40% y 60% por obras de rehabilitación en el IRPF.',
    legalReferenceId: 'es-ley-10-2022',
    scope: 'state',
    locationContext: { state: 'ES' },
    status: 'pending_verification', // Faltan comprobaciones en IRPF
    amountType: 'percentage',
    percentageMax: 60,
    maxAmountEur: 15000,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-state-irpf-autoconsumo',
    title: 'Deducción IRPF por instalación de Autoconsumo',
    description: 'Deducción del 10% (individual) y 20% (comunidad).',
    legalReferenceId: 'es-rdl-7-2026',
    scope: 'state',
    locationContext: { state: 'ES' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMax: 20,
    maxAmountEur: 5000,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-state-irpf-irve',
    title: 'Deducción IRPF por instalación de Punto de Recarga',
    description: 'Deducción del 15% por instalación de punto de recarga particular.',
    legalReferenceId: 'es-rdl-7-2026',
    scope: 'state',
    locationContext: { state: 'ES' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMax: 15,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-state-moves-iii',
    title: 'Plan MOVES III',
    description: 'Programa estatal de incentivos ligados a la movilidad eléctrica.',
    legalReferenceId: 'es-rd-266-2021', // Dummy temporal
    scope: 'state',
    locationContext: { state: 'ES' },
    status: 'obsolete', // Cerrado en diciembre 2025
    amountType: 'percentage',
    percentageMax: 80,
    eligibleForCalculation: false, // Histórico, ya no calcula
  }
];

// Deducciones autonómicas cargadas desde content/incentivos_ccaa.ts (informe de
// verificación de segunda mano del 27/07/2026, sin URL comprobable todavía --
// de ahí status "pending_verification" y eligibleForCalculation: false en las
// diez). Antes solo Illes Balears estaba aquí ("se añadirían el resto de CCAA
// progresivamente" decía el comentario que sustituye este) mientras las otras
// 16 CCAA con datos ya escritos vivían en un fichero que nada importaba
// (plan de acción consolidado 2026-08-12, P-12).
//
// Las 8 CCAA con existe:false en incentivos_ccaa.ts (Andalucía, Aragón,
// Asturias, Cataluña, Extremadura, La Rioja, Madrid) y las 2 ciudades
// autónomas (Ceuta, Melilla) no tienen ninguna deducción propia detectada:
// no se crea una entrada para ellas -- mostrar una tarjeta de "0%" sería
// menos honesto que no mostrar nada, que es como se comportaba la página ya
// antes de este cambio.
export const regionalIncentives: Incentive[] = [
  {
    id: 'inc-balears-irpf',
    title: 'Deducción Autonómica IRPF (Illes Balears)',
    description: 'Por inversiones de mejora de sostenibilidad en vivienda habitual.',
    legalReferenceId: 'aut-ref-balears-pending', // Placeholder
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '04' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMax: 50,
    maxAmountEur: 10000,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-canarias-irpf',
    title: 'Deducción Autonómica IRPF (Canarias)',
    description: 'Por obras de rehabilitación energética y reforma de vivienda habitual.',
    legalReferenceId: 'aut-ref-canarias-pending',
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '05' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMin: 12,
    percentageMax: 12,
    maxAmountEur: 7000,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-cantabria-irpf',
    title: 'Deducción Autonómica IRPF (Cantabria)',
    description: 'Por obras de mejora en viviendas. Límite: 1.000 € declaración individual, 1.500 € declaración conjunta.',
    legalReferenceId: 'aut-ref-cantabria-pending',
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '06' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMin: 15,
    percentageMax: 15,
    maxAmountEur: 1500,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-castilla-y-leon-irpf',
    title: 'Deducción Autonómica IRPF (Castilla y León)',
    description: 'Por inversión en instalaciones medioambientales en vivienda habitual.',
    legalReferenceId: 'aut-ref-castilla-y-leon-pending',
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '07' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMin: 15,
    percentageMax: 15,
    maxAmountEur: 20000,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-castilla-la-mancha-irpf',
    title: 'Deducción Autonómica IRPF (Castilla-La Mancha)',
    // Importe no localizado en la fuente (incentivos_ccaa.ts lo marca
    // explícitamente "no mostrar cifras en la UI") -- amountType 'variable'
    // en vez de inventar un porcentaje.
    description: 'Existe deducción autonómica — consultar Hacienda de Castilla-La Mancha para importe exacto.',
    legalReferenceId: 'aut-ref-castilla-la-mancha-pending',
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '08' },
    status: 'pending_verification',
    amountType: 'variable',
    eligibleForCalculation: false,
  },
  {
    id: 'inc-comunitat-valenciana-irpf',
    title: 'Deducción Autonómica IRPF (Comunitat Valenciana)',
    description: '40% vivienda habitual / 20% segunda residencia. Por cantidades invertidas en instalaciones de autoconsumo o generación renovable.',
    legalReferenceId: 'aut-ref-comunitat-valenciana-pending',
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '10' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMin: 20,
    percentageMax: 40,
    maxAmountEur: 8800,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-galicia-irpf',
    title: 'Deducción Autonómica IRPF (Galicia)',
    description: 'Por obras de mejora de eficiencia energética en viviendas.',
    legalReferenceId: 'aut-ref-galicia-pending',
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '12' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMin: 15,
    percentageMax: 15,
    maxAmountEur: 9000,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-murcia-irpf',
    title: 'Deducción Autonómica IRPF (Región de Murcia)',
    description: 'Escalonado por renta: 50%/37,5%/25%. Por inversión en instalación de recursos energéticos renovables.',
    legalReferenceId: 'aut-ref-murcia-pending',
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '14' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMin: 25,
    percentageMax: 50,
    maxAmountEur: 7000,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-navarra-irpf',
    title: 'Deducción Autonómica IRPF (Navarra)',
    description: 'Art. 64 Ley Foral IRPF. Límite: 25% de la base liquidable.',
    legalReferenceId: 'aut-ref-navarra-pending',
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '15' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMin: 15,
    percentageMax: 15,
    eligibleForCalculation: false,
  },
  {
    id: 'inc-pais-vasco-irpf',
    title: 'Deducción Autonómica IRPF (País Vasco)',
    description: 'Art. 90 quater Norma Foral IRPF (Bizkaia). Deducción neta máxima 3.000 €. Verificar equivalentes en Álava/Gipuzkoa.',
    legalReferenceId: 'aut-ref-pais-vasco-pending',
    scope: 'autonomous_community',
    locationContext: { state: 'ES', autonomousCommunityId: '16' },
    status: 'pending_verification',
    amountType: 'percentage',
    percentageMin: 15,
    percentageMax: 15,
    maxAmountEur: 20000,
    eligibleForCalculation: false,
  },
];

export const allIncentives = [...stateIncentives, ...regionalIncentives];
