export type VerificationStatus = 'verified' | 'pending_verification' | 'obsolete' | 'error';
export type GeographicScope = 'european' | 'state' | 'autonomous_community' | 'municipality';

export interface LocationContext {
  state: 'ES'; // ISO 3166-1 alpha-2
  autonomousCommunityId?: string; // Código INE (ej: '01' para Andalucía)
  municipalityId?: string; // Código INE municipio
}

export interface LegalReference {
  id: string; // Identificador único (ej: 'es-rd-244-2019')
  title: string; // Título formal de la norma
  description?: string; // Breve explicación de qué regula
  scope: GeographicScope;
  locationContext?: LocationContext;
  url: string | null; // URL a BOE, DOUE, o boletín autonómico
  status: VerificationStatus;
  lastVerifiedAt?: string; // Fecha ISO
}

export interface Incentive {
  id: string;
  title: string;
  description: string;
  legalReferenceId: string; // Referencia obligatoria a LegalReference
  scope: GeographicScope;
  locationContext?: LocationContext;
  status: VerificationStatus;
  amountType: 'percentage' | 'fixed' | 'variable';
  maxAmountEur?: number;
  minAmountEur?: number;
  percentageMin?: number;
  percentageMax?: number;
  validUntil?: string; // Fecha ISO de caducidad de la ayuda
  eligibleForCalculation: boolean; // Si es false, solo se muestra informativamente
}

export interface FundingCall {
  id: string;
  incentiveId: string;
  title: string;
  status: 'open' | 'closed' | 'pending_publication';
  budgetAvailable?: boolean;
  url: string | null;
}

export interface ApplicabilityRule {
  technologyId: string; // ej: 'fotovoltaica'
  incentiveId?: string;
  legalReferenceId?: string;
  conditions: Record<string, unknown>; // Reglas específicas de aplicabilidad
}
