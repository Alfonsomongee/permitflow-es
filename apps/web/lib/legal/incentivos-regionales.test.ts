import { describe, expect, it } from 'vitest';

import { slugToIne } from './utils';
import { getApplicableAllIncentives } from './selectors';

// Regresión para P-12 (plan de acción consolidado 2026-08-12): antes de este
// fix, BloqueFiscal.tsx llamaba a slugToIne(result.ubicacion.comunidad) con
// el slug REAL de la app (p.ej. "baleares", no "illes_balears") y siempre
// obtenía undefined, así que ningún incentivo autonómico -- ni siquiera el
// único que ya existía (Illes Balears) -- llegaba a mostrarse nunca por
// geografía. Además applicability.ts no tenía ninguna regla para incentivos
// autonómicos, así que aunque el slug hubiera coincidido, isApplicable()
// los habría descartado igualmente. Este test cubre el camino completo:
// slug real -> código INE -> incentivo aplicable.

describe('slugToIne', () => {
  it('resuelve los slugs reales que usa el resto de la app (no los nombres en catalán/euskera/gallego)', () => {
    expect(slugToIne('baleares')).toBe('04');
    expect(slugToIne('cataluna')).toBe('09');
    expect(slugToIne('comunidad_valenciana')).toBe('10');
    expect(slugToIne('murcia')).toBe('14');
    expect(slugToIne('castilla_leon')).toBe('07');
  });

  it('sigue resolviendo también los slugs alternativos preexistentes', () => {
    expect(slugToIne('illes_balears')).toBe('04');
    expect(slugToIne('catalunya')).toBe('09');
    expect(slugToIne('comunitat_valenciana')).toBe('10');
    expect(slugToIne('region_de_murcia')).toBe('14');
    expect(slugToIne('castilla_y_leon')).toBe('07');
  });

  it('devuelve undefined para un slug desconocido', () => {
    expect(slugToIne('no_existe')).toBeUndefined();
  });
});

describe('getApplicableAllIncentives — incentivos autonómicos de fotovoltaica', () => {
  it('muestra el incentivo de Baleares (el único que ya existía antes de P-12)', () => {
    const context = { state: 'ES', autonomousCommunityId: slugToIne('baleares') } as const;
    const incentivos = getApplicableAllIncentives('fotovoltaica_autoconsumo', context);
    expect(incentivos.some(i => i.id === 'inc-balears-irpf')).toBe(true);
  });

  it('muestra los 9 incentivos autonómicos añadidos en P-12, uno por comunidad', () => {
    const casos: Array<[string, string]> = [
      ['canarias', 'inc-canarias-irpf'],
      ['cantabria', 'inc-cantabria-irpf'],
      ['castilla_leon', 'inc-castilla-y-leon-irpf'],
      ['castilla_la_mancha', 'inc-castilla-la-mancha-irpf'],
      ['comunidad_valenciana', 'inc-comunitat-valenciana-irpf'],
      ['galicia', 'inc-galicia-irpf'],
      ['murcia', 'inc-murcia-irpf'],
      ['navarra', 'inc-navarra-irpf'],
      ['pais_vasco', 'inc-pais-vasco-irpf'],
    ];

    for (const [slug, incentiveId] of casos) {
      const context = { state: 'ES', autonomousCommunityId: slugToIne(slug) } as const;
      const incentivos = getApplicableAllIncentives('fotovoltaica_autoconsumo', context);
      expect(incentivos.some(i => i.id === incentiveId), `esperaba ${incentiveId} para ${slug}`).toBe(true);
    }
  });

  it('no muestra ningún incentivo autonómico para una comunidad sin deducción propia (Madrid)', () => {
    const context = { state: 'ES', autonomousCommunityId: slugToIne('madrid') } as const;
    const incentivos = getApplicableAllIncentives('fotovoltaica_autoconsumo', context);
    expect(incentivos.every(i => i.scope !== 'autonomous_community')).toBe(true);
  });
});
