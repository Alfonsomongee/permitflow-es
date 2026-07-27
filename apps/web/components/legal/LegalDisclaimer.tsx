import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface LegalDisclaimerProps {
  className?: string;
}

export function LegalDisclaimer({ className }: LegalDisclaimerProps) {
  return (
    <Alert className={`border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200 ${className || ''}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertTitle>Aviso Legal Importante</AlertTitle>
      <AlertDescription className="text-xs mt-1">
        La información sobre normativas e incentivos mostrada en esta plataforma se proporciona con fines meramente orientativos y no constituye asesoramiento legal o fiscal. Los incentivos marcados como &quot;Pendiente de Verificación&quot; carecen actualmente de confirmación oficial en el boletín correspondiente y no deben utilizarse para proyecciones de rentabilidad sin consultar con un profesional cualificado.
      </AlertDescription>
    </Alert>
  );
}
