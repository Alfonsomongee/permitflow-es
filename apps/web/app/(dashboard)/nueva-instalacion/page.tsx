"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";

type Step = 1 | 2 | 3 | 4;

interface FormData {
  tipo_instalacion: string;
  comunidad: string;
  municipio: string;
  potencia_kw: string;
  superficie_m2: string;
  uso: string;
  combustible?: string;
  presion_bar?: string;
  numero_puntos?: string;
  potencia_por_punto_kw?: string;
  modo_recarga?: string;
  acceso_publico?: boolean;
  ubicacion_irve?: string;
  requiere_nuevo_suministro?: boolean;
  solicita_ayuda?: boolean;
}

export default function NuevaInstalacionPage() {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>({
    tipo_instalacion: "fotovoltaica_autoconsumo",
    comunidad: "andalucia",
    municipio: "",
    potencia_kw: "",
    superficie_m2: "",
    uso: "residencial",
    combustible: "gas_natural",
    presion_bar: "normal",
    numero_puntos: "1",
    potencia_por_punto_kw: "7.4",
    modo_recarga: "3",
    acceso_publico: false,
    ubicacion_irve: "garaje_comunitario",
    requiere_nuevo_suministro: false,
    solicita_ayuda: false,
  });
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const autocompleteInputRef = useRef<HTMLInputElement>(null);

  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    if (step === 2 && googleLoaded && (window as any).google && autocompleteInputRef.current) {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        {
          types: ["(cities)"],
          componentRestrictions: { country: "es" },
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place && place.name) {
          setFormData((prev) => ({ ...prev, municipio: place.name || "" }));
        }
      });
    }
  }, [step, googleLoaded]);

  const handleNext = () => setStep((s) => Math.min(s + 1, 4) as Step);
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const payload = {
        tipo_instalacion: formData.tipo_instalacion,
        comunidad: formData.comunidad,
        municipio: formData.municipio || "Sevilla",
        potencia_kw: parseFloat(formData.potencia_kw) || 0,
        superficie_m2: formData.superficie_m2 ? parseFloat(formData.superficie_m2) : null,
        uso: formData.uso,
        combustible: formData.combustible,
        presion_bar: formData.presion_bar,
        numero_puntos: formData.tipo_instalacion === "irve" ? parseInt(formData.numero_puntos || "1") : null,
        potencia_por_punto_kw: formData.tipo_instalacion === "irve" ? parseFloat(formData.potencia_por_punto_kw || "7.4") : null,
        modo_recarga: formData.tipo_instalacion === "irve" ? formData.modo_recarga : null,
        acceso_publico: formData.tipo_instalacion === "irve" ? formData.acceso_publico : null,
        ubicacion_irve: formData.tipo_instalacion === "irve" ? formData.ubicacion_irve : null,
        requiere_nuevo_suministro: formData.tipo_instalacion === "irve" ? formData.requiere_nuevo_suministro : null,
        solicita_ayuda: formData.solicita_ayuda || false,
      };

      const res = await fetch(`${apiUrl}/api/v1/clasificador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error al clasificar");
      }

      const data = await res.json();
      setResultado(data);
      handleNext();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="lazyOnload"
        onLoad={() => setGoogleLoaded(true)}
        onReady={() => setGoogleLoaded(true)}
      />

      <h1 className="text-3xl font-bold text-text-primary mb-8">Nueva Instalación</h1>
      
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 text-center font-bold pb-2 border-b-4 ${step >= s ? 'border-primary text-primary' : 'border-border text-text-secondary'}`}>
            Paso {s}
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-border">
        {error && (
          <div className="p-4 mb-6 bg-danger/10 border border-danger text-danger rounded">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Tipo de Instalación</h2>
            <select 
              className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
              value={formData.tipo_instalacion}
              onChange={(e) => setFormData({...formData, tipo_instalacion: e.target.value})}
            >
              <option value="fotovoltaica_autoconsumo">Fotovoltaica de Autoconsumo</option>
              <option value="climatizacion_aerotermia">Climatización / Aerotermia</option>
              <option value="acs">Agua Caliente Sanitaria (ACS)</option>
              <option value="gas_baja_presion">Gas Baja Presión</option>
              <option value="irve">Puntos de Recarga (IRVE)</option>
            </select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Ubicación</h2>
            <input 
              ref={autocompleteInputRef}
              type="text" 
              placeholder="Ej. Sevilla" 
              className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
              defaultValue={formData.municipio}
              onBlur={(e) => setFormData({...formData, municipio: e.target.value})}
            />
            <p className="text-sm text-text-secondary">Empieza a escribir para usar el autocompletado de Google Places.</p>
            
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-1">Comunidad Autónoma</label>
              <select 
                className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                value={formData.comunidad}
                onChange={(e) => setFormData({...formData, comunidad: e.target.value})}
              >
                <option value="andalucia">Andalucía</option>
                <option value="aragon">Aragón</option>
                <option value="asturias">Asturias</option>
                <option value="baleares">Illes Balears</option>
                <option value="canarias">Canarias</option>
                <option value="cantabria">Cantabria</option>
                <option value="castilla_la_mancha">Castilla-La Mancha</option>
                <option value="castilla_leon">Castilla y León</option>
                <option value="cataluna">Cataluña</option>
                <option value="comunidad_valenciana">Comunitat Valenciana</option>
                <option value="extremadura">Extremadura</option>
                <option value="galicia">Galicia</option>
                <option value="la_rioja">La Rioja</option>
                <option value="madrid">Madrid</option>
                <option value="murcia">Región de Murcia</option>
                <option value="navarra">Navarra</option>
                <option value="pais_vasco">País Vasco</option>
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Parámetros Técnicos</h2>
            <div>
              <label className="block text-sm font-semibold mb-1">Potencia (kW)</label>
              <input 
                type="number" 
                className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                value={formData.potencia_kw}
                onChange={(e) => setFormData({...formData, potencia_kw: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Superficie (m² - Opcional)</label>
              <input 
                type="number" 
                className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                value={formData.superficie_m2}
                onChange={(e) => setFormData({...formData, superficie_m2: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Uso</label>
              <select 
                className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                value={formData.uso}
                onChange={(e) => setFormData({...formData, uso: e.target.value})}
              >
                <option value="residencial">Residencial</option>
                <option value="industrial">Industrial</option>
                <option value="terciario">Terciario</option>
              </select>
            </div>
            {formData.tipo_instalacion === "gas_baja_presion" && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1">Tipo de combustible</label>
                  <select className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                    value={formData.combustible || "gas_natural"}
                    onChange={(e) => setFormData({...formData, combustible: e.target.value})}>
                    <option value="gas_natural">Gas natural canalizado</option>
                    <option value="glp_deposito">GLP con depósito fijo</option>
                    <option value="glp_envases">GLP con envases/botellas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Presión de la red</label>
                  <select className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                    value={formData.presion_bar || "normal"}
                    onChange={(e) => setFormData({...formData, presion_bar: e.target.value})}>
                    <option value="normal">Normal (≤ 5 bar)</option>
                    <option value="5+">Media/Alta (&gt; 5 bar)</option>
                  </select>
                </div>
              </>
            )}
            {formData.tipo_instalacion === "irve" && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1">Ubicación</label>
                  <select className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                    value={formData.ubicacion_irve || "garaje_comunitario"}
                    onChange={(e) => setFormData({...formData, ubicacion_irve: e.target.value})}>
                    <option value="garaje_comunitario">Garaje comunitario</option>
                    <option value="interior">Interior (aparcamiento o nave)</option>
                    <option value="exterior">Exterior (recinto privado)</option>
                    <option value="via_publica">Vía pública</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Modo de recarga</label>
                  <select className="w-full p-3 border border-border rounded focus:ring-2 focus:ring-primary outline-none"
                    value={formData.modo_recarga || "3"}
                    onChange={(e) => setFormData({...formData, modo_recarga: e.target.value})}>
                    <option value="1">Modo 1 (Schuko básico sin comunicación)</option>
                    <option value="2">Modo 2 (Schuko con cable de control)</option>
                    <option value="3">Modo 3 (Wallbox - AC)</option>
                    <option value="4">Modo 4 (Carga rápida - DC)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <input type="checkbox" id="acceso_publico" 
                    checked={formData.acceso_publico || false}
                    onChange={(e) => setFormData({...formData, acceso_publico: e.target.checked})} className="w-4 h-4 text-primary rounded border-border" />
                  <label htmlFor="acceso_publico" className="text-sm font-semibold">De acceso público</label>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <input type="checkbox" id="requiere_nuevo_suministro" 
                    checked={formData.requiere_nuevo_suministro || false}
                    onChange={(e) => setFormData({...formData, requiere_nuevo_suministro: e.target.checked})} className="w-4 h-4 text-primary rounded border-border" />
                  <label htmlFor="requiere_nuevo_suministro" className="text-sm font-semibold">Requiere nuevo suministro o aumento de potencia</label>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <input type="checkbox" id="solicita_ayuda" 
                    checked={formData.solicita_ayuda || false}
                    onChange={(e) => setFormData({...formData, solicita_ayuda: e.target.checked})} className="w-4 h-4 text-primary rounded border-border" />
                  <label htmlFor="solicita_ayuda" className="text-sm font-semibold">Solicitar subvención (MOVES III)</label>
                </div>
              </>
            )}
          </div>
        )}

        {step === 4 && resultado && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-text-primary">Plan de Tramitación</h1>
                <div className="flex gap-4">
                  <button disabled className="px-6 py-2 border border-border text-text-secondary rounded font-semibold opacity-50 cursor-not-allowed outline-none">
                    Guardar expediente
                  </button>
                  <button onClick={() => setStep(1)} className="px-6 py-2 bg-primary text-white rounded font-semibold outline-none">
                    Nueva consulta
                  </button>
                </div>
              </div>
              <p className="text-sm text-text-secondary">
                {formData.tipo_instalacion} &middot; {formData.comunidad} &middot; {resultado.tramites.length} trámites &middot; {resultado.tiempo_total_estimado_dias || 0} días estimados
              </p>
              <hr className="border-border" />
            </div>

            {resultado.advertencias && resultado.advertencias.length > 0 && (
              <div className="bg-primary-light border-l-4 border-primary p-4">
                <div className="text-sm text-text-primary space-y-1">
                  {resultado.advertencias.map((adv: string, idx: number) => (
                    <p key={idx}>{adv}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {resultado.tramites.map((tramite: any) => (
                <div key={tramite.orden} className="bg-white border border-border flex">
                  <div className="w-16 flex-shrink-0 flex items-start justify-center pt-6 border-r border-border bg-gray-50">
                    <span className="text-3xl font-bold text-primary">{tramite.orden}</span>
                  </div>
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <h2 className="text-xl font-semibold text-text-primary pr-4">{tramite.nombre}</h2>
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">Pendiente</span>
                    </div>

                    <div className="space-y-1 text-sm text-text-primary">
                      <div><span className="font-bold">Organismo:</span> {tramite.organismo}</div>
                      <div><span className="font-bold">Base legal:</span> {tramite.base_legal}</div>
                      <div>
                        <span className="font-bold">Plazo estimado:</span>{' '}
                        <span className={(tramite.plazo_estimado_dias && tramite.plazo_estimado_dias > 30) ? "text-warning font-semibold" : ""}>
                          {tramite.plazo_estimado_dias ? `${tramite.plazo_estimado_dias} días` : 'No especificado'}
                        </span>
                      </div>
                      {tramite.plataforma && (
                        <div><span className="font-bold">Plataforma:</span> {tramite.plataforma}</div>
                      )}
                      {tramite.coste_estimado && (
                        <div><span className="font-bold">Coste administrativo:</span> {tramite.coste_estimado}</div>
                      )}
                    </div>

                    <hr className="border-border" />

                    <div className="space-y-2">
                      <p className="text-sm font-bold text-text-primary">Documentación requerida:</p>
                      <ul className="text-sm text-text-secondary space-y-1">
                        {tramite.documentos_requeridos.map((doc: string, idx: number) => (
                          <li key={idx}>- {doc}</li>
                        ))}
                      </ul>
                    </div>

                    {tramite.notas && (
                      <div className="bg-warning/10 border-l-4 border-warning p-3 mt-4 text-sm text-text-primary">
                        <span className="font-bold mr-2">Nota:</span>{tramite.notas}
                      </div>
                    )}

                    {tramite.paralelo_con && tramite.paralelo_con.length > 0 && (
                      <p className="text-xs text-text-secondary mt-2">
                        Puede realizarse en paralelo con el paso {tramite.paralelo_con.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 mt-8 border-t border-border">
              <p className="text-xs text-text-secondary">
                Los plazos indicados son estimaciones basadas en la normativa vigente. Verifique siempre con el organismo competente antes de iniciar la tramitación.
              </p>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="flex justify-end gap-4 mt-8">
            {step > 1 && (
              <button onClick={handlePrev} className="px-6 py-2 border border-border rounded font-semibold text-text-primary hover:bg-bg outline-none">
                Atrás
              </button>
            )}
            {step < 3 && (
              <button onClick={handleNext} className="px-6 py-2 bg-primary text-white rounded font-semibold hover:bg-primary-dark outline-none">
                Siguiente
              </button>
            )}
            {step === 3 && (
              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="px-6 py-2 bg-success text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50 outline-none"
              >
                {loading ? "Analizando..." : "Clasificar Trámites"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
