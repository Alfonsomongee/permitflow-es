import { Incentive } from "@/lib/legal/types";
import { Card, CardContent } from "@/components/ui/card";
import { LegalStatusBadge } from "./LegalStatusBadge";
import { Banknote, AlertCircle } from "lucide-react";

interface IncentiveCardProps {
  incentive: Incentive;
}

export function IncentiveCard({ incentive }: IncentiveCardProps) {
  const getAmountString = () => {
    if (incentive.amountType === 'percentage') {
      return `Hasta ${incentive.percentageMax}%`;
    }
    if (incentive.amountType === 'fixed' && incentive.maxAmountEur) {
      return `${incentive.maxAmountEur.toLocaleString('es-ES')} €`;
    }
    return 'Variable';
  };

  return (
    <Card className={`overflow-hidden ${!incentive.eligibleForCalculation ? 'opacity-80 bg-muted/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                {incentive.title}
              </h4>
              <LegalStatusBadge status={incentive.status} />
            </div>
            
            <p className="text-sm text-muted-foreground">
              {incentive.description}
            </p>
            
            {!incentive.eligibleForCalculation && incentive.status !== 'obsolete' && (
              <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-2 rounded mt-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>Este incentivo no participa en las simulaciones de rentabilidad por no contar con una base legal verificada actualmente.</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col justify-center items-end shrink-0 sm:border-l sm:pl-4 mt-2 sm:mt-0">
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Cuantía
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-500">
              {getAmountString()}
            </span>
            {incentive.maxAmountEur && incentive.amountType === 'percentage' && (
              <span className="text-xs text-muted-foreground mt-1">
                Límite: {incentive.maxAmountEur.toLocaleString('es-ES')} €
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
