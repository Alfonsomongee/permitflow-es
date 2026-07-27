import { Badge } from "@/components/ui/badge";
import { VerificationStatus } from "@/lib/legal/types";
import { CheckCircle2, AlertTriangle, Archive, XCircle } from "lucide-react";

interface LegalStatusBadgeProps {
  status: VerificationStatus;
  className?: string;
}

export function LegalStatusBadge({ status, className }: LegalStatusBadgeProps) {
  switch (status) {
    case 'verified':
      return (
        <Badge variant="outline" className={`bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900 ${className || ''}`}>
          <CheckCircle2 className="w-3 h-3 mr-1" /> Verificado
        </Badge>
      );
    case 'pending_verification':
      return (
        <Badge variant="outline" className={`bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900 ${className || ''}`}>
          <AlertTriangle className="w-3 h-3 mr-1" /> Pendiente de Verificación
        </Badge>
      );
    case 'obsolete':
      return (
        <Badge variant="outline" className={`bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 ${className || ''}`}>
          <Archive className="w-3 h-3 mr-1" /> Obsoleto / Cerrado
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className={`bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900 ${className || ''}`}>
          <XCircle className="w-3 h-3 mr-1" /> Error Legal
        </Badge>
      );
  }
}
