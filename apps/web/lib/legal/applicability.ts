import { ApplicabilityRule } from './types';

const rulesCatalog: ApplicabilityRule[] = [
  // Reglas para Fotovoltaica
  { technologyId: 'fotovoltaica_autoconsumo', legalReferenceId: 'es-rd-244-2019', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', legalReferenceId: 'es-ley-10-2022', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', legalReferenceId: 'es-rdl-7-2026', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-state-irpf-autoconsumo', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-state-irpf-rehab', conditions: {} },

  // Deducciones autonómicas de content/legal/incentives/index.ts::regionalIncentives.
  // Sin regla de aplicabilidad, isApplicable() las descarta siempre y
  // getApplicableAllIncentives() (BloqueFiscal.tsx) nunca las muestra --
  // exactamente lo que le pasaba a la única que ya existía (Illes Balears)
  // antes de este cambio. Todas describen deducciones sobre "instalaciones
  // medioambientales/de energía renovable/autoconsumo" en la fuente
  // (incentivos_ccaa.ts): se vinculan solo a fotovoltaica_autoconsumo, la
  // misma tecnología a la que ya se vinculan sus equivalentes estatales, sin
  // extender la aplicabilidad a otras tecnologías que la fuente no menciona
  // (plan de acción consolidado 2026-08-12, P-12).
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-balears-irpf', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-canarias-irpf', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-cantabria-irpf', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-castilla-y-leon-irpf', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-castilla-la-mancha-irpf', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-comunitat-valenciana-irpf', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-galicia-irpf', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-murcia-irpf', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-navarra-irpf', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-pais-vasco-irpf', conditions: {} },


  // Reglas para IRVE
  { technologyId: 'irve', legalReferenceId: 'es-rd-1053-2014', conditions: {} },
  { technologyId: 'irve', legalReferenceId: 'es-rd-184-2022', conditions: {} },
  { technologyId: 'irve', legalReferenceId: 'es-rd-609-2026', conditions: {} },
  { technologyId: 'irve', incentiveId: 'inc-state-irpf-irve', conditions: {} },
  { technologyId: 'irve', incentiveId: 'inc-state-moves-iii', conditions: {} },
];

export function registerApplicabilityRule(rule: ApplicabilityRule): void {
  rulesCatalog.push(rule);
}

export function isApplicable(technologyId: string, incentiveId: string): boolean {
  return rulesCatalog.some(r => r.technologyId === technologyId && r.incentiveId === incentiveId);
}

export function isReferenceApplicable(technologyId: string, legalReferenceId: string): boolean {
  return rulesCatalog.some(r => r.technologyId === technologyId && r.legalReferenceId === legalReferenceId);
}
