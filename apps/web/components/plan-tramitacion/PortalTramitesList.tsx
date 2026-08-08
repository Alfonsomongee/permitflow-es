"use client";

import { useState } from "react";
import { TramiteCard } from "./TramiteCard";
import { DocumentoUploadControl, type DocumentoSubidoResumen } from "./DocumentoUploadControl";
import type { Tramite, TramitesEstadoMap } from "@/types/plan";

interface PortalTramitesListProps {
  tramites: Tramite[];
  estados: TramitesEstadoMap;
  comunidad: string;
  token: string;
  subidosIniciales: DocumentoSubidoResumen[];
}

/**
 * Envuelve TramiteCard para el portal de cliente público: añade el control
 * de subida de documentos por debajo de cada documento requerido, vía el
 * prop renderDocumentoExtra de TramiteCard (que no toca nada del dashboard).
 * Vive como client component aparte porque necesita estado (qué se ha
 * subido ya) que la página del portal, un server component, no puede tener.
 */
export function PortalTramitesList({
  tramites,
  estados,
  comunidad,
  token,
  subidosIniciales,
}: PortalTramitesListProps) {
  const [subidos, setSubidos] = useState<DocumentoSubidoResumen[]>(subidosIniciales);

  return (
    <div className="space-y-3">
      {tramites.map((tramite) => (
        <TramiteCard
          key={tramite.orden}
          tramite={tramite}
          estadoInfo={estados[String(tramite.orden)]}
          comunidad={comunidad}
          renderDocumentoExtra={(doc) => (
            <DocumentoUploadControl
              token={token}
              tramiteOrden={tramite.orden}
              documentoId={doc.id}
              subidos={subidos.filter(
                (s) => s.tramite_orden === tramite.orden && s.documento_id === doc.id
              )}
              onSubido={(nuevo) => setSubidos((prev) => [nuevo, ...prev])}
            />
          )}
        />
      ))}
    </div>
  );
}
