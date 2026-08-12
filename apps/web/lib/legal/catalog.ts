import { LegalReference, Incentive } from './types';

import { allReferences } from '../../content/legal/references';
import { allIncentives } from '../../content/legal/incentives';

// Antes este fichero también exportaba fundingCallsCatalog (un Map que nunca
// se llegó a rellenar -- no existe ningún registerFundingCall real en el
// código, solo la función que lo permitiría) y register*/get* para las tres
// entidades, pero solo legalReferencesCatalog e incentivesCatalog se leen
// realmente (desde lib/legal/selectors.ts). El resto era API muerta: nunca
// invocada desde ningún sitio del repo (auditoría fase 2, 2026-08-12, P-20).
export const legalReferencesCatalog: Map<string, LegalReference> = new Map(
  allReferences.map(r => [r.id, r])
);
export const incentivesCatalog: Map<string, Incentive> = new Map(
  allIncentives.map(i => [i.id, i])
);
