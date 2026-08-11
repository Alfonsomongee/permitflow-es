import { AlertTriangle, Building2, Gauge, Info, ListChecks, MapPin, Zap } from "lucide-react";
import {
  type InstalacionParams,
  type PlanTramitacion,
  COMUNIDAD_LABEL,
  TIPO_LABEL,
} from "@/types/plan";
import { contarTramites, textoPlazoTotal } from "@/lib/tramites-conteo";

/**
 * Qué parámetros se muestran en el resumen, por tecnología.
 *
 * El criterio es: si el motor ramifica sobre un dato, el usuario tiene que
 * poder verlo aquí. Antes faltaban justamente los que más deciden el plan
 * —`modalidad_autoconsumo` en fotovoltaica, `combustible` y `presion_bar` en
 * gas, `uso` en IRVE— así que no había forma de auditar por qué había salido
 * ese plan y no otro (auditoría QA 2026-08-11, M-05).
 *
 * `tension` se retira de IRVE: estaba declarado visible pero el formulario de
 * IRVE no recoge ese campo, así que nunca llegaba a pintarse.
 */
const CAMPOS_VISIBLES_POR_TIPO: Record<string, string[]> = {
  fotovoltaica_autoconsumo: [
    "potencia_kw",
    "tension",
    "modalidad_autoconsumo",
    "solicita_ayuda",
  ],
  irve: [
    "potencia_kw",
    "uso",
    "numero_puntos",
    "modo_recarga",
    "ubicacion_irve",
    "acceso_publico",
    "solicita_ayuda",
  ],
  acs: [
    "potencia_kw",
    "uso",
    "solicita_ayuda",
  ],
  climatizacion_aerotermia: [
    "potencia_kw",
    "uso",
    "solicita_ayuda",
  ],
  gas_baja_presion: [
    "potencia_kw",
    "uso",
    "combustible",
    "presion_bar",
    "solicita_ayuda",
  ],
};

/** Etiquetas legibles de los valores que el motor maneja en formato slug. */
const VALOR_LABEL: Record<string, string> = {
  sin_excedentes: "Sin excedentes",
  con_excedentes_sin_compensacion: "Con excedentes, sin compensación",
  con_excedentes_con_compensacion: "Con excedentes, con compensación",
  gas_natural: "Gas natural",
  glp_deposito: "GLP (depósito)",
  glp_envases: "GLP (envases)",
  normal: "Presión normal (< 5 bar)",
  "5+": "Alta presión (≥ 5 bar)",
  residencial: "Residencial",
  terciario: "Terciario / comercial",
  industrial: "Industrial",
};

function etiquetaValor(valor: string): string {
  return VALOR_LABEL[valor] ?? valor.replace(/_/g, " ");
}

interface ResumenPanelProps {
  params: InstalacionParams;
  plan: PlanTramitacion;
}

function ParamRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof MapPin;
  label: string;
  value?: string | number | boolean | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);

  // Etiqueta y valor apilados verticalmente en vez de en fila (etiqueta
  // izquierda / valor a la derecha truncado): con textos largos como "tipo
  // de instalación" en una columna lateral de ancho fijo, la fila obligaba a
  // truncar valores importantes. Apilado, el valor siempre se ve completo.
  return (
    <div className="min-w-0">
      <span className="flex items-center gap-1.5 text-xs text-text-secondary">
        {Icon && <Icon size={12} className="flex-shrink-0" aria-hidden />}
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-medium leading-snug text-text-primary">{display}</span>
    </div>
  );
}

