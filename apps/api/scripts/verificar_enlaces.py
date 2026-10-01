"""Comprueba que los enlaces a sedes electrónicas y boletines oficiales de los
85 ficheros de reglas (y del catálogo de ayudas) siguen respondiendo.

Es el primer paso mecánico de una verificación normativa: un trámite cuya URL da
404 suele indicar que el procedimiento cambió de sede o de código. NO sustituye a
la lectura de la fuente (que la norma exista no prueba que la regla esté bien).

Uso (necesita salida a Internet hacia boe.es y las sedes autonómicas):

    cd apps/api
    uv run python scripts/verificar_enlaces.py                # informe en pantalla
    uv run python scripts/verificar_enlaces.py --json out.json

Código de salida 1 si algún enlace está roto (404/410/5xx/timeout/DNS).
Algunas sedes bloquean clientes automáticos (403/429): se marcan «dudoso», no «roto».
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

API_DIR = Path(__file__).resolve().parent.parent
REGLAS_DIR = API_DIR / "motor_normativo" / "reglas"
CATALOGO = API_DIR / "servicios" / "catalogo_ayudas.py"

CLAVES_URL = {"plataforma_url", "url", "fuente_url", "enlace"}
UA = "Mozilla/5.0 (compatible; PermitFlowLinkCheck/1.0; +verificacion-normativa)"


def recopilar_urls(reglas_dir: Path = REGLAS_DIR, catalogo: Path | None = CATALOGO) -> dict[str, list[str]]:
    """Devuelve {url: [orígenes]} con los enlaces de las reglas y del catálogo de ayudas."""
    encontradas: dict[str, list[str]] = {}

    def anota(url: str, origen: str) -> None:
        encontradas.setdefault(url.strip(), []).append(origen)

    def recorre(nodo: Any, origen: str) -> None:
        if isinstance(nodo, dict):
            for clave, valor in nodo.items():
                if isinstance(valor, str) and clave in CLAVES_URL and valor.startswith("http"):
                    anota(valor, origen)
                else:
                    recorre(valor, origen)
        elif isinstance(nodo, list):
            for valor in nodo:
                recorre(valor, origen)

    for fichero in sorted(reglas_dir.glob("*/*.json")):
        recorre(json.loads(fichero.read_text(encoding="utf-8")), f"{fichero.parent.name}/{fichero.name}")

    if catalogo and catalogo.exists():
        for m in re.finditer(r'fuente_url="(https?://[^"]+)"', catalogo.read_text(encoding="utf-8")):
            anota(m.group(1), "catalogo_ayudas.py")
    return encontradas


async def _comprobar(cliente: httpx.AsyncClient, url: str, sem: asyncio.Semaphore) -> dict[str, Any]:
    async with sem:
        try:
            resp = await cliente.head(url)
            if resp.status_code in (403, 405, 501):  # algunos servidores no admiten HEAD
                resp = await cliente.get(url)
            codigo = resp.status_code
            final = str(resp.url)
        except httpx.HTTPError as exc:
            return {"url": url, "estado": "roto", "detalle": type(exc).__name__}

    if codigo < 400:
        estado = "ok" if urlparse(final).path not in ("", "/") or urlparse(url).path in ("", "/") else "redirige_a_portada"
    elif codigo in (401, 403, 429):
        estado = "dudoso"
    else:
        estado = "roto"
    return {"url": url, "estado": estado, "codigo": codigo, "final": final}


async def comprobar(urls: list[str], concurrencia: int = 8, timeout: float = 20.0) -> list[dict[str, Any]]:
    sem = asyncio.Semaphore(concurrencia)
    async with httpx.AsyncClient(
        follow_redirects=True, timeout=timeout, headers={"User-Agent": UA}
    ) as cliente:
        return await asyncio.gather(*(_comprobar(cliente, u, sem) for u in urls))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--json", help="Ruta donde guardar el informe en JSON")
    parser.add_argument("--concurrencia", type=int, default=8)
    args = parser.parse_args()

    urls = recopilar_urls()
    print(f"{len(urls)} enlaces únicos en {len({d for o in urls.values() for d in o})} orígenes\n")
    resultados = asyncio.run(comprobar(sorted(urls), args.concurrencia))

    for r in sorted(resultados, key=lambda r: (r["estado"] == "ok", r["url"])):
        if r["estado"] != "ok":
            print(f"[{r['estado']:<18}] {r.get('codigo', r.get('detalle')):<5} {r['url']}")
            print(f"{'':22}usado en: {', '.join(sorted(set(urls[r['url']]))[:4])}")

    resumen = {e: sum(1 for r in resultados if r["estado"] == e) for e in ("ok", "redirige_a_portada", "dudoso", "roto")}
    print(f"\nResumen: {resumen}")
    if args.json:
        Path(args.json).write_text(
            json.dumps({"resumen": resumen, "resultados": resultados, "origenes": urls}, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    return 1 if resumen["roto"] else 0


if __name__ == "__main__":
    sys.exit(main())
