import { z } from 'zod';

export const verificationStatusSchema = z.enum(['verified', 'pending_verification', 'obsolete', 'error']);
export const geographicScopeSchema = z.enum(['european', 'state', 'autonomous_community', 'municipality']);

export const locationContextSchema = z.object({
  state: z.literal('ES'),
  autonomousCommunityId: z.string().optional(),
  municipalityId: z.string().optional(),
});

export const legalReferenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  scope: geographicScopeSchema,
  locationContext: locationContextSchema.optional(),
  url: z.string().url().nullable(),
  status: verificationStatusSchema,
  lastVerifiedAt: z.string().datetime().optional(),
}).refine(
  (data) => {
    // Si está verificado, DEBE tener URL
    if (data.status === 'verified') {
      return data.url !== null && data.url.length > 0;
    }
    return true;
  },
  {
    message: "Una referencia 'verified' debe tener obligatoriamente una URL válida a la fuente primaria.",
    path: ["url"],
  }
);

export const incentiveSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  legalReferenceId: z.string().min(1),
  scope: geographicScopeSchema,
  locationContext: locationContextSchema.optional(),
  status: verificationStatusSchema,
  amountType: z.enum(['percentage', 'fixed', 'variable']),
  maxAmountEur: z.number().nonnegative().optional(),
  minAmountEur: z.number().nonnegative().optional(),
  percentageMin: z.number().min(0).max(100).optional(),
  percentageMax: z.number().min(0).max(100).optional(),
  validUntil: z.string().datetime().optional(),
  eligibleForCalculation: z.boolean(),
}).refine(
  (data) => {
    // Si eligibleForCalculation es true, DEBE estar verificado
    if (data.eligibleForCalculation) {
      return data.status === 'verified';
    }
    return true;
  },
  {
    message: "Un incentivo no puede ser 'eligibleForCalculation' si no está 'verified'.",
    path: ["eligibleForCalculation"],
  }
);

export const fundingCallSchema = z.object({
  id: z.string().min(1),
  incentiveId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['open', 'closed', 'pending_publication']),
  budgetAvailable: z.boolean().optional(),
  url: z.string().url().nullable(),
});

export const applicabilityRuleSchema = z.object({
  technologyId: z.string().min(1),
  incentiveId: z.string().optional(),
  legalReferenceId: z.string().optional(),
  conditions: z.record(z.string(), z.any()),
});
