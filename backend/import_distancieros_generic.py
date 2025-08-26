"""Importa rutas para un cliente distinto (genérico) al modelo Distanciero.

Formatos soportados:
1) TXT (una ruta por línea)  ejemplo:
   ALGECIRAS-MADRID 650 ESPAÑA MADRID
   ALGECIRAS-SEVILLA 200 ESPAÑA SEVILLA
   (El script toma el último número de la línea como km. El texto previo es el destino bruto.)

2) CSV con cabeceras (detecta .csv) columnas admitidas (al menos destination y km):
   destination,km,notes,active
   ALGECIRAS-MADRID,650,,1

Si ya existe (client_name, destination_normalized) se omite salvo que use --update-km.

Uso:
    py import_distancieros_generic.py --client "ACME" --file data/distancias_acme.txt
Opciones:
    --update-km       Actualiza km si ya existe y difiere.
    --deactivate-missing  Desactiva rutas existentes del cliente que no aparezcan en el fichero (requiere lectura completa).

"""
from __future__ import annotations
import argparse
import csv
from pathlib import Path
from typing import Iterable, Iterator
from sqlalchemy.orm import Session
from typing import cast, Any
from app.database.connection import SessionLocal
from app.models.distanciero import Distanciero
# Forzar carga de modelos con relaciones (evita fallo VacationRequest.user_id no definido)
from app.models import user as _user  # noqa: F401
from app.models import vacation as _vacation  # noqa: F401
from app.services.distanciero_service import normalize_destination

NUMERIC_SUFFIX = "(auto-upd)"


def iter_txt_lines(path: Path) -> Iterator[str]:
    with path.open(encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            yield line


def parse_free_line(line: str) -> tuple[str, int, str | None, bool]:
    tokens = line.split()
    km_idx = None
    for i in range(len(tokens) - 1, -1, -1):
        tk = tokens[i].replace(',', '.')
        if tk.replace('.', '', 1).isdigit():  # admite decimal simple
            km_idx = i
            break
    if km_idx is None:
        raise ValueError(f"No km detectado en línea: {line}")
    km_token = tokens[km_idx].replace(',', '.')
    try:
        km = float(km_token)
    except ValueError as e:  # noqa: BLE001
        raise ValueError(f"KM inválido: {tokens[km_idx]}") from e
    destination_raw = " ".join(tokens[:km_idx])
    extra_tokens = tokens[km_idx + 1 :]
    notes = " ".join(extra_tokens) if extra_tokens else None
    return destination_raw, int(km), notes, True


def iter_input(file_path: Path) -> Iterable[tuple[str, int, str | None, bool]]:
    if file_path.suffix.lower() == ".csv":
        with file_path.open(encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:  # type: ignore[assignment]
                if not row:
                    continue
                destination_raw = (row.get("destination") or "").strip()
                if not destination_raw:
                    continue
                km_raw = (row.get("km") or "").strip()
                km_token = km_raw.replace(',', '.')
                try:
                    km = int(float(km_token))
                except ValueError:
                    raise ValueError(f"KM inválido: {km_raw}")
                notes = (row.get("notes") or None) and row.get("notes").strip() or None  # type: ignore[union-attr]
                active_val = row.get("active")
                active = True
                if active_val is not None:
                    active = str(active_val).strip() not in ("0", "false", "False")
                yield destination_raw, km, notes, active
    else:
        for line in iter_txt_lines(file_path):
            yield parse_free_line(line)


def main():  # noqa: C901 - simplicidad
    ap = argparse.ArgumentParser()
    ap.add_argument("--client", required=True, help="Nombre del cliente (exacto)")
    ap.add_argument("--file", required=True, help="Ruta al fichero (txt o csv)")
    ap.add_argument("--update-km", action="store_true", help="Actualizar km si ya existe la ruta")
    ap.add_argument(
        "--deactivate-missing",
        action="store_true",
        help="Desactivar rutas del cliente que no estén en el fichero",
    )
    args = ap.parse_args()

    file_path = Path(args.file)
    if not file_path.exists():
        raise SystemExit(f"Archivo no encontrado: {file_path}")

    session: Session = SessionLocal()
    inserted = 0
    skipped = 0
    updated = 0
    deactivated = 0
    errors: list[str] = []

    try:
        incoming_keys: set[str] = set()
        new_added: set[str] = set()  # destinos nuevos añadidos en esta ejecución (para evitar duplicados en el mismo fichero)
        rows = list(iter_input(file_path))
        for destination_raw, km, notes, active in rows:
            try:
                dest_norm = normalize_destination(destination_raw)
                incoming_keys.add(dest_norm)
                entity: Distanciero | None = (
                    session.query(Distanciero)
                    .filter(
                        Distanciero.client_name == args.client,
                        Distanciero.destination_normalized == dest_norm,
                    )
                    .first()
                )
                if entity:
                    changed = False
                    if args.update_km and getattr(entity, 'km') != km:
                        setattr(entity, 'km', km)  # type: ignore[attr-defined]
                        changed = True
                    if notes and notes != getattr(entity, 'notes'):
                        setattr(entity, 'notes', notes)  # type: ignore[attr-defined]
                        changed = True
                    if getattr(entity, 'active') != active:
                        setattr(entity, 'active', active)  # type: ignore[attr-defined]
                        changed = True
                    if changed:
                        updated += 1
                    else:
                        skipped += 1
                    continue
                # nuevo (evitar duplicado dentro del mismo fichero)
                if dest_norm in new_added:
                    skipped += 1
                    continue
                entity = Distanciero(
                    client_name=args.client,
                    destination=destination_raw,
                    destination_normalized=dest_norm,
                    km=km,
                    active=active,
                    notes=notes,
                )
                session.add(entity)
                new_added.add(dest_norm)
                inserted += 1
                if (inserted + updated) % 200 == 0:
                    session.commit()
            except Exception as e:  # noqa: BLE001
                errors.append(f"Linea fallida: {destination_raw if 'destination_raw' in locals() else '?'} -> {e}")
        # Desactivar faltantes
        if args.deactivate_missing:
            existing_active = (
                session.query(Distanciero)
                .filter(Distanciero.client_name == args.client, Distanciero.active == True)  # noqa: E712
                .all()
            )
            for ent in existing_active:
                if ent.destination_normalized not in incoming_keys:
                    setattr(ent, 'active', False)  # type: ignore[attr-defined]
                    deactivated += 1
        session.commit()
    finally:
        session.close()

    print(
        f"Cliente={args.client} Insertados={inserted} Actualizados={updated} Omitidos={skipped} "
        f"Desactivados={deactivated} Errores={len(errors)}"
    )
    if errors:
        for e in errors[:20]:
            print(e)
        if len(errors) > 20:
            print(f"... y {len(errors)-20} errores más")


if __name__ == "__main__":  # pragma: no cover
    main()
