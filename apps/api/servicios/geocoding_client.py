import httpx
from config import settings
import re
import unicodedata

def slugify(text: str) -> str:
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '_', text)
    return text.strip('_')

async def resolver_comunidad_autonoma(municipio: str, provincia: str) -> str:
    """
    Llama a Google Geocoding API y extrae el campo administrative_area_level_1 
    para determinar la CCAA. Mapea el nombre de la CA al slug interno (ej: 'Andalucía' -> 'andalucia').
    """
    if not settings.GOOGLE_MAPS_API_KEY:
        raise ValueError("GOOGLE_MAPS_API_KEY no está configurada")
        
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": f"{municipio}, {provincia}, España",
        "key": settings.GOOGLE_MAPS_API_KEY,
        "language": "es"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
    if data.get("status") == "OK" and data.get("results"):
        result = data["results"][0]
        for component in result.get("address_components", []):
            if "administrative_area_level_1" in component.get("types", []):
                nombre_ca = component["long_name"]
                return slugify(nombre_ca)
                
    raise ValueError(f"No se pudo resolver la CCAA para {municipio}, {provincia}")


async def resolver_ubicacion(municipio: str, provincia: str) -> dict:
    """
    Devuelve {'comunidad': slug, 'lat': float, 'lon': float, 'provincia': str}.
    Misma llamada a Google Geocoding, pero conservando geometry.location.
    """
    if not settings.GOOGLE_MAPS_API_KEY:
        raise ValueError("GOOGLE_MAPS_API_KEY no está configurada")

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": f"{municipio}, {provincia}, España",
        "key": settings.GOOGLE_MAPS_API_KEY,
        "language": "es",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    if data.get("status") != "OK" or not data.get("results"):
        raise ValueError(f"No se pudo resolver la ubicación para {municipio}, {provincia}")

    result = data["results"][0]

    # Extraer coordenadas
    geometry = result.get("geometry", {})
    location = geometry.get("location")
    if not location:
        raise ValueError(f"La respuesta de Geocoding no incluye geometry.location para {municipio}, {provincia}")

    lat = location["lat"]
    lon = location["lng"]

    # Extraer CCAA
    comunidad_slug = None
    for component in result.get("address_components", []):
        if "administrative_area_level_1" in component.get("types", []):
            comunidad_slug = slugify(component["long_name"])
            break

    if not comunidad_slug:
        raise ValueError(f"No se pudo extraer la CCAA de la respuesta para {municipio}, {provincia}")

    return {
        "comunidad": comunidad_slug,
        "lat": lat,
        "lon": lon,
        "provincia": provincia,
    }

