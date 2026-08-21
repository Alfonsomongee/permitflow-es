"""Las validaciones de base estatal aplican a las 17 comunidades.

Origen: auditoría QA 2026-08-11, hallazgo A-05. Solo 4 comunidades tenían
validaciones definidas, así que 60 de las 85 combinaciones no comprobaban nada.
Escribir 60 conjuntos autonómicos exige trabajo normativo comunidad a comunidad,
pero una parte de lo que hay que comprobar no es autonómica sino estatal, y esa
se cubre de una vez.

El criterio de admisión en `validaciones_transversales.py` es estricto a
propósito: solo entra una comprobación si su base es estatal y existe el texto
literal que la sustenta, citado en el propio `fuente`. Estos tests verifican
tanto que las comprobaciones funcionan como que ese criterio se respeta.
"""

import pytest

from motor_normativo.validaciones_transversales import (
    VALIDACIONES_TRANSVERSALES,
    transversales_para,
)
from motor_normativo.validador import Validador
from schemas.clasificador import ClasificadorInput, ComunidadAutonoma

COMUNIDADES: tuple[str, ...] = ComunidadAutonoma.__args__  # type: ignore[attr-defined]


def validar(comunidad: str, **kwargs):
    base = dict(
        comunidad=comunidad,
        tipo_instalacion="fotovoltaica_autoconsumo",
        potencia_kw=50.0,
        uso="terciario",
        tension="BT",
        modalidad_autoconsumo="con_excedentes_con_compensacion",
        ubicacion_suelo="urbanizado",
        requiere_acceso_conexion=False,
        implantacion="cubierta",
    )
    base.update(kwargs)
    return Validador().validar(ClasificadorInput(**base))


class TestCoberturaEnLasDiecisiete:
    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    def test_ninguna_comunidad_se_queda_sin_comprobaciones_en_fv(self, comunidad):
        assert validar(comunidad).total_definidas > 0

    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    def test_el_limite_de_100kw_de_la_compensacion_se_detecta_en_todas(self, comunidad):
        """RD 244/2019 art. 4: la compensación simplificada solo alcanza a
        instalaciones de producción de hasta 100 kW. Antes solo lo comprobaba
        Andalucía."""
        resultado = validar(comunidad, potencia_kw=150.0, tension="AT")
        assert any(h.id == "GEN-FV-COMPENSACION-100KW" and h.severidad == "error"
                   for h in resultado.hallazgos)

    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    def test_no_salta_por_debajo_de_100kw(self, comunidad):
        resultado = validar(comunidad, potencia_kw=100.0)
        assert not [h for h in resultado.hallazgos if h.id == "GEN-FV-COMPENSACION-100KW"]

    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    def test_ninguna_transversal_queda_no_evaluable(self, comunidad):
        resultado = validar(comunidad, potencia_kw=150.0, tension="AT")
        assert not resultado.no_evaluables


class TestContenidoDeLasComprobaciones:
    def test_el_antivertido_se_avisa_en_sin_excedentes(self):
        resultado = validar("murcia", modalidad_autoconsumo="sin_excedentes")
        hallazgo = next(
            h for h in resultado.hallazgos if h.id == "GEN-FV-SIN-EXCEDENTES-ANTIVERTIDO"
        )
        assert "antivertido" in hallazgo.mensaje

    def test_no_se_avisa_del_antivertido_con_excedentes(self):
        resultado = validar("murcia")
        assert not [
            h for h in resultado.hallazgos if h.id == "GEN-FV-SIN-EXCEDENTES-ANTIVERTIDO"
        ]

    def test_detecta_pedir_acceso_estando_exento(self):
        """Sin excedentes está exento de permisos de acceso y conexión (RDL
        15/2018 DA2ª): pedirlos añade trámites innecesarios con la distribuidora."""
        resultado = validar(
            "galicia", modalidad_autoconsumo="sin_excedentes", requiere_acceso_conexion=True
        )
        assert any(h.id == "GEN-FV-ACCESO-CONEXION-EXENTA" for h in resultado.hallazgos)

    def test_detecta_compensacion_junto_a_registro_de_produccion(self):
        """Quien compensa no se inscribe como productor: son alternativas."""
        resultado = validar("navarra", requiere_registro_produccion=True)
        assert any(
            h.id == "GEN-FV-COMPENSACION-VS-REGISTRO-PRODUCCION" for h in resultado.hallazgos
        )

    def test_un_expediente_coherente_no_dispara_nada(self):
        resultado = validar("extremadura")
        assert resultado.total_errores == 0
        assert resultado.total_avisos == 0


