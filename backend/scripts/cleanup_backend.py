"""
Script de limpieza para backend (modo dry-run por defecto).
- Detecta archivos y carpetas prescindibles para producción.
- Opcionalmente los mueve a backend/.trash con marca temporal.

Uso:
  python backend/scripts/cleanup_backend.py            # dry-run
  python backend/scripts/cleanup_backend.py --apply    # aplicar cambios
  python backend/scripts/cleanup_backend.py --restore  # mover de .trash a su lugar original si es posible
"""
from __future__ import annotations
import argparse
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
TRASH_DIR = BACKEND_DIR / ".trash"
SELF_PATH = Path(__file__).resolve()

CANDIDATES = [
    # Migraciones Alembic (si en prod usas DB ya provisionada)
    (BACKEND_DIR / "alembic"),
    (BACKEND_DIR / "alembic.ini"),
    # Carpeta scripts utilitarios
    (BACKEND_DIR / "scripts"),
    # Bytecode
    (BACKEND_DIR / "__pycache__"),
    # Archivos de desarrollo o locales
    (BACKEND_DIR / ".env"),
    (BACKEND_DIR / ".env.example"),
]

# Directorios de datos que no deberían ir dentro de la imagen pero sí existir en runtime (se montan)
DATA_DIRS = [
    BACKEND_DIR / "files",
    REPO_ROOT / "user_files",
    REPO_ROOT / "traffic_files",
]

SAFE_EXTS = {".log", ".bak", ".backup", ".tmp", ".temp"}


def list_candidates() -> list[Path]:
    items: list[Path] = []
    for p in CANDIDATES:
        if p.exists():
            items.append(p)
    # buscar __pycache__ recursivos
    for p in BACKEND_DIR.rglob("__pycache__"):
        items.append(p)
    # archivos temporales por extensión
    for ext in SAFE_EXTS:
        items.extend(BACKEND_DIR.rglob(f"*{ext}"))
    return sorted(set(items))


def move_to_trash(paths: list[Path]) -> None:
    TRASH_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    batch_dir = TRASH_DIR / f"cleanup-{stamp}"
    batch_dir.mkdir(parents=True, exist_ok=True)

    for p in paths:
        # Evitar mover este mismo script o su directorio mientras se ejecuta
        try:
            if SELF_PATH == p.resolve() or SELF_PATH.is_relative_to(p.resolve()):
                print(f"[SKIP]  {p} (script en ejecución)")
                continue
        except Exception:
            pass
        rel = p.relative_to(REPO_ROOT) if p.is_absolute() else p
        dest = batch_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.move(str(p), str(dest))
            print(f"[MOVED] {p} -> {dest}")
        except Exception as e:
            print(f"[SKIP]  {p} ({e})")


def restore_last_batch() -> None:
    if not TRASH_DIR.exists():
        print("No hay .trash para restaurar")
        return
    batches = sorted([d for d in TRASH_DIR.iterdir() if d.is_dir()], reverse=True)
    if not batches:
        print("No hay lotes para restaurar")
        return
    last = batches[0]
    for src in last.rglob("*"):
        if src.is_dir():
            continue
        rel = src.relative_to(last)
        dest = REPO_ROOT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.move(str(src), str(dest))
            print(f"[RESTORED] {src} -> {dest}")
        except Exception as e:
            print(f"[SKIP] {src} ({e})")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Limpieza backend")
    parser.add_argument("--apply", action="store_true", help="Aplica la limpieza (mueve a .trash)")
    parser.add_argument("--restore", action="store_true", help="Restaura el último lote movido a .trash")
    args = parser.parse_args(argv)

    if args.restore:
        restore_last_batch()
        return 0

    # Mostrar info de data dirs
    print("Directorios de datos (montar en runtime; no se borran):")
    for d in DATA_DIRS:
        print(f"  - {d}")

    candidates = list_candidates()
    if not candidates:
        print("No se encontraron candidatos para limpieza")
        return 0

    print("Candidatos a mover a .trash:")
    for p in candidates:
        print(f"  - {p}")

    if args.apply:
        print("\nAplicando limpieza...")
        move_to_trash(candidates)
        print("\nHecho. Puedes restaurar con --restore si es necesario.")
    else:
        print("\nDry-run terminado. Ejecuta con --apply para moverlos a .trash.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
