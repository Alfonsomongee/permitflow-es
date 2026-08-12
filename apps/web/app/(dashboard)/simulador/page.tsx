import { SimulatorWizard } from '@/components/simulador/simulator-wizard';

// Antes: título "...IA" y meta-descripción "con nuestra IA". El cálculo
// (servicios/calculo_financiero.py) es determinista y auditable a propósito
// -- el propio docstring dice que el LLM "nunca decide una cifra de ahorro,
// coste o payback". Vender esto como IA es tanto inexacto como un mal
// negocio: devalúa el único punto del producto que sí usa IA de verdad
// (el pipeline de alertas BOE) (auditoría de coherencia producto/experiencia
// 2026-08-12, y ya recomendado como I-10 en la auditoría integral 2026-08-11).
export const metadata = {
  title: 'Simulador de Ahorro Solar | PermitFlow',
  description: 'Calcula tu ahorro estimado instalando placas solares, con fórmulas deterministas y auditables.',
};

export default function SimuladorPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-3xl mx-auto text-center mb-6 md:mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Simulador de Ahorro Solar</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Descubre cuánto puedes ahorrar en tu factura de luz con una instalación de autoconsumo, con una estimación de incentivos fiscales disponibles en tu zona.
        </p>
      </div>
      
      <SimulatorWizard />
    </div>
  );
}
