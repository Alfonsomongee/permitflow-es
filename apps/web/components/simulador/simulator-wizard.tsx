'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileWarning, ArrowRight, ArrowLeft, Loader2, Download, AlertCircle, Check } from 'lucide-react';
import { useSimulatorStore } from '@/store/use-simulator-store';
import { capturar } from '@/lib/analytics/posthog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { InformeInteractivo } from './informe-interactivo';
import {
  uploadInvoice,
  uploadInvoiceCsv,
  generateSimulation,
  pollSimulationStatus,
  getSimulationErrorMessage
} from '@/lib/api/simulador';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90_000;
const MAX_PDF_SIZE = 10 * 1024 * 1024;
const MAX_CSV_SIZE = 5 * 1024 * 1024; // mismo límite que servicios/datadis_parser.py

// Tipos de inmueble no residenciales: redirigir a contacto
const TIPO_NO_RESIDENCIAL = new Set(['empresa', 'comunidad_vecinos']);

const PASOS = [
  { id: 'inmueble', label: 'Datos del inmueble' },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'factura', label: 'Factura' },
] as const;

const inmuebleSchema = z.object({
  tipoInmueble: z.enum(['vivienda_unifamiliar', 'comunidad_vecinos', 'empresa'], {
    message: 'Selecciona un tipo de inmueble',
  }),
  codigoPostal: z.string({ message: 'El código postal es requerido' })
    .trim()
    .length(5, { message: 'El código postal debe tener exactamente 5 dígitos' })
    .regex(/^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/, { message: 'Código postal español inválido (ej: 28001)' }),
});

const presupuestoSchema = z.object({
  presupuesto: z.number({
    message: 'El presupuesto debe ser un número válido',
  }).min(1000, 'El presupuesto mínimo es 1.000€').max(30000, 'El presupuesto máximo es 30.000€'),
});

// Estados posibles de la simulación
type SimulacionEstado =
  | 'idle'
  | 'subiendo_factura'
  | 'generando_informe'
  | 'completado'
  | 'error'
  | 'timeout';

