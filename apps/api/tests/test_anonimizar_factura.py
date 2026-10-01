from servicios.facturas_parser import MAX_CARACTERES_LLM, anonimizar_texto_factura

CUPS = "ES0021000012345678AB1P"

TEXTO = f"""Titular: Juan Pérez  NIF 12345678Z
Dirección: C/ Mayor 5, 41001 Sevilla  Tel. 612 345 678
Email: juan.perez@example.com  IBAN ES91 2100 0418 4502 0005 1332
CUPS {CUPS}  Potencia contratada 4,6 kW  Consumo anual 3.250 kWh
Empresa: B12345678"""


def test_elimina_identificadores_personales():
    out = anonimizar_texto_factura(TEXTO)
    for dato in ("12345678Z", "612 345 678", "juan.perez@example.com", "ES91 2100", "41001", "B12345678"):
        assert dato not in out


def test_conserva_cups_y_datos_de_consumo():
    out = anonimizar_texto_factura(TEXTO)
    assert CUPS in out
    assert "4,6 kW" in out and "3.250 kWh" in out


def test_limita_el_volumen_enviado():
    assert len(anonimizar_texto_factura("consumo " * 10_000)) == MAX_CARACTERES_LLM
