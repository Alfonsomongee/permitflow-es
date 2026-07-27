"use client";

import { Euro } from "lucide-react";
import type { FichaTecnologia } from "@/content/tecnologias";
import { getApplicableAllIncentives } from "@/lib/legal/selectors";
import { slugToIne } from "@/lib/legal/utils";
import { LocationContext } from "@/lib/legal/types";
import { IncentiveCard } from "@/components/legal/IncentiveCard";
import { LegalDisclaimer } from "@/components/legal/LegalDisclaimer";

type Props = {
  comunidad: string; // slug de CCAA devuelto por la API
  tecnologiaId: FichaTecnologia["id"];
};

export function BloqueFiscal({ comunidad, tecnologiaId }: Props) {
  const context: LocationContext = {
    state: 'ES',
    autonomousCommunityId: slugToIne(comunidad),
  };

  // Obtenemos todos los incentivos (verificados y no verificados) para presentarlos.
  // Filtramos los que aplican específicamente a esta tecnología y contexto geográfico.
  const allIncentives = getApplicableAllIncentives(tecnologiaId, context);

  const currentIncentives = allIncentives.filter(inc => inc.status !== 'obsolete');
  const historicalIncentives = allIncentives.filter(inc => inc.status === 'obsolete');
  
  if (allIncentives.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Euro size={16} className="text-primary" />
        Incentivos fiscales (Catálogo Legal)
      </h3>

      {currentIncentives.length > 0 && (
        <div className="grid gap-3">
          {currentIncentives.map(inc => (
            <IncentiveCard key={inc.id} incentive={inc} />
          ))}
        </div>
      )}

      {historicalIncentives.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Programas finalizados y referencias históricas
          </h4>
          <div className="grid gap-3 opacity-75">
            {historicalIncentives.map(inc => (
              <IncentiveCard key={inc.id} incentive={inc} />
            ))}
          </div>
        </div>
      )}

      <LegalDisclaimer />
    </div>
  );
}
