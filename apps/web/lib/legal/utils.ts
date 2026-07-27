export function slugToIne(slug: string): string | undefined {
  const map: Record<string, string> = {
    'andalucia': '01',
    'aragon': '02',
    'asturias': '03',
    'illes_balears': '04',
    'canarias': '05',
    'cantabria': '06',
    'castilla_y_leon': '07',
    'castilla_la_mancha': '08',
    'catalunya': '09',
    'comunitat_valenciana': '10',
    'extremadura': '11',
    'galicia': '12',
    'madrid': '13',
    'region_de_murcia': '14',
    'navarra': '15',
    'pais_vasco': '16',
    'la_rioja': '17',
    'ceuta': '18',
    'melilla': '19'
  };
  return map[slug];
}
