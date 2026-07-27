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

// Las deducciones autonómicas actualmente mostradas en incentivos_ccaa.ts se cargarán aquí
// con status "pending_verification" hasta obtener fuente_url.
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
  }
  // Se añadirían el resto de CCAA progresivamente.
];

export const allIncentives = [...stateIncentives, ...regionalIncentives];
