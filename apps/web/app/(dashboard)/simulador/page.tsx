import { SimulatorWizard } from '@/components/simulador/simulator-wizard';

export const metadata = {
  title: 'Simulador de Ahorro Solar | PermitFlow',
  description: 'Calcula tu ahorro instalando placas solares con nuestra IA.',
};

export default function SimuladorPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:py-10 md:px-8">
      <div className="max-w-3xl mx-auto text-center mb-6 md:mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Simulador de Ahorro Solar IA</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Descubre cuánto puedes ahorrar en tu factura de luz con una instalación de autoconsumo, con una estimación de incentivos fiscales disponibles en tu zona.
        </p>
      </div>
      
      <SimulatorWizard />
    </div>
  );
}
