#!/usr/bin/env python3
"""Walidacja małej mapy kontekstu bez odczytywania danych runtime."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

STATUSES = {"FROZEN", "ACTIVE", "SHARED", "UNKNOWN"}
PATH_FIELDS = ("paths", "entrypoints", "working_set", "evidence")
LIST_FIELDS = (*PATH_FIELDS, "symbols", "dependencies", "validation")


def validate_map(root: Path, document: object) -> list[str]:
    errors: list[str] = []
    root = root.resolve()
    if not isinstance(document, dict) or document.get("schema_version") != 1:
        return ["Mapa modułów: nieobsługiwana wersja schematu."]
    modules = document.get("modules")
    if not isinstance(modules, list) or not modules:
        return ["Mapa modułów: wymagana niepusta lista modules."]
    entries: dict[str, dict] = {}
    for module in modules:
        if not isinstance(module, dict) or not isinstance(module.get("id"), str) or not module["id"]:
            errors.append("Mapa modułów: brak poprawnego id.")
            continue
        module_id = module["id"]
        if module_id in entries:
            errors.append(f"Powielony moduł: {module_id}")
        entries[module_id] = module
        if not isinstance(module.get("status"), str) or module["status"] not in STATUSES:
            errors.append(f"Nieznany status utrzymania: {module_id}")
        if not isinstance(module.get("scope"), str) or not module["scope"].strip():
            errors.append(f"Brak granic odpowiedzialności: {module_id}")
        for field in LIST_FIELDS:
            values = module.get(field)
            if not isinstance(values, list) or any(not isinstance(v, str) or not v.strip() for v in values):
                errors.append(f"Niepoprawna lista {module_id}.{field}")
                continue
            if field in ("paths", "entrypoints", "working_set", "validation") and not values:
                errors.append(f"Pusta lista {module_id}.{field}")
            if field not in PATH_FIELDS:
                continue
            for value in values:
                path = Path(value)
                resolved = (root / path).resolve()
                if path.is_absolute() or "\\" in value or ":" in value or not resolved.is_relative_to(root):
                    errors.append(f"Ścieżka poza repozytorium: {module_id}.{field}: {value}")
                elif not resolved.exists():
                    errors.append(f"Brak ścieżki: {module_id}.{field}: {value}")
        if module.get("status") == "FROZEN" and not module.get("evidence"):
            errors.append(f"FROZEN bez odnośnika do dowodu: {module_id}")

    visited: set[str] = set()
    visiting: set[str] = set()

    def visit(module_id: str) -> None:
        if module_id in visiting:
            errors.append(f"Cykl zależności modułów: {module_id}")
            return
        if module_id in visited:
            return
        visiting.add(module_id)
        dependencies = entries[module_id].get("dependencies", [])
        if isinstance(dependencies, list):
            for dependency in dependencies:
                if not isinstance(dependency, str) or dependency not in entries:
                    errors.append(f"Nieznana zależność modułu: {module_id}: {dependency}")
                else:
                    visit(dependency)
        visiting.remove(module_id)
        visited.add(module_id)

    for module_id in entries:
        visit(module_id)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        document = json.loads((args.root / "docs/module-map.json").read_text(encoding="utf-8-sig"))
        errors = validate_map(args.root, document)
    except (OSError, ValueError) as error:
        print(f"Nie można odczytać mapy modułów: {type(error).__name__}")
        return 1
    if errors:
        print("\n".join(errors))
        return 1
    print(f"Mapa modułów: OK ({len(document['modules'])} modułów)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
