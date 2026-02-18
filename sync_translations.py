import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def flatten_dict(data: Any, prefix: str = "") -> dict[str, Any]:
    out: dict[str, Any] = {}
    if isinstance(data, dict):
        for key, value in data.items():
            path = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                out.update(flatten_dict(value, path))
            else:
                out[path] = value
    return out


def merge_from_source(
    source: Any,
    target: Any,
    locale: str,
    mark_missing: bool,
    stats: dict[str, int],
) -> Any:
    if isinstance(source, dict):
        if not isinstance(target, dict):
            stats["type_fixes"] += 1
            target = {}
        for key, source_value in source.items():
            if key not in target:
                stats["added"] += 1
                if mark_missing and isinstance(source_value, str):
                    target[key] = f"[TODO {locale}] {source_value}"
                else:
                    target[key] = source_value
            else:
                target[key] = merge_from_source(source_value, target[key], locale, mark_missing, stats)
        return target
    return target


def sync_locale_file(en_data: Any, locale_path: Path, locale: str, mark_missing: bool) -> dict[str, int]:
    locale_data = load_json(locale_path)
    stats = {"added": 0, "type_fixes": 0}
    merged = merge_from_source(en_data, locale_data, locale, mark_missing, stats)
    save_json(locale_path, merged)
    return stats


def check_locale_file(en_data: Any, locale_path: Path) -> dict[str, int]:
    locale_data = load_json(locale_path)
    en_flat = flatten_dict(en_data)
    locale_flat = flatten_dict(locale_data)
    en_keys = set(en_flat.keys())
    locale_keys = set(locale_flat.keys())
    missing = en_keys - locale_keys
    extra = locale_keys - en_keys
    return {"missing": len(missing), "extra": len(extra)}


def get_check_details(
    en_data: Any,
    locale_path: Path,
    require_translated: bool,
    allow_same_keys: set[str],
) -> dict[str, Any]:
    locale_data = load_json(locale_path)
    en_flat = flatten_dict(en_data)
    locale_flat = flatten_dict(locale_data)

    en_keys = set(en_flat.keys())
    locale_keys = set(locale_flat.keys())
    missing_keys = sorted(en_keys - locale_keys)
    extra_keys = sorted(locale_keys - en_keys)

    todo_keys: list[str] = []
    untranslated_keys: list[str] = []

    for key in sorted(en_keys & locale_keys):
        locale_value = locale_flat[key]
        if isinstance(locale_value, str) and locale_value.startswith("[TODO "):
            todo_keys.append(key)

        if not require_translated:
            continue
        if key in allow_same_keys:
            continue

        source_value = en_flat[key]
        if isinstance(source_value, str) and isinstance(locale_value, str) and source_value == locale_value:
            untranslated_keys.append(key)

    return {
        "missing": len(missing_keys),
        "extra": len(extra_keys),
        "todo": len(todo_keys),
        "untranslated": len(untranslated_keys),
        "missing_keys": missing_keys,
        "extra_keys": extra_keys,
        "todo_keys": todo_keys,
        "untranslated_keys": untranslated_keys,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync/check i18n locale files from English master copy.")
    parser.add_argument("--mode", choices=["sync", "check"], default="sync")
    parser.add_argument("--locales", default="sn,nd,de", help="Comma-separated locale codes excluding 'en'.")
    parser.add_argument("--mark-missing", action="store_true", help="Mark missing inserted strings with [TODO <locale>].")
    parser.add_argument(
        "--require-translated",
        action="store_true",
        help="In check mode, fail when a locale value is unchanged from English.",
    )
    parser.add_argument(
        "--allow-same-keys",
        default="",
        help="Comma-separated key paths allowed to remain same as English when --require-translated is set.",
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=12,
        help="How many sample keys to print for missing/TODO/untranslated checks.",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    locales_dir = root / "client" / "public" / "locales"
    en_path = locales_dir / "en" / "translation.json"
    if not en_path.exists():
        raise FileNotFoundError(f"English source file not found: {en_path}")

    en_data = load_json(en_path)
    locales = [x.strip() for x in args.locales.split(",") if x.strip() and x.strip() != "en"]
    if not locales:
        print("No locales supplied.")
        return 1

    if args.mode == "sync":
        for locale in locales:
            path = locales_dir / locale / "translation.json"
            if not path.exists():
                print(f"skip {locale}: missing file {path}")
                continue
            stats = sync_locale_file(en_data, path, locale, args.mark_missing)
            print(f"synced {locale}: added={stats['added']} type_fixes={stats['type_fixes']}")
        return 0

    failing = False
    allow_same_keys = {x.strip() for x in args.allow_same_keys.split(",") if x.strip()}
    for locale in locales:
        path = locales_dir / locale / "translation.json"
        if not path.exists():
            print(f"fail {locale}: missing file {path}")
            failing = True
            continue
        stats = get_check_details(
            en_data=en_data,
            locale_path=path,
            require_translated=args.require_translated,
            allow_same_keys=allow_same_keys,
        )
        print(
            f"check {locale}: missing={stats['missing']} extra={stats['extra']} "
            f"todo={stats['todo']} untranslated={stats['untranslated']}"
        )

        if stats["missing"] > 0:
            print(f"  missing sample: {', '.join(stats['missing_keys'][:args.sample_size])}")
            failing = True
        if stats["todo"] > 0:
            print(f"  todo sample: {', '.join(stats['todo_keys'][:args.sample_size])}")
            failing = True
        if args.require_translated and stats["untranslated"] > 0:
            print(f"  untranslated sample: {', '.join(stats['untranslated_keys'][:args.sample_size])}")
            failing = True
    return 1 if failing else 0


if __name__ == "__main__":
    raise SystemExit(main())
