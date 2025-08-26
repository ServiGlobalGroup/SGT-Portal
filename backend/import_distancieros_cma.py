"""Importa listado bruto de rutas (cliente CMA) al modelo Distanciero.

Uso:
    py -m import_distancieros_cma
ó  (desde carpeta backend):
    py import_distancieros_cma.py

El script es idempotente: si (client_name, destination_normalized) ya existe se omite.
"""
from __future__ import annotations
import re
from pathlib import Path
from typing import Iterable
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.distanciero import Distanciero
# Forzamos registro de relaciones que referencian VacationRequest antes de crear sesión
from app.models import user as _user  # noqa: F401
from app.models import vacation as _vacation  # noqa: F401
from app.services.distanciero_service import normalize_destination

CLIENT_NAME = "CMA"
RAW_DATA = """
ALGECIRAS-A DOS CUNHADOS 1388 PORTUGAL CONCELHO DE TORRES VEDRAS
ALGECIRAS-ABADE DE NEIVA (PORTUGAL) 1900 ESPAÑA PORTUGAL
ALGECIRAS-ABANTO ZIERBENA 2108 ESPAÑA VIZCAYA
ALGECIRAS-ABARAN (MURCIA) 1138 ESPAÑA MURCIA
ALGECIRAS-ACEUCHAL (BADAJOZ) 719 ESPAÑA BADAJOZ
ALGECIRAS-ACULA 513 ESPAÑA GRANADA
ALGECIRAS-ADAMUZ (CORDOBA) 633 ESPAÑA CORDOBA
ALGECIRAS-ADRA (ALMERIA) 574 ESPAÑA ALMERIA
ALGECIRAS-AGONCILLO (LOGROÑO) 2064 ESPAÑA LOGROÑO
ALGECIRAS-AGOST (ALICANTE) 1225 ESPAÑA ALICANTE
ALGECIRAS-AGUADULCE (ALMERIA) 665 ESPAÑA ALMERIA
ALGECIRAS-AGUADULCE (SEVILLA) 496 ESPAÑA SEVILLA
ALGECIRAS-AGUADULCE SEV 482 ESPAÑA SEVILLA
ALGECIRAS-AGUEDA (PORTUGAL) 1410 ESPAÑA PORTUGAL
ALGECIRAS-AGUILAR (CORDOBA) 512 ESPAÑA CORDOBA
ALGECIRAS-AGUILAR DE CAMPOO (PALENCIA) 1818 ESPAÑA PALENCIA
ALGECIRAS-AGUILAR DE LA FRONTERA 498 ESPAÑA CORDOBA
ALGECIRAS-AGUILAR FRONTERA 498 ESPAÑA
ALGECIRAS-AGUILAS (MURCIA) 992 ESPAÑA MURCIA
ALGECIRAS-AGULLENT (VALENCIA) 1364 ESPAÑA VALENCIA
ALGECIRAS-AHILLONES 669 ESPAÑA BADAJOZ
ALGECIRAS-AIZARNAZABAL 2216 ESPAÑA SAN SEBASTIAN
ALGECIRAS-AJALVIR 1377 ESPAÑA MADRID
ALGECIRAS-ALAEJOS 1436 ESPAÑA VALLADOLID
ALGECIRAS-ALAGON 1940 ESPAÑA ZARAGOZA
ALGECIRAS-ALAMEDA (MALAGA) 420 ESPAÑA MALAGA
ALGECIRAS-ALAMO, EL 1400 ESPAÑA MADRID
ALGECIRAS-ALANGE 770 ESPAÑA BADAJOZ
ALGECIRAS-ALAQUAS 1524 ESPAÑA VALENCIA
ALGECIRAS-ALBACETE 1348 ESPAÑA ALBACETE
ALGECIRAS-ALBAIDA 1358 ESPAÑA VALENCIA
ALGECIRAS-ALBAIDA DE ALJARAFE (SEVILLA) 448 ESPAÑA SEVILLA
ALGECIRAS-ALBAL (VALENCIA) 1502 ESPAÑA VALENCIA
ALGECIRAS-ALBANCHEZ (ALMERIA) 827 ESPAÑA ALMERIA
ALGECIRAS-ALBATERA (ALICANTE) 1168 ESPAÑA ALICANTE
ALGECIRAS-ALBERCA DE ZANCARA, LA (CUENCA) 1200 ESPAÑA CUENCA
ALGECIRAS-ALBERCA DO RIBATEJO (PORTUGAL) 1268 PORTUGAL
ALGECIRAS-ALBERGARIA-A-VELHA 1740 PORTUGAL PORTUGAL
ALGECIRAS-ALBOLODUY (ALMERIA) 756 ESPAÑA ALMERIA
ALGECIRAS-ALBOLOTE (GRANADA) 516 ESPAÑA GRANADA
ALGECIRAS-ALBOX (ALMERIA) 855 ESPAÑA ALMERIA
ALGECIRAS-ALBUERA, LA 763 ESPAÑA BADAJOZ
ALGECIRAS-ALBUFEIRA (PORTUGAL) 852 ESPAÑA PORTUGAL
... (truncado por brevedad, continuar con el resto del listado original pegado aquí) ...
""".strip()

