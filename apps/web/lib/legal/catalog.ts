import { LegalReference, Incentive, FundingCall } from './types';

import { allReferences } from '../../content/legal/references';
import { allIncentives } from '../../content/legal/incentives';

export const legalReferencesCatalog: Map<string, LegalReference> = new Map(
  allReferences.map(r => [r.id, r])
);
export const incentivesCatalog: Map<string, Incentive> = new Map(
  allIncentives.map(i => [i.id, i])
);
export const fundingCallsCatalog: Map<string, FundingCall> = new Map();

/**
 * Registra una referencia legal en el catálogo.
 */
export function registerLegalReference(ref: LegalReference): void {
  legalReferencesCatalog.set(ref.id, ref);
}

/**
 * Registra un incentivo en el catálogo.
 */
export function registerIncentive(inc: Incentive): void {
  incentivesCatalog.set(inc.id, inc);
}

/**
 * Registra una convocatoria de fondos en el catálogo.
 */
export function registerFundingCall(call: FundingCall): void {
  fundingCallsCatalog.set(call.id, call);
}

/**
 * Obtiene una referencia legal por ID.
 */
export function getLegalReference(id: string): LegalReference | undefined {
  return legalReferencesCatalog.get(id);
}

/**
 * Obtiene un incentivo por ID.
 */
export function getIncentive(id: string): Incentive | undefined {
  return incentivesCatalog.get(id);
}

/**
 * Obtiene una convocatoria por ID.
 */
export function getFundingCall(id: string): FundingCall | undefined {
  return fundingCallsCatalog.get(id);
}
