'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { InformeSimulacionIA } from '@/types/simulador';

interface InformeInteractivoProps {
  informe: InformeSimulacionIA;
  presupuestoInicial: number;
}

export function InformeInteractivo({ informe, presupuestoInicial }: InformeInteractivoProps) {
  const [presupuesto, setPresupuesto] = useState(presupuestoInicial);

  const hasGenericaIncentive = informe.incentivos_fiscales.some(
    (inc) => inc.nivel_verificacion === 'generica_pendiente_url'
  );

  // Calculate adjusted scenarios based on new budget
  // Note: For simplicity, we scale the savings linearly with the budget,
  // but a real simulation would be more complex.
  const chartData = informe.escenarios.map((esc) => {
    const scaleFactor = presupuesto / esc.coste_inicial;
    const adjustedCost = presupuesto;
    const adjustedSavings = esc.ahorro_anual * scaleFactor;
    return {
      name: esc.nombre,
      Coste: adjustedCost,
      'Ahorro a 5 años': adjustedSavings * 5,
      'Ahorro a 10 años': adjustedSavings * 10,
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tu Informe de Ahorro</h2>
        <p className="text-muted-foreground mt-2">{informe.recomendacion_final}</p>
      </div>

      {hasGenericaIncentive && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle>Aviso sobre los ahorros fiscales</AlertTitle>
          <AlertDescription>
            Algunos de los incentivos fiscales mostrados aún no están verificados con una fuente oficial para tu caso específico. Te recomendamos consultar con un asesor.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Comparativa de Escenarios</CardTitle>
            <CardDescription>Visualiza tu ahorro estimado a lo largo del tiempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-8 space-y-4">
              <div className="flex justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Ajustar Presupuesto: {presupuesto.toLocaleString('es-ES')} €
                </label>
              </div>
              <Slider
                value={[presupuesto]}
                min={1000}
                max={20000}
                step={500}
                onValueChange={(vals: number[]) => setPresupuesto(vals[0])}
                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
              />
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                  <Legend />
                  <Bar dataKey="Coste" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ahorro a 5 años" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ahorro a 10 años" fill="hsl(var(--primary) / 0.6)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incentivos y Ayudas</CardTitle>
            <CardDescription>Subvenciones y beneficios fiscales aplicables</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {informe.incentivos_fiscales.map((inc, i) => (
                <li key={i} className="flex items-start gap-3">
                  {inc.nivel_verificacion === 'generica_pendiente_url' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{inc.nombre}</p>
                    <p className="text-xs text-muted-foreground mt-1">{inc.descripcion}</p>
                    <div className="mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      Ahorro estimado: {inc.ahorro_estimado.toLocaleString('es-ES')} €
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supuestos de la IA</CardTitle>
            <CardDescription>Parámetros utilizados para el cálculo</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {informe.supuestos_utilizados.map((sup, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span>{sup.parametro}: <strong>{sup.valor_asumido}</strong></span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {sup.razon}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
