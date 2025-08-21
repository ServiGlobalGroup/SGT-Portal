"""
Limpieza del repositorio (dry-run por defecto).
- Detecta artefactos de build, pruebas, caches y temporales en backend y frontend.
- Opcionalmente los mueve a .trash en la raíz del repo, manteniendo estructura.

Uso:
  python scripts/cleanup_repo.py            # dry-run
  python scripts/cleanup_repo.py --apply    # aplicar cambios
  python scripts/cleanup_repo.py --restore  # restaurar último lote
"""
from __future__ import annotations
import argparse
import os
import shutil
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TRASH_DIR = REPO_ROOT / ".trash"

SAFE_EXTS = {".log", ".bak", ".backup", ".tmp", ".temp"}

# Patrones por carpetas/archivos comunes
CANDIDATE_PATHS = [
    # Repositorios de dependencias locales/locks obsoletos (no se borran lockfiles en raíz)
    REPO_ROOT / ".venv",
    REPO_ROOT / "backend" / ".venv",
    REPO_ROOT / "backend" / "__pycache__",
    REPO_ROOT / "backend" / "__pycache__",
    REPO_ROOT / "backend" / "alembic" / "__pycache__",
    REPO_ROOT / "backend" / "app" / "__pycache__",
    REPO_ROOT / "frontend" / "node_modules",
    REPO_ROOT / "frontend" / "dist",
    REPO_ROOT / "frontend" / "build",
    REPO_ROOT / "frontend" / "coverage",
    REPO_ROOT / "frontend" / ".turbo",
    REPO_ROOT / "frontend" / ".cache",
    REPO_ROOT / "frontend" / ".vite",
]

# Patrones de archivos de prueba para detectar
TEST_GLOBS = [
    "**/test_*.py",
    "**/*_test.py",
    "**/__tests__/**",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/*.test.ts",
    "**/*.test.tsx",
]

# Rutas que nunca debemos tocar automáticamente (datos del negocio)
PROTECTED_PATHS = [
    REPO_ROOT / "user_files",
    REPO_ROOT / "traffic_files",
    REPO_ROOT / "general_documents",
]


def is_protected(path: Path) -> bool:
    try:
        return any(path.resolve().is_relative_to(p.resolve()) for p in PROTECTED_PATHS)
    except Exception:
        return False


def list_candidates() -> list[Path]:
    items: set[Path] = set()

    # Candidatos directos
    for p in CANDIDATE_PATHS:
        if p.exists():
            items.add(p)

    # Caches y bytecode recursivos
    for p in REPO_ROOT.rglob("__pycache__"):
        items.add(p)

    # Archivos temporales por extensión
    for ext in SAFE_EXTS:
        for p in REPO_ROOT.rglob(f"*{ext}"):
            if not is_protected(p):
                items.add(p)

    # Archivos/pruebas
    for pattern in TEST_GLOBS:
        for p in (REPO_ROOT / "backend").glob(pattern):
            items.add(p)
        for p in (REPO_ROOT / "frontend").glob(pattern):
            items.add(p)

    return sorted(items)


def move_to_trash(paths: list[Path]) -> None:
    TRASH_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    batch_dir = TRASH_DIR / f"cleanup-{stamp}"
    batch_dir.mkdir(parents=True, exist_ok=True)

    for p in paths:
        if is_protected(p):
            print(f"[PROTECTED] {p}")
            continue
        rel = p.relative_to(REPO_ROOT)
        dest = batch_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.move(str(p), str(dest))
            print(f"[MOVED]     {p} -> {dest}")
        except Exception as e:
            print(f"[SKIP]      {p} ({e})")


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
            print(f"[RESTORED]  {src} -> {dest}")
        except Exception as e:
            print(f"[SKIP]      {src} ({e})")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Limpieza del repo")
    parser.add_argument("--apply", action="store_true", help="Aplica la limpieza (mueve a .trash)")
    parser.add_argument("--restore", action="store_true", help="Restaura el último lote movido a .trash")
    args = parser.parse_args(argv)

    if args.restore:
        restore_last_batch()
        return 0

    print("Protegidos (no se tocan):")
    for p in PROTECTED_PATHS:
        print(f"  - {p}")

    candidates = [p for p in list_candidates() if p.exists() and not is_protected(p)]

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
    import sys
    raise SystemExit(main(sys.argv[1:]))
