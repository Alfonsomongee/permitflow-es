'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LegalDisclaimer } from '@/components/legal/LegalDisclaimer';
import type { InformeSimulacionIA } from '@/types/simulador';

interface InformeInteractivoProps {
  informe: InformeSimulacionIA;
}

export function InformeInteractivo({ informe }: InformeInteractivoProps) {
  const hasPendingIncentive = informe.incentivos_fiscales.some(
    (inc) => inc.nivel_verificacion === 'pending_verification'
  );

  const chartData = informe.escenarios.map((escenario) => ({
    name: escenario.nombre,
    "Coste inicial": escenario.coste_inicial,
    "Ahorro anual": escenario.ahorro_anual,
    "Ahorro a 5 años": escenario.ahorro_5_anios,
    "Ahorro a 10 años": escenario.ahorro_10_anios,
  }));

  // Comparativa de la factura real (no solo el ahorro como cifra aislada):
  // solo tiene sentido si el backend ya manda factura_actual_anual -- lo
  // añadió calculo_financiero.py, pero puede faltar en informes en caché
  // generados antes de ese cambio.
  const facturaData = informe.escenarios
    .filter((e) => e.factura_actual_anual !== undefined)
    .map((escenario) => ({
      name: escenario.nombre,
      "Factura actual (sin instalación)": escenario.factura_actual_anual ?? 0,
      "Factura con instalación": escenario.factura_con_instalacion_anual ?? 0,
    }));

  // Evolución acumulada a 10 años del escenario principal: cuánto habrías
  // pagado en total sin instalación vs. con instalación (inversión inicial +
  // facturas reducidas), para visualizar dónde se cruzan las dos líneas
  // (el punto de retorno de la inversión).
  const escenarioPrincipal = informe.escenarios[0];
  const evolucionData =
    escenarioPrincipal && escenarioPrincipal.factura_actual_anual !== undefined
      ? Array.from({ length: 11 }, (_, anio) => ({
          anio: `Año ${anio}`,
          "Sin instalación": (escenarioPrincipal.factura_actual_anual ?? 0) * anio,
          "Con instalación":
            escenarioPrincipal.coste_inicial +
            (escenarioPrincipal.factura_con_instalacion_anual ?? 0) * anio,
        }))
      : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tu Informe de Ahorro</h2>
        <p className="text-muted-foreground mt-2">{informe.recomendacion_final}</p>
      </div>

      {hasPendingIncentive && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle>Proyección orientativa, pendiente de depuración fiscal</AlertTitle>
          <AlertDescription>
            Las proyecciones de ahorro a largo plazo contienen incentivos fiscales cuya aplicabilidad o importes actuales carecen de fuente legal confirmada. No deben considerarse como ahorro calculable ni definitivo sin consultar a su asesor.
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
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                  <Legend />
                  <Bar dataKey="Coste inicial" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ahorro anual" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ahorro a 5 años" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ahorro a 10 años" fill="hsl(var(--primary) / 0.6)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {facturaData.length > 0 && (
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Tu factura: antes y después</CardTitle>
              <CardDescription>
                Coste anual de la electricidad comprada a la red, con y sin la instalación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={facturaData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                    />
                    <Legend />
                    <Bar dataKey="Factura actual (sin instalación)" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Factura con instalación" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {evolucionData.length > 0 && (
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Coste acumulado a 10 años</CardTitle>
              <CardDescription>
                Punto en el que la inversión inicial se compensa con el ahorro en factura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="anio" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Sin instalación" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Con instalación" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Incentivos y Ayudas</CardTitle>
            <CardDescription>Subvenciones y beneficios fiscales aplicables</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {informe.incentivos_fiscales.map((inc, i) => (
                <li key={i} className="flex items-start gap-3">
                  {inc.nivel_verificacion === 'pending_verification' ? (
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
            <CardTitle>Supuestos del cálculo</CardTitle>
            <CardDescription>Parámetros y fuentes utilizados para el cálculo financiero</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion className="w-full">
              {informe.supuestos_utilizados.map((sup, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span>{sup.parametro}: <strong>{sup.valor_asumido}</strong></span>
                      {sup.fuente_dato && (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            sup.fuente_dato === 'leido'
                              ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400'
                              : 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400'
                          }`}
                        >
                          {sup.fuente_dato === 'leido' ? 'Leído de tu factura' : 'Estimado'}
                        </span>
                      )}
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

      {/* Disclaimer legal incondicional (D-03 auditoría): antes solo aparecía
          si había un incentivo pendiente de verificación, dejando el informe
          financiero sin ningún aviso legal en el caso contrario. */}
      <LegalDisclaimer />
    </div>
  );
}
