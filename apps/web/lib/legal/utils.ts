export function slugToIne(slug: string): string | undefined {
  const map: Record<string, string> = {
    'andalucia': '01',
    'aragon': '02',
    'asturias': '03',
    'illes_balears': '04',
    // 'baleares': el slug real que usa el resto de la app (motor normativo,
    // ClasificadorInput, DashboardSidebar...) es "baleares", no "illes_balears".
    // Esta función se llama con result.ubicacion.comunidad (BloqueFiscal.tsx),
    // que trae ese slug real: sin este alias, slugToIne() devolvía undefined
    // para CUALQUIER comunidad cuyo nombre oficial en catalán/euskera/gallego
    // difiere del slug de la app, y ningún incentivo autonómico llegaba a
    // coincidir nunca por geografía -- ni siquiera el único que ya existía
    // (Illes Balears) antes de este fix (auditoría fase 2, coherencia entre
    // módulos; plan de acción consolidado 2026-08-12, P-12).
    'baleares': '04',
    'canarias': '05',
    'cantabria': '06',
    'castilla_y_leon': '07',
    'castilla_leon': '07', // alias: slug real de la app (sin "_y_")
    'castilla_la_mancha': '08',
    'catalunya': '09',
    'cataluna': '09', // alias: slug real de la app
    'comunitat_valenciana': '10',
    'comunidad_valenciana': '10', // alias: slug real de la app
    'extremadura': '11',
    'galicia': '12',
    'madrid': '13',
    'region_de_murcia': '14',
    'murcia': '14', // alias: slug real de la app
    'navarra': '15',
    'pais_vasco': '16',
    'la_rioja': '17',
    'ceuta': '18',
    'melilla': '19'
  };
  return map[slug];
}