class TestAlcance:
    @pytest.mark.parametrize(
        "vertical", ["acs", "climatizacion_aerotermia", "gas_baja_presion", "irve"]
    )
    def test_no_se_aplican_fuera_de_fotovoltaica(self, vertical):
        """Todas hablan de modalidades de autoconsumo, que no existen en las
        demás tecnologías: aplicarlas allí sería ruido."""
        assert transversales_para(vertical) == []

    def test_si_se_aplican_en_fotovoltaica(self):
        assert transversales_para("fotovoltaica_autoconsumo")


class TestDisciplinaDeLasDefiniciones:
    """El valor de este módulo depende de que no se relaje su criterio."""

    @pytest.mark.parametrize("validacion", VALIDACIONES_TRANSVERSALES,
                             ids=[v["id"] for v in VALIDACIONES_TRANSVERSALES])
    def test_cada_una_cita_su_fuente_con_el_texto_que_la_sustenta(self, validacion):
        fuente = validacion.get("fuente") or ""
        assert fuente, f"{validacion['id']} no cita fuente"
        assert "«" in fuente, (
            f"{validacion['id']}: la fuente debe incluir el texto literal entre comillas "
            f"angulares, no solo la referencia de la norma. Si no se puede citar el texto, "
            f"la comprobación no cumple el criterio de admisión de este módulo."
        )

    @pytest.mark.parametrize("validacion", VALIDACIONES_TRANSVERSALES,
                             ids=[v["id"] for v in VALIDACIONES_TRANSVERSALES])
    def test_cada_una_explica_la_consecuencia_no_solo_el_problema(self, validacion):
        mensaje = validacion.get("mensaje") or ""
        assert len(mensaje) > 120, (
            f"{validacion['id']}: el mensaje debe explicar qué pasa si no se corrige, "
            f"no solo enunciar el problema."
        )

    @pytest.mark.parametrize("validacion", VALIDACIONES_TRANSVERSALES,
                             ids=[v["id"] for v in VALIDACIONES_TRANSVERSALES])
    def test_cada_una_declara_guarda_de_campos(self, validacion):
        """Sin `campos_requeridos`, json-logic opera sobre None y la validación
        puede disparar sobre datos que el usuario simplemente no ha informado."""
        assert validacion.get("campos_requeridos"), (
            f"{validacion['id']} no declara campos_requeridos"
        )

    def test_los_ids_son_unicos_y_llevan_prefijo_gen(self):
        ids = [v["id"] for v in VALIDACIONES_TRANSVERSALES]
        assert len(ids) == len(set(ids))
        assert all(i.startswith("GEN-") for i in ids), (
            "El prefijo GEN- distingue las transversales de las autonómicas en el panel"
        )

    def test_no_colisionan_con_ids_autonomicos(self):
        """Un id repetido haría que el usuario viera dos veces el mismo aviso."""
        import json
        from pathlib import Path

        reglas = Path(__file__).resolve().parents[1] / "motor_normativo" / "reglas"
        locales = set()
        for fichero in reglas.glob("*/*.json"):
            data = json.loads(fichero.read_text(encoding="utf-8"))
            locales.update(v.get("id") for v in data.get("validaciones", []))

        transversales = {v["id"] for v in VALIDACIONES_TRANSVERSALES}
        assert not (transversales & locales)
