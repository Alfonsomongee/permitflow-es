import { LegalReference } from "@/lib/legal/types";
import { Card, CardContent } from "@/components/ui/card";
import { LegalStatusBadge } from "./LegalStatusBadge";
import { BookOpen, ExternalLink, Globe, Landmark, MapPin } from "lucide-react";

interface LegalReferenceCardProps {
  reference: LegalReference;
}

export function LegalReferenceCard({ reference }: LegalReferenceCardProps) {
  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'european': return <Globe className="w-4 h-4" />;
      case 'state': return <Landmark className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'european': return 'Normativa Europea';
      case 'state': return 'Normativa Estatal';
      case 'autonomous_community': return 'Normativa Autonómica';
      case 'municipality': return 'Ordenanza Municipal';
      default: return 'Normativa';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {getScopeIcon(reference.scope)}
              <span>{getScopeLabel(reference.scope)}</span>
            </div>
            
            <h4 className="font-semibold text-sm leading-tight flex items-start gap-2">
              <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              {reference.title}
            </h4>
            
            {reference.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {reference.description}
              </p>
            )}
            
            {reference.url && reference.status === 'verified' && (
              <a 
                href={reference.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-primary hover:underline mt-2"
              >
                Ver texto oficial (BOE/DOA) <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <LegalStatusBadge status={reference.status} />
            {reference.lastVerifiedAt && (
              <span className="text-[10px] text-muted-foreground">
                Última revisión: {new Date(reference.lastVerifiedAt).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
