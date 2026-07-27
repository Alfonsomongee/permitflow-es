import { Incentive, LegalReference, LocationContext } from './types';
import { incentivesCatalog, legalReferencesCatalog } from './catalog';

import { isApplicable, isReferenceApplicable } from './applicability';

/**
 * Selecciona las referencias legales aplicables a un contexto de ubicación y tecnología.
 */
export function getApplicableLegalReferences(technologyId: string, context: LocationContext): LegalReference[] {
  const allRefs = Array.from(legalReferencesCatalog.values());
  
  return allRefs.filter(ref => {
    // 1. Filtrar por geografía
    const matchesGeo = (() => {
      if (ref.scope === 'european' || ref.scope === 'state') return true;
      if (ref.scope === 'autonomous_community') return ref.locationContext?.autonomousCommunityId === context.autonomousCommunityId;
      if (ref.scope === 'municipality') return ref.locationContext?.municipalityId === context.municipalityId;
      return false;
    })();

    if (!matchesGeo) return false;

    // 2. Filtrar por tecnología
    return isReferenceApplicable(technologyId, ref.id);
  });
}

/**
 * Selecciona las referencias legales aplicables a un contexto de ubicación.
 */
export function selectLegalReferences(context: LocationContext): LegalReference[] {
  const allRefs = Array.from(legalReferencesCatalog.values());
  
  return allRefs.filter(ref => {
    if (ref.scope === 'european' || ref.scope === 'state') return true;
    
    if (ref.scope === 'autonomous_community') {
      return ref.locationContext?.autonomousCommunityId === context.autonomousCommunityId;
    }
    
    if (ref.scope === 'municipality') {
      return ref.locationContext?.municipalityId === context.municipalityId;
    }
    
    return false;
  });
}

/**
 * Filtra los incentivos que aplican a un contexto, tecnología, y que están habilitados.
 */
export function getApplicableCalculableIncentives(technologyId: string, context: LocationContext): Incentive[] {
  const allIncentives = Array.from(incentivesCatalog.values());
  
  return allIncentives.filter(inc => {
    // Debe estar verificado y ser elegible para cálculo
    if (!inc.eligibleForCalculation || inc.status !== 'verified') {
      return false;
    }

    const matchesGeo = (() => {
      if (inc.scope === 'european' || inc.scope === 'state') return true;
      if (inc.scope === 'autonomous_community') return inc.locationContext?.autonomousCommunityId === context.autonomousCommunityId;
      if (inc.scope === 'municipality') return inc.locationContext?.municipalityId === context.municipalityId;
      return false;
    })();

    if (!matchesGeo) return false;

    return isApplicable(technologyId, inc.id);
  });
}

/**
 * Filtra los incentivos que aplican a un contexto y que están habilitados para el cálculo (verificados).
 */
export function selectCalculableIncentives(context: LocationContext): Incentive[] {
  const allIncentives = Array.from(incentivesCatalog.values());
  
  return allIncentives.filter(inc => {
    // Debe estar verificado y ser elegible para cálculo económico puro
    if (!inc.eligibleForCalculation || inc.status !== 'verified') {
      return false;
    }

    if (inc.scope === 'european' || inc.scope === 'state') return true;
    
    if (inc.scope === 'autonomous_community') {
      return inc.locationContext?.autonomousCommunityId === context.autonomousCommunityId;
    }
    
    if (inc.scope === 'municipality') {
      return inc.locationContext?.municipalityId === context.municipalityId;
    }
    
    return false;
  });
}

/**
 * Selecciona TODOS los incentivos (verificados y no verificados) para una tecnología.
 */
export function getApplicableAllIncentives(technologyId: string, context: LocationContext): Incentive[] {
  const allIncentives = Array.from(incentivesCatalog.values());
  
  return allIncentives.filter(inc => {
    const matchesGeo = (() => {
      if (inc.scope === 'european' || inc.scope === 'state') return true;
      if (inc.scope === 'autonomous_community') return inc.locationContext?.autonomousCommunityId === context.autonomousCommunityId;
      if (inc.scope === 'municipality') return inc.locationContext?.municipalityId === context.municipalityId;
      return false;
    })();

    if (!matchesGeo) return false;

    return isApplicable(technologyId, inc.id);
  });
}

/**
 * Selecciona TODOS los incentivos, incluidos los no verificados (para mostrarlos con advertencia).
 */
export function selectAllApplicableIncentives(context: LocationContext): Incentive[] {
  const allIncentives = Array.from(incentivesCatalog.values());
  
  return allIncentives.filter(inc => {
    if (inc.scope === 'european' || inc.scope === 'state') return true;
    
    if (inc.scope === 'autonomous_community') {
      return inc.locationContext?.autonomousCommunityId === context.autonomousCommunityId;
    }
    
    if (inc.scope === 'municipality') {
      return inc.locationContext?.municipalityId === context.municipalityId;
    }
    
    return false;
  });
}
