import os
import json
import pprint

from motor_normativo.clasificador import Clasificador
from motor_normativo.validador import Validador
from schemas.clasificador import ClasificadorInput

def run_smoke_test():
    clasificador = Clasificador()
    validador = Validador()
    
    # 1. IRVE de 8 kW exterior privada
    params_irve = {
        "tipo_instalacion": "irve",
        "comunidad": "andalucia",
        "municipio": "Sevilla",
        "uso": "residencial",
        "potencia_kw": 8,
        "acceso_publico": False,
        "ubicacion_irve": "exterior",
        "requiere_nuevo_suministro": False,
        "modo_recarga": "3"
    }
    
    print("--- SMOKE TEST 1: IRVE 8 kW exterior privada ---")
    plan_irve = clasificador.clasificar(ClasificadorInput(**params_irve))
    tramites = plan_irve.tramites
    print(f"Número de trámites: {len(tramites)}")
    for t in tramites:
        print(f" - {t.nombre}")
    print()

    # 2. FV de 600 kW
    params_fv = {
        "tipo_instalacion": "fotovoltaica_autoconsumo",
        "comunidad": "andalucia",
        "municipio": "Sevilla",
        "potencia_kw": 600,
        "uso": "industrial"
    }
    
    print("--- SMOKE TEST 2: FV 600 kW ---")
    resultado_validador = validador.validar(ClasificadorInput(**params_fv))
    hallazgos = resultado_validador.hallazgos
    print(f"Número de validaciones (hallazgos): {len(hallazgos)}")
    for h in hallazgos:
        print(f" - [{h.id}] {h.mensaje}")
        
if __name__ == '__main__':
    run_smoke_test()