DATA_FILE = Path(__file__).parent / "data" / "distancieros_cma_raw.txt"

# Para no inflar excesivamente el repositorio se ha truncado el dataset en este commit.
# IMPORTANTE: Sustituir el marcador "... (truncado ... ) ..." copiando el resto de líneas antes de ejecutar en producción.

NUMERIC_RE = re.compile(r"(\d+)")


def load_raw_source() -> str:
    if DATA_FILE.exists():
        content = DATA_FILE.read_text(encoding="utf-8").strip()
        if content.startswith("Pegar aquí el listado"):
            print("[ADVERTENCIA] El archivo de datos es el placeholder; usando RAW_DATA incrustado.")
        else:
            print(f"Leyendo datos desde {DATA_FILE}")
            return content
    return RAW_DATA


def iter_raw_lines(raw: str) -> Iterable[str]:
    for raw_line in raw.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("Estos son del cliente"):
            continue
        yield line


def parse_line(line: str) -> tuple[str, int, str]:
    """Devuelve (destination_raw, km, notes)

    Estrategia: tomar el último token numérico como km. Lo anterior es el texto destino (incluye origen).
    El resto de tokens posteriores (país / provincia) se almacenan en notes para referencia.
    """
    tokens = line.split()
    km_index = None
    for i in range(len(tokens) - 1, -1, -1):
        if tokens[i].isdigit():
            km_index = i
            break
    if km_index is None:
        raise ValueError(f"No se encontró km en línea: {line}")
    km = int(tokens[km_index])
    destination_tokens = tokens[:km_index]
    # La parte extra (país / provincia) en notes
    extra_tokens = tokens[km_index + 1:]
    destination_raw = ' '.join(destination_tokens)
    notes = ' | '.join([' '.join(extra_tokens)]) if extra_tokens else ''
    return destination_raw, km, notes


def main():
    raw_source = load_raw_source()
    session: Session = SessionLocal()
    inserted = 0
    skipped = 0
    errors: list[str] = []
    try:
        for line in iter_raw_lines(raw_source):
            try:
                destination_raw, km, extra_notes = parse_line(line)
                dest_norm = normalize_destination(destination_raw)
                exists = session.query(Distanciero.id).filter(
                    Distanciero.client_name == CLIENT_NAME,
                    Distanciero.destination_normalized == dest_norm
                ).first()
                if exists:
                    skipped += 1
                    continue
                entity = Distanciero(
                    client_name=CLIENT_NAME,
                    destination=destination_raw,
                    destination_normalized=dest_norm,
                    km=km,
                    active=True,
                    notes=extra_notes or None,
                )
                session.add(entity)
                inserted += 1
                if inserted % 100 == 0:
                    session.commit()
            except Exception as e:  # noqa: BLE001
                errors.append(f"Linea fallida: {line} -> {e}")
        session.commit()
    finally:
        session.close()

    print(f"Importación completada. Insertados: {inserted} | Duplicados omitidos: {skipped} | Errores: {len(errors)}")
    if errors:
        for e in errors[:20]:  # limitar salida
            print(e)
        if len(errors) > 20:
            print(f"... y {len(errors)-20} errores más")


if __name__ == "__main__":
    main()
