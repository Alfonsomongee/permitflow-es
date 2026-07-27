import { create } from 'zustand';
import type { InformeSimulacionIA } from '@/types/simulador';

export type SimulationStep = 'inmueble' | 'presupuesto' | 'factura' | 'resultados';

export interface SimulatorState {
  step: SimulationStep;
  setStep: (step: SimulationStep) => void;
  // Inmueble data
  tipoInmueble: string;
  codigoPostal: string;
  setInmuebleData: (tipo: string, cp: string) => void;
  // Presupuesto data
  presupuesto: number;
  setPresupuesto: (presupuesto: number) => void;
  // Factura data
  facturaFile: File | null;
  setFacturaFile: (file: File | null) => void;
  // API response
  informe: InformeSimulacionIA | null;
  setInforme: (informe: InformeSimulacionIA | null) => void;
  // Loading state
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  // Reset
  reset: () => void;
}

export const useSimulatorStore = create<SimulatorState>((set) => ({
  step: 'inmueble',
  setStep: (step) => set({ step }),
  
  tipoInmueble: '',
  codigoPostal: '',
  setInmuebleData: (tipo, cp) => set({ tipoInmueble: tipo, codigoPostal: cp }),
  
  presupuesto: 5000,
  setPresupuesto: (presupuesto) => set({ presupuesto }),
  
  facturaFile: null,
  setFacturaFile: (file) => set({ facturaFile: file }),
  
  informe: null,
  setInforme: (informe) => set({ informe }),
  
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  
  reset: () => set({
    step: 'inmueble',
    tipoInmueble: '',
    codigoPostal: '',
    presupuesto: 5000,
    facturaFile: null,
    informe: null,
    isLoading: false,
  })
}));
