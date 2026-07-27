import { ApplicabilityRule } from './types';

const rulesCatalog: ApplicabilityRule[] = [
  // Reglas para Fotovoltaica
  { technologyId: 'fotovoltaica_autoconsumo', legalReferenceId: 'es-rd-244-2019', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', legalReferenceId: 'es-ley-10-2022', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', legalReferenceId: 'es-rdl-7-2026', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-state-irpf-autoconsumo', conditions: {} },
  { technologyId: 'fotovoltaica_autoconsumo', incentiveId: 'inc-state-irpf-rehab', conditions: {} },
  
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
