import pytest

from servicios.ayudas import simular_ayudas
from servicios.catalogo_ayudas import buscar_ayudas, TODAS_LAS_AYUDAS


def test_catalogo_no_esta_vacio():
    assert len(TODAS_LAS_AYUDAS) > 10


def test_ids_son_unicos():
    ids = [a.id for a in TODAS_LAS_AYUDAS]
    assert len(ids) == len(set(ids)), "Hay ids de ayuda duplicados en el catálogo"


def test_buscar_ayudas_incluye_estatales_y_autonomicas():
    """Andalucia + fotovoltaica debe traer al menos la ayuda estatal IRPF (aunque sea de otro
    vertical no debería aparecer aquí) y la autonómica AND-FV-INEA."""
    resultado = buscar_ayudas("andalucia", "fotovoltaica_autoconsumo")
    ids = {a.id for a in resultado}
    assert "AND-FV-INEA" in ids
    # No debe colar ayudas de otra comunidad
    assert all(a.comunidad in (None, "andalucia") for a in resultado)


def test_buscar_ayudas_filtra_por_comunidad():
    resultado_andalucia = buscar_ayudas("andalucia", "irve")
    resultado_madrid = buscar_ayudas("madrid", "irve")
    ids_andalucia = {a.id for a in resultado_andalucia}
    ids_madrid = {a.id for a in resultado_madrid}
    assert "AND-IRVE-MOVES3" in ids_andalucia
    assert "AND-IRVE-MOVES3" not in ids_madrid
    assert "MAD-IRVE" in ids_madrid


def test_gas_baja_presion_no_tiene_ayudas_inventadas():
    """Ninguna comunidad debería tener una entrada de gas_baja_presion salvo la única
    hallada (Aragón, marcada como secundaria/histórica) — no se debe inventar cobertura."""
    for comunidad in ("andalucia", "madrid", "cataluna", "galicia"):
        resultado = buscar_ayudas(comunidad, "gas_baja_presion")
        assert resultado == [], f"No debería haber ayudas de gas en {comunidad}"


def test_simular_ayudas_sin_resultados_da_aviso_explicito():
    resultado = simular_ayudas("la_rioja", "gas_baja_presion")
    assert resultado.ayudas == []
    assert resultado.hay_alguna_vigente is False
    assert "No se ha localizado" in resultado.aviso


def test_simular_ayudas_ordena_vigentes_primero():
    resultado = simular_ayudas("andalucia", "fotovoltaica_autoconsumo")
    estados = [a.estado for a in resultado.ayudas]
    if "vigente" in estados:
        assert estados[0] == "vigente"


def test_simular_ayudas_detecta_vigente():
    resultado = simular_ayudas("pais_vasco", "fotovoltaica_autoconsumo")
    assert resultado.hay_alguna_vigente is True
    assert any(a.id == "EUS-FV-EVE" for a in resultado.ayudas)


def test_todas_las_entradas_tienen_fuente_url():
    for a in TODAS_LAS_AYUDAS:
        assert a.fuente_url.startswith("http"), f"{a.id} no tiene fuente_url válida"
