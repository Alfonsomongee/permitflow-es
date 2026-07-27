import { LegalReference } from '@/lib/legal/types';

export const confirmedStateReferences: LegalReference[] = [
  {
    id: 'es-rd-244-2019',
    title: 'Real Decreto 244/2019, de 5 de abril, por el que se regulan las condiciones administrativas, técnicas y económicas del autoconsumo de energía eléctrica.',
    scope: 'state',
    locationContext: { state: 'ES' },
    url: 'https://www.boe.es/eli/es/rd/2019/04/05/244/con',
    status: 'verified',
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    id: 'es-rd-1053-2014',
    title: 'Real Decreto 1053/2014, de 12 de diciembre (ITC-BT-52). Instalaciones de recarga de vehículos eléctricos.',
    scope: 'state',
    locationContext: { state: 'ES' },
    url: 'https://www.boe.es/eli/es/rd/2014/12/12/1053',
    status: 'verified',
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    id: 'es-rd-184-2022',
    title: 'Real Decreto 184/2022, de 8 de marzo, por el que se regula la actividad de prestación de servicios de recarga energética de vehículos eléctricos.',
    scope: 'state',
    locationContext: { state: 'ES' },
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-4361',
    status: 'verified',
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    id: 'es-ley-10-2022',
    title: 'Ley 10/2022, de 14 de junio, de medidas urgentes para impulsar la actividad de rehabilitación edificatoria (Deducciones IRPF).',
    description: 'Sustituye al derogado RD 19/2021.',
    scope: 'state',
    locationContext: { state: 'ES' },
    url: null, // Pendiente de revisar la Ley 35/2006 (IRPF) consolidada para apuntar al art. exacto.
    status: 'pending_verification',
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    id: 'es-rdl-7-2026',
    title: 'Real Decreto-ley 7/2026, de 20 de marzo (Plan Integral de Respuesta a la Crisis).',
    description: 'Citado por la UI anterior para deducciones del 10/20% en autoconsumo. Artículo exacto NO LOCALIZADO.',
    scope: 'state',
    locationContext: { state: 'ES' },
    url: null,
    status: 'pending_verification',
    lastVerifiedAt: new Date().toISOString(),
  },
  {
    id: 'es-rd-609-2026',
    title: 'Real Decreto 609/2026 (Programa Auto+)',
    description: 'Programa estatal de ayudas para la adquisición de vehículos electrificados. NO cubre infraestructura de recarga vinculada.',
    scope: 'state',
    locationContext: { state: 'ES' },
    url: null,
    status: 'pending_verification', // Se asume su existencia, pero hay que localizar el BOE.
    lastVerifiedAt: new Date().toISOString(),
  }
];

export const allReferences = [...confirmedStateReferences];