export function ResumenPanel({ params, plan }: ResumenPanelProps) {
  const organismos = new Set(plan.tramites.map((tramite) => tramite.organismo)).size;
  const visibles = CAMPOS_VISIBLES_POR_TIPO[params.tipo_instalacion] || [];
  const isVisible = (key: string) => visibles.includes(key);

  // La advertencia de "tiempo orientativo" (siempre presente, ver
  // clasificador.py) no es del mismo nivel que un aviso de normativa sin
  // verificar o de reglas con error: mostrarla con el mismo estilo naranja
  // que las demás le daba un peso visual que no le corresponde. Se separa
  // para mostrarla como nota discreta junto a "días estimados", y el resto
  // (sí relevantes, sí requieren atención) conserva el aviso completo.
  const advertenciaOrientativa = plan.advertencias.find((a) => a.includes("orientativo"));
  const otrasAdvertencias = plan.advertencias.filter((a) => a !== advertenciaOrientativa);

  // Criterio compartido con la línea temporal y el contador de progreso; antes
  // cada componente contaba a su manera (auditoría QA 2026-08-11, M-03).
  const { accionables, oficio } = contarTramites(plan.tramites);
  const plazo = textoPlazoTotal(plan.tiempo_total_estimado_dias);

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          <Zap size={12} aria-hidden />
          Instalación
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <ParamRow icon={Building2} label="Tipo" value={TIPO_LABEL[params.tipo_instalacion] ?? params.tipo_instalacion} />
          <ParamRow icon={MapPin} label="CC. AA." value={COMUNIDAD_LABEL[params.comunidad] ?? params.comunidad} />
          {isVisible("potencia_kw") && <ParamRow icon={Gauge} label="Potencia" value={`${params.potencia_kw} kW`} />}
          {isVisible("tension") && params.tension && <ParamRow label="Tensión" value={params.tension} />}
          {isVisible("uso") && params.uso && <ParamRow label="Uso" value={etiquetaValor(params.uso)} />}
          {isVisible("modalidad_autoconsumo") && params.modalidad_autoconsumo && (
            <ParamRow label="Modalidad de autoconsumo" value={etiquetaValor(params.modalidad_autoconsumo)} />
          )}
          {isVisible("combustible") && params.combustible && (
            <ParamRow label="Combustible" value={etiquetaValor(params.combustible)} />
          )}
          {isVisible("presion_bar") && params.presion_bar && (
            <ParamRow label="Presión de la red" value={etiquetaValor(params.presion_bar)} />
          )}
          {isVisible("numero_puntos") && params.numero_puntos && <ParamRow label="Puntos de recarga" value={params.numero_puntos} />}
          {isVisible("modo_recarga") && params.modo_recarga && <ParamRow label="Modo de recarga" value={`Modo ${params.modo_recarga}`} />}
          {isVisible("ubicacion_irve") && params.ubicacion_irve && <ParamRow label="Ubicación" value={etiquetaValor(params.ubicacion_irve)} />}
          {isVisible("acceso_publico") && params.acceso_publico !== undefined && (
            <ParamRow label="Acceso" value={params.acceso_publico ? "Público (TECI)" : "Privado (PUES)"} />
          )}
          {isVisible("solicita_ayuda") && params.solicita_ayuda && <ParamRow label="Solicita ayuda" value="Sí (MOVES/NextGen)" />}
        </div>
      </div>

      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-light to-surface p-5 shadow-card">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-dark">
          <ListChecks size={12} aria-hidden />
          Resumen del plan
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface/80 p-3 shadow-xs">
            <p className="text-2xl font-semibold tracking-tight text-text-primary">{accionables.length}</p>
            <p className="text-[11px] text-text-secondary">
              {accionables.length === 1 ? "trámite a realizar" : "trámites a realizar"}
            </p>
          </div>
          <div className="rounded-xl bg-surface/80 p-3 shadow-xs">
            <p className="text-2xl font-semibold tracking-tight text-text-primary">{plazo.valor}</p>
            <p className="text-[11px] text-text-secondary">{plazo.etiqueta}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          Repartidos entre <span className="font-medium text-text-primary">{organismos}</span> organismos distintos.
          {oficio.length > 0 && (
            <>
              {" "}Además hay{" "}
              <span className="font-medium text-text-primary">{oficio.length}</span>{" "}
              {oficio.length === 1
                ? "actuación que tramita la Administración de oficio"
                : "actuaciones que tramita la Administración de oficio"}
              : no tienes que hacer nada, pero ocupan tiempo en el calendario.
            </>
          )}
        </p>
        {advertenciaOrientativa && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-text-secondary/80">
            <Info size={11} className="mt-0.5 flex-shrink-0" aria-hidden />
            {advertenciaOrientativa}
          </p>
        )}
      </div>

      {otrasAdvertencias.length > 0 && (
        <div className="space-y-2">
          {otrasAdvertencias.map((advertencia, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-light px-4 py-3 text-xs leading-relaxed text-warning-dark"
            >
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
              {advertencia}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
