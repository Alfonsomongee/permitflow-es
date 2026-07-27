'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileWarning, ArrowRight, ArrowLeft, Loader2, Download } from 'lucide-react';
import { useSimulatorStore } from '@/store/use-simulator-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { InformeInteractivo } from './informe-interactivo';

const inmuebleSchema = z.object({
  tipoInmueble: z.enum(['vivienda_unifamiliar', 'comunidad_vecinos', 'empresa'], {
    message: 'Selecciona un tipo de inmueble',
  }),
  codigoPostal: z.string().regex(/^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/, 'Código postal inválido'),
});

const presupuestoSchema = z.object({
  presupuesto: z.number({
    required_error: 'El presupuesto es requerido',
    invalid_type_error: 'Debe ser un número',
  }).min(1000, 'El presupuesto mínimo es 1000€').max(100000, 'El presupuesto máximo es 100000€'),
});

export function SimulatorWizard() {
  const { step, setStep, setInmuebleData, setPresupuesto, setFacturaFile, setInforme, informe, presupuesto: globalPresupuesto, reset } = useSimulatorStore();
  const [isSimulating, setIsSimulating] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const inmuebleForm = useForm<z.infer<typeof inmuebleSchema>>({
    resolver: zodResolver(inmuebleSchema),
    defaultValues: { tipoInmueble: 'vivienda_unifamiliar', codigoPostal: '' },
  });

  const presupuestoForm = useForm<z.infer<typeof presupuestoSchema>>({
    resolver: zodResolver(presupuestoSchema),
    defaultValues: { presupuesto: globalPresupuesto },
  });

  const onInmuebleSubmit = (data: z.infer<typeof inmuebleSchema>) => {
    setInmuebleData(data.tipoInmueble, data.codigoPostal);
    setStep('presupuesto');
  };

  const onPresupuestoSubmit = (data: z.infer<typeof presupuestoSchema>) => {
    setPresupuesto(data.presupuesto);
    setStep('factura');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'image/jpeg' || file.type === 'image/png') {
      setFileError('error_image');
      setFacturaFile(null);
      e.target.value = '';
      return;
    }

    if (file.type !== 'application/pdf') {
      setFileError('Solo se admiten archivos PDF.');
      setFacturaFile(null);
      e.target.value = '';
      return;
    }

    setFileError(null);
    setFacturaFile(file);
  };

  const simulate = async () => {
    setIsSimulating(true);
    // Simulating API call to AI
    setTimeout(() => {
      setInforme({
        supuestos_utilizados: [
          { parametro: "Horas de sol anuales", valor_asumido: 2800, razon: "Basado en el código postal (estimación regional)" },
          { parametro: "Consumo medio", valor_asumido: "450 kWh/mes", razon: "Extrapolado de la factura aportada" }
        ],
        incentivos_fiscales: [
          {
            nombre: "Deducción IRPF (Hasta 40%)",
            descripcion: "Deducción autonómica por mejora de eficiencia energética.",
            ahorro_estimado: 1500,
            nivel_verificacion: "generica_pendiente_url"
          },
          {
            nombre: "Bonificación IBI",
            descripcion: "Bonificación del 50% durante 3 años (Depende del Ayuntamiento).",
            ahorro_estimado: 600,
            nivel_verificacion: "estimada_datos"
          }
        ],
        escenarios: [
          { nombre: "Instalación Básica", coste_inicial: 5000, ahorro_anual: 800, tiempo_retorno_anios: 6.2 },
          { nombre: "Instalación con Batería", coste_inicial: 8000, ahorro_anual: 1200, tiempo_retorno_anios: 6.6 }
        ],
        recomendacion_final: "Tu vivienda tiene un excelente potencial solar. Te recomendamos una instalación básica para maximizar el ROI a corto plazo."
      });
      setIsSimulating(false);
      setStep('resultados');
    }, 2500);
  };

  const progressValue = step === 'inmueble' ? 33 : step === 'presupuesto' ? 66 : step === 'factura' ? 100 : 100;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {step !== 'resultados' && (
        <div className="mb-8">
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground font-medium">
            <span className={step === 'inmueble' ? 'text-primary' : ''}>1. Datos del Inmueble</span>
            <span className={step === 'presupuesto' ? 'text-primary' : ''}>2. Presupuesto</span>
            <span className={step === 'factura' ? 'text-primary' : ''}>3. Factura</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'inmueble' && (
          <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle>Datos de tu inmueble</CardTitle>
                <CardDescription>Cuéntanos dónde quieres instalar las placas solares.</CardDescription>
              </CardHeader>
              <form onSubmit={inmuebleForm.handleSubmit(onInmuebleSubmit)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipoInmueble">Tipo de Inmueble</Label>
                    <select
                      id="tipoInmueble"
                      className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...inmuebleForm.register('tipoInmueble')}
                    >
                      <option value="vivienda_unifamiliar">Vivienda Unifamiliar</option>
                      <option value="comunidad_vecinos">Comunidad de Vecinos</option>
                      <option value="empresa">Empresa / Nave Industrial</option>
                    </select>
                    {inmuebleForm.formState.errors.tipoInmueble && (
                      <p className="text-sm text-destructive">{inmuebleForm.formState.errors.tipoInmueble.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigoPostal">Código Postal</Label>
                    <Input id="codigoPostal" placeholder="Ej: 28001" {...inmuebleForm.register('codigoPostal')} />
                    {inmuebleForm.formState.errors.codigoPostal && (
                      <p className="text-sm text-destructive">{inmuebleForm.formState.errors.codigoPostal.message}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit">
                    Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        )}

        {step === 'presupuesto' && (
          <motion.div key="step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle>Tu presupuesto estimado</CardTitle>
                <CardDescription>¿Cuánto tienes pensado invertir aproximadamente?</CardDescription>
              </CardHeader>
              <form onSubmit={presupuestoForm.handleSubmit(onPresupuestoSubmit)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="presupuesto">Presupuesto (€)</Label>
                    <Input id="presupuesto" type="number" {...presupuestoForm.register('presupuesto', { valueAsNumber: true })} />
                    {presupuestoForm.formState.errors.presupuesto && (
                      <p className="text-sm text-destructive">{presupuestoForm.formState.errors.presupuesto.message}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep('inmueble')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                  </Button>
                  <Button type="submit">
                    Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        )}

        {step === 'factura' && (
          <motion.div key="step-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle>Sube tu factura de luz</CardTitle>
                <CardDescription>Necesitamos tu factura para calcular con precisión tu ahorro mensual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
                  <Label htmlFor="factura" className="sr-only">Factura</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                    <input
                      id="factura"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                    />
                    <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Haz clic o arrastra tu factura aquí</p>
                    <p className="text-xs text-muted-foreground mt-1">Preferiblemente en formato PDF</p>
                  </div>
                </div>

                {fileError === 'error_image' && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                    <div className="flex items-start gap-3">
                      <FileWarning className="h-5 w-5 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold">Las fotos no suelen funcionar bien</h4>
                        <p className="text-sm mt-1 opacity-90">
                          Para extraer los datos con precisión, necesitamos el PDF original descargado de tu comercializadora. Las fotos suelen estar borrosas o incompletas.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <a href="https://www.iberdrola.es/clientes" target="_blank" rel="noreferrer" className="inline-flex items-center text-xs bg-background border px-2 py-1 rounded hover:bg-muted text-foreground">
                            <Download className="mr-1 h-3 w-3" /> Área Cliente Iberdrola
                          </a>
                          <a href="https://www.endesaclientes.com" target="_blank" rel="noreferrer" className="inline-flex items-center text-xs bg-background border px-2 py-1 rounded hover:bg-muted text-foreground">
                            <Download className="mr-1 h-3 w-3" /> Área Cliente Endesa
                          </a>
                          <a href="https://areaprivada.naturgy.es" target="_blank" rel="noreferrer" className="inline-flex items-center text-xs bg-background border px-2 py-1 rounded hover:bg-muted text-foreground">
                            <Download className="mr-1 h-3 w-3" /> Área Cliente Naturgy
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {fileError && fileError !== 'error_image' && (
                  <p className="text-sm text-destructive text-center">{fileError}</p>
                )}

                {!fileError && useSimulatorStore.getState().facturaFile && (
                  <p className="text-sm text-green-600 dark:text-green-400 text-center font-medium">
                    Archivo seleccionado: {useSimulatorStore.getState().facturaFile?.name}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('presupuesto')} disabled={isSimulating}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                </Button>
                <Button onClick={simulate} disabled={isSimulating || (!useSimulatorStore.getState().facturaFile && !fileError)}>
                  {isSimulating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...
                    </>
                  ) : (
                    'Calcular Ahorro'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {step === 'resultados' && informe && (
          <motion.div key="step-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <Button variant="ghost" onClick={reset} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a simular
            </Button>
            <InformeInteractivo informe={informe} presupuestoInicial={globalPresupuesto} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
