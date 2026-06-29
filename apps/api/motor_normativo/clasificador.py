import json
from pathlib import Path
from json_logic import jsonLogic

from schemas.clasificador import ClasificadorInput, ClasificadorOutput, TramiteOutput
from motor_normativo.excepciones import NormativaNoEncontradaError

class Clasificador:
    def __init__(self):
        # Base directory where rules are stored
        self.reglas_dir = Path(__file__).parent / "reglas"

    def clasificar(self, params: ClasificadorInput) -> ClasificadorOutput:
        # Load the rules file
        file_path = self.reglas_dir / params.comunidad / f"{params.tipo_instalacion}.json"
        
        if not file_path.exists():
            raise NormativaNoEncontradaError(
                f"No se encontró normativa para {params.tipo_instalacion} en {params.comunidad}"
            )
            
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        # Variables available for expression evaluation
        eval_locals = {
            "potencia_kw": params.potencia_kw,
            "superficie_m2": params.superficie_m2,
            "uso": params.uso,
            "municipio": params.municipio,
            "comunidad": params.comunidad,
            "tipo_instalacion": params.tipo_instalacion,
            "combustible": params.combustible,
            "presion_bar": params.presion_bar,
            "numero_puntos": params.numero_puntos,
            "potencia_por_punto_kw": params.potencia_por_punto_kw,
            "modo_recarga": params.modo_recarga,
            "acceso_publico": params.acceso_publico,
            "ubicacion_irve": params.ubicacion_irve,
            "requiere_nuevo_suministro": params.requiere_nuevo_suministro,
            "modalidad": params.modalidad,
            "implantacion": params.implantacion,
            "solicita_ayuda": params.solicita_ayuda
        }
        
        tramites_output = []
        tiempo_total = 0
        matched_any = False
        
        for regla in data.get("reglas", []):
            condicion_json = regla.get("condicion", True)
            
            try:
                # Evaluate the condition securely using json-logic
                result = jsonLogic(condicion_json, eval_locals)
                if result:
                    matched_any = True
                    # Match found, map to output schema
                    for t in regla.get("tramites", []):
                        tramite = TramiteOutput(
                            orden=t.get("orden"),
                            nombre=t.get("nombre"),
                            organismo=t.get("organismo"),
                            base_legal=t.get("base_legal"),
                            plazo_estimado_dias=t.get("plazo_estimado_dias"),
                            documentos_requeridos=t.get("documentos_requeridos", []),
                            notas=t.get("notas"),
                            plataforma=t.get("plataforma"),
                            plazo_legal_dias=t.get("plazo_legal_dias"),
                            coste_estimado=t.get("coste_estimado")
                        )
                        tramites_output.append(tramite)
                        if t.get("plazo_estimado_dias"):
                            tiempo_total += t["plazo_estimado_dias"]
                            
            except Exception as e:
                import logging
                logging.warning(f"Error evaluando condición de regla {regla.get('id', 'unknown')}: {e}")
                continue
                
        if not matched_any:
            # If no rule matched
            raise NormativaNoEncontradaError(
                f"No se encontraron reglas aplicables para los parámetros dados en {params.comunidad}"
            )

        # Reasignamos el orden secuencialmente para cuando hay múltiples capas de reglas
        for idx, t in enumerate(tramites_output, start=1):
            t.orden = idx
            
        return ClasificadorOutput(
            tramites=tramites_output,
            tiempo_total_estimado_dias=tiempo_total,
            advertencias=["El tiempo total es orientativo y asume trámites en serie."]
        )