export function SimulatorWizard() {
  const {
    step, setStep,
    setInmuebleData, setPresupuesto, setFacturaFile, setInforme,
    informe, presupuesto: globalPresupuesto, reset,
  } = useSimulatorStore();

  // Selectores reactivos (no getState())
  const facturaFile = useSimulatorStore(s => s.facturaFile);
  const tipoInmueble = useSimulatorStore(s => s.tipoInmueble);

  const [simulacionEstado, setSimulacionEstado] = useState<SimulacionEstado>('idle');
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const isSimulating = simulacionEstado === 'subiendo_factura' || simulacionEstado === 'generando_informe';

  const inmuebleForm = useForm<z.infer<typeof inmuebleSchema>>({
    resolver: zodResolver(inmuebleSchema),
    defaultValues: { tipoInmueble: 'vivienda_unifamiliar', codigoPostal: '' },
  });

  const presupuestoForm = useForm<z.infer<typeof presupuestoSchema>>({
    resolver: zodResolver(presupuestoSchema),
    defaultValues: { presupuesto: globalPresupuesto },
  });

  const onInmuebleSubmit = (data: z.infer<typeof inmuebleSchema>) => {
    // Tipos no residenciales: capturar lead, no simular
    if (TIPO_NO_RESIDENCIAL.has(data.tipoInmueble)) {
      window.location.href = '/contacto?tipo=' + data.tipoInmueble;
      return;
    }
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

    const extension = file.name.split('.').pop()?.toLowerCase();

    // Imágenes: aviso educativo con enlaces a áreas de cliente (rama de producto, no error)
    if (file.type.startsWith('image/')) {
      setFileError('error_image');
      setFacturaFile(null);
      e.target.value = '';
      return;
    }

    const esPdf = file.type === 'application/pdf' || extension === 'pdf';
    const esCsv = file.type === 'text/csv' || extension === 'csv';

    if (!esPdf && !esCsv) {
      setFileError('Solo se admiten archivos PDF o el export CSV de consumo de Datadis.');
      setFacturaFile(null);
      e.target.value = '';
      return;
    }

    if (esPdf && file.size > MAX_PDF_SIZE) {
      setFileError('El archivo es demasiado grande (máximo 10 MB).');
      setFacturaFile(null);
      e.target.value = '';
      return;
    }

    if (esCsv && file.size > MAX_CSV_SIZE) {
      setFileError('El archivo es demasiado grande (máximo 5 MB).');
      setFacturaFile(null);
      e.target.value = '';
      return;
    }

    setFileError(null);
    setFacturaFile(file);
  };

  const simulate = async () => {
    if (!facturaFile || isSimulating) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSimulacionEstado('subiendo_factura');
    setErrorMensaje(null);

    try {
      // --- Paso 1: Subir factura (PDF) o export de consumo (Datadis CSV) ---
      const esCsv = facturaFile.name.split('.').pop()?.toLowerCase() === 'csv';
      const factura = esCsv
        ? await uploadInvoiceCsv(facturaFile, controller.signal)
        : await uploadInvoice(facturaFile, controller.signal);

      if (factura.estado !== 'exitoso') {
        throw new Error(
          factura.error
            ? `No pudimos leer el archivo: ${factura.error}`
            : esCsv
              ? 'No pudimos extraer los datos del archivo. Comprueba que has descargado el fichero de tipo "Consumo" desde Datadis.'
              : 'No pudimos extraer los datos de tu factura. Por favor, comprueba que es un PDF descargado desde el área de cliente de tu distribuidora.'
        );
      }

      // --- Paso 2: Generar informe ---
      setSimulacionEstado('generando_informe');

      // Antes se enviaban facturaId/direccion/superficieDisponible/
      // interesadoEnBaterias, campos que GenerarRequest (apps/api/routers/
      // simulador.py) nunca ha aceptado -- analisis_id es obligatorio y sin
      // él el backend devolvía 422 en el 100% de los envíos. Corregido para
      // enviar el contrato real (ver hallazgo "simulador roto", auditoría
      // de mejoras 2026-08-07).
      const { estudio_id, token } = await generateSimulation({
        analisisId: factura.id,
        tipoInmueble,
      }, controller.signal);

      // --- Paso 3: Polling hasta completado, error o timeout ---
      const inicio = Date.now();

      while (true) {
        if (Date.now() - inicio > POLL_TIMEOUT_MS) {
          setSimulacionEstado('timeout');
          setErrorMensaje('La generación del informe está tardando más de lo esperado. Inténtalo de nuevo en unos minutos.');
          return;
        }

        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, POLL_INTERVAL_MS);
          controller.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true });
        });

        const estudio = await pollSimulationStatus(estudio_id, token, controller.signal);

        if (estudio.estado === 'completado' && estudio.resultado) {
          setInforme(estudio.resultado);
          setSimulacionEstado('completado');
          setStep('resultados');
          // Sin datos de la factura ni del informe -- solo la potencia
          // recomendada, para poder ver el funnel simulador -> expediente
          // sin capturar nada sensible (mejoras 2026-08-07).
          capturar('simulador_completado', {
            potencia_kwp: estudio.resultado.escenarios[0]?.potencia_kwp,
          });
          return;
        }

        if (estudio.estado === 'error') {
          throw new Error('El informe no pudo generarse. Por favor, inténtalo de nuevo.');
        }

        // estado === 'pendiente': continuar polling
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return; // Ignorar si el usuario canceló
      }
      
      const msg = getSimulationErrorMessage(e);
      if (msg) {
        setSimulacionEstado('error');
        setErrorMensaje(msg);
      }
    }
  };

  const stepIndex = PASOS.findIndex((p) => p.id === step);
  const progressValue = step === 'inmueble' ? 33 : step === 'presupuesto' ? 66 : 100;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {step !== 'resultados' && (
        <div className="mb-8">
          <Progress value={progressValue} className="h-2" />
          <ol className="flex list-none justify-between mt-2 text-xs font-medium">
            {PASOS.map((paso, i) => {
              const completado = i < stepIndex;
              const activo = paso.id === step;
              return (
                <li
                  key={paso.id}
                  aria-current={activo ? 'step' : undefined}
                  className={`flex items-center gap-1 ${
                    activo ? 'text-primary' : completado ? 'text-text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {completado ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <span aria-hidden>{i + 1}.</span>
                  )}
                  {paso.label}
                </li>
              );
            })}
          </ol>
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
                <CardContent className="space-y-4 pb-6">
                  <div className="space-y-2">
                    <Label htmlFor="tipoInmueble">Tipo de inmueble</Label>
                    <select
                      id="tipoInmueble"
                      className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...inmuebleForm.register('tipoInmueble')}
                      aria-invalid={!!inmuebleForm.formState.errors.tipoInmueble}
                      aria-describedby={inmuebleForm.formState.errors.tipoInmueble ? 'tipoInmueble-error' : undefined}
                    >
                      <option value="vivienda_unifamiliar">Vivienda unifamiliar</option>
                      <option value="comunidad_vecinos">Comunidad de vecinos</option>
                      <option value="empresa">Empresa / nave industrial</option>
                    </select>
                    {inmuebleForm.formState.errors.tipoInmueble && (
                      <p id="tipoInmueble-error" className="text-sm text-destructive">
                        {inmuebleForm.formState.errors.tipoInmueble.message}
                      </p>
                    )}
                    {/* Aviso de captura de lead para tipos no residenciales */}
                    {['empresa', 'comunidad_vecinos'].includes(inmuebleForm.watch('tipoInmueble')) && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                        Para este tipo de instalación, nuestro equipo te preparará un análisis personalizado.
                        Al hacer clic en &laquo;Siguiente&raquo; te redirigiremos al formulario de contacto.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigoPostal">Código postal</Label>
                    <Input
                      id="codigoPostal"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="Ej.: 28001"
                      aria-invalid={!!inmuebleForm.formState.errors.codigoPostal}
                      aria-describedby={
                        inmuebleForm.formState.errors.codigoPostal ? 'codigoPostal-error' : 'codigoPostal-ayuda'
                      }
                      {...inmuebleForm.register('codigoPostal')}
                    />
                    {inmuebleForm.formState.errors.codigoPostal ? (
                      <p id="codigoPostal-error" className="text-sm text-destructive">
                        {inmuebleForm.formState.errors.codigoPostal.message}
                      </p>
                    ) : (
                      <p id="codigoPostal-ayuda" className="text-xs text-muted-foreground">
                        5 dígitos del código postal donde está o estará la instalación.
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit" className="min-h-11">
                    Siguiente <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
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
                <CardContent className="space-y-4 pb-6">
                  <div className="space-y-2">
                    <Label htmlFor="presupuesto">Presupuesto (€)</Label>
                    <Input id="presupuesto" type="number" {...presupuestoForm.register('presupuesto', { valueAsNumber: true })} />
                    {presupuestoForm.formState.errors.presupuesto && (
                      <p className="text-sm text-destructive">{presupuestoForm.formState.errors.presupuesto.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Entre 1.000€ y 30.000€ para instalaciones residenciales.</p>
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
              <CardContent className="space-y-6 pb-6">
                {/* Aviso RGPD */}
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                  Al subir tu factura, extraemos automáticamente el consumo y la potencia. Si la extracción automática no funciona,
                  el texto se procesará con un servicio de IA externo. No almacenamos el texto completo de tu factura ni el identificador de tu suministro.
                </p>

                <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
                  <Label htmlFor="factura" className="sr-only">Factura</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                    <input
                      id="factura"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.csv"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                    />
                    <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Haz clic o arrastra tu factura aquí</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formato PDF, o el CSV de consumo descargado de{' '}
                      <a
                        href="https://datadis.es"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Datadis
                      </a>{' '}
                      (más preciso)
                    </p>
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

                {!fileError && facturaFile && (
                  <p className="text-sm text-green-600 dark:text-green-400 text-center font-medium">
                    Archivo seleccionado: {facturaFile.name}
                  </p>
                )}

                {/* Estado de la simulación */}
                {simulacionEstado === 'subiendo_factura' && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Leyendo tu factura...
                  </div>
                )}

                {simulacionEstado === 'generando_informe' && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando tu informe personalizado (puede tardar hasta 1 min)...
                  </div>
                )}

                {(simulacionEstado === 'error' || simulacionEstado === 'timeout') && errorMensaje && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                    <p className="text-sm">{errorMensaje}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('presupuesto')} disabled={isSimulating}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                </Button>
                <Button
                  onClick={simulate}
                  disabled={isSimulating || !facturaFile}
                >
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
            <InformeInteractivo informe={informe} />

            {/* CTA hacia el wizard de trámites: antes, quien ya calculaba su
                ahorro tenía que volver a introducir todo desde cero para
                iniciar el expediente (mejora 2026-08-07). Prellenamos la
                potencia recomendada por el propio informe. */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
                <div>
                  <p className="font-medium">¿Listo para dar el siguiente paso?</p>
                  <p className="text-sm text-muted-foreground">
                    Genera el plan de trámites para tu instalación con estos mismos datos.
                  </p>
                </div>
                <Link
                  href={
                    informe.escenarios[0]
                      ? `/nueva-instalacion?potencia=${Math.round(informe.escenarios[0].potencia_kwp * 10) / 10}`
                      : '/nueva-instalacion'
                  }
                  className={buttonVariants({ variant: 'default' })}
                  onClick={() => capturar('simulador_cta_nueva_instalacion_click')}
                >
                  Iniciar trámite <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
