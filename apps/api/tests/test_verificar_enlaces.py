import importlib.util
from pathlib import Path

RUTA = Path(__file__).resolve().parent.parent / "scripts" / "verificar_enlaces.py"


def _modulo():
    spec = importlib.util.spec_from_file_location("verificar_enlaces", RUTA)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def test_recopila_enlaces_de_reglas_y_catalogo():
    urls = _modulo().recopilar_urls()
    assert len(urls) > 150
    assert all(u.startswith("http") for u in urls)
    assert any(u.startswith("https://www.boe.es") for u in urls)
    assert any("catalogo_ayudas.py" in origenes for origenes in urls.values())


def test_recopila_de_un_directorio_arbitrario(tmp_path):
    (tmp_path / "x").mkdir()
    (tmp_path / "x" / "acs.json").write_text(
        '{"reglas":[{"tramites":[{"plataforma_url":"https://sede.example/uno"}]}],"fuentes":[{"url":"https://boe.example/dos"}]}',
        encoding="utf-8",
    )
    urls = _modulo().recopilar_urls(tmp_path, catalogo=None)
    assert set(urls) == {"https://sede.example/uno", "https://boe.example/dos"}
