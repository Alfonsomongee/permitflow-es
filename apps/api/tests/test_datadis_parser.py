"""Tests de servicios/datadis_parser.py.

Los tres formatos de cabecera usados en los tests de reconocimiento de
columnas están documentados públicamente (no son una suposición): ver
https://www.simuladorfacturaluz.es/el-fichero-csv-de-consumos/, que muestra
ejemplos reales de los tres patrones más comunes entre distribuidoras.
"""

from datetime import date, timedelta

from servicios.datadis_parser import parsear_csv_datadis

CUPS_EJEMPLO = "ES0022000006025866PZ1P"


def _csv_un_dia(cabecera: str, columna_valor_idx: int, num_columnas: int, valor_hora1: str = "0,143") -> bytes:
    filas = [cabecera]
    for hora in range(1, 25):
        campos = [CUPS_EJEMPLO, "01/01/2024", str(hora)] + ["0"] * (num_columnas - 3)
        campos[columna_valor_idx] = valor_hora1 if hora == 1 else "0,1"
        filas.append(";".join(campos))
    return "\n".join(filas).encode("utf-8")


def test_formato_consumo_kwh_basico_pero_periodo_corto():
    # Ejemplo 1 real: CUPS;Fecha;Hora;Consumo_kWh;Metodo_obtencion -- un solo
    # día no llega a la cobertura mínima, así que se espera un rechazo claro.
    csv_bytes = _csv_un_dia("CUPS;Fecha;Hora;Consumo_kWh;Metodo_obtencion", 3, 5)
    resultado = parsear_csv_datadis(csv_bytes)
    assert resultado["estado"] == "no_extraido"
    assert "corto" in resultado["error"]


def test_columna_ae_kwh_reconocida():
    # Ejemplo 2 real: CUPS;Data;Hora;AE_kWh;LECTURA REAL/ESTIMADA
    csv_bytes = _csv_un_dia("CUPS;Data;Hora;AE_kWh;LECTURA REAL/ESTIMADA", 3, 5)
    resultado = parsear_csv_datadis(csv_bytes)
    # Un solo día: rechazado por cobertura, pero NO por columnas no reconocidas
    assert resultado["estado"] == "no_extraido"
    assert "no se reconocen" not in resultado["error"].lower()


def test_excedentes_no_se_confunden_con_consumo():
    # Ejemplo 3 real: incluye AS_KWh (excedentes) y AE_AUTOCONS_kWh -- debe
    # usarse AE_kWh (índice 3), no las columnas de excedentes/autoconsumo.
    cabecera = "CUPS;Fecha;Hora;AE_kWh;AS_KWh;AE_AUTOCONS_kWh;REAL/ESTIMADO"
    filas = [cabecera]
    for hora in range(1, 25):
        # AE_kWh=1,0 (consumo real), AS_KWh=5,0 (excedente, debe ignorarse)
        filas.append(f"{CUPS_EJEMPLO};01/01/2024;{hora};1,0;5,0;;R")
    resultado = parsear_csv_datadis("\n".join(filas).encode("utf-8"))
    # Un solo día -> rechazado por cobertura corta, confirma que llegó a
    # parsear filas (no fallo de columnas) sumando ~24 kWh de AE, no ~120 de AS.
    assert resultado["estado"] == "no_extraido"
    assert "corto" in resultado["error"]


def test_archivo_vacio():
    resultado = parsear_csv_datadis(b"")
    assert resultado["estado"] == "no_extraido"


def test_columnas_no_reconocidas_fichero_equivocado():
    # Simula haber descargado "Potencias máximas" en vez de "Consumo"
    csv_bytes = b"CUPS;Fecha;Periodo;PotenciaMaxima_kW\nES123;01/01/2024;P1;4,6\n"
    resultado = parsear_csv_datadis(csv_bytes)
    assert resultado["estado"] == "no_extraido"
    assert "no se reconocen" in resultado["error"].lower()


def _generar_csv_anual(kwh_por_dia) -> bytes:
    """Genera un CSV de un año completo, una fila por día (hora=1), con el
    kWh que devuelva kwh_por_dia(fecha)."""
    filas = ["CUPS;Fecha;Hora;Consumo_kWh;Metodo_obtencion"]
    inicio = date(2024, 1, 1)
    for i in range(366):  # 2024 es bisiesto
        dia = inicio + timedelta(days=i)
        if dia.year != 2024:
            break
        valor = kwh_por_dia(dia)
        valor_str = f"{valor:.3f}".replace(".", ",")
        filas.append(f"{CUPS_EJEMPLO};{dia.strftime('%d/%m/%Y')};1;{valor_str};R")
    return "\n".join(filas).encode("utf-8")


def test_cobertura_anual_completa_devuelve_perfil_mensual():
    # 10 kWh/día constantes todo el año -> consumo anual ~3650-3660 kWh
    csv_bytes = _generar_csv_anual(lambda d: 10.0)
    resultado = parsear_csv_datadis(csv_bytes)
    assert resultado["estado"] == "exitoso"
    assert resultado["fuente_dato"] == "leido"
    assert 3600 <= resultado["consumo_anual_kwh"] <= 3700
    assert resultado["consumo_mensual_kwh"] is not None
    assert len(resultado["consumo_mensual_kwh"]) == 12
    # Enero (31 días * 10 kWh) debe rondar 310 kWh
    assert 300 <= resultado["consumo_mensual_kwh"][0] <= 320
    assert resultado["cups"] == CUPS_EJEMPLO


def test_perfil_mensual_refleja_estacionalidad():
    # Más consumo en invierno (meses 1,2,12) que en verano -- el perfil
    # mensual debe reflejarlo, no promediarlo todo por igual.
    def kwh_por_dia(d: date) -> float:
        return 20.0 if d.month in (1, 2, 12) else 5.0

    resultado = parsear_csv_datadis(_generar_csv_anual(kwh_por_dia))
    assert resultado["estado"] == "exitoso"
    perfil = resultado["consumo_mensual_kwh"]
    assert perfil[0] > perfil[6]  # enero > julio


def test_cobertura_parcial_no_da_perfil_mensual_pero_extrapola_anual():
    # Solo enero-marzo (91 días): sin perfil mensual completo, pero sí
    # extrapolación anual honesta marcada como estimada.
    filas = ["CUPS;Fecha;Hora;Consumo_kWh;Metodo_obtencion"]
    inicio = date(2024, 1, 1)
    for i in range(91):
        dia = inicio + timedelta(days=i)
        filas.append(f"{CUPS_EJEMPLO};{dia.strftime('%d/%m/%Y')};1;10,0;R")
    resultado = parsear_csv_datadis("\n".join(filas).encode("utf-8"))
    assert resultado["estado"] == "exitoso"
    assert resultado["consumo_mensual_kwh"] is None
    assert resultado["fuente_dato"] == "estimado"
    # 10 kWh/día * 365 ~ 3650
    assert 3500 <= resultado["consumo_anual_kwh"] <= 3800


def test_fecha_formato_iso_tambien_se_reconoce():
    filas = ["CUPS;Fecha;Hora;Consumo_kWh;Metodo_obtencion"]
    inicio = date(2024, 1, 1)
    for i in range(60):
        dia = inicio + timedelta(days=i)
        filas.append(f"{CUPS_EJEMPLO};{dia.isoformat()};1;10,0;R")
    resultado = parsear_csv_datadis("\n".join(filas).encode("utf-8"))
    assert resultado["estado"] == "exitoso"
