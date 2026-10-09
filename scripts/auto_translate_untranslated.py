#!/usr/bin/env python3
"""
Auto-translate locale values that are still identical to English source text.

Usage:
  python3 scripts/auto_translate_untranslated.py
"""

from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.parse
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
LOCALES_DIR = ROOT / "du-platform-frontend" / "public" / "locales"
EN_PATH = LOCALES_DIR / "en" / "translation.json"

# Google translate API language codes.
TARGETS = {
    "de": "de",
    "sn": "sn",
    # Google endpoint does not support `nd` directly; `zu` is the closest practical fallback.
    "nd": "zu",
}

PLACEHOLDER_RE = re.compile(r"(\{\{[^}]+\}\}|\{[0-9]+\}|%s|%d|:\w+)")


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


def set_path_value(data: dict[str, Any], path: str, value: Any) -> None:
    keys = path.split(".")
    current: dict[str, Any] = data
    for key in keys[:-1]:
        current = current[key]
    current[keys[-1]] = value


def protect_placeholders(text: str) -> tuple[str, dict[str, str]]:
    replacements: dict[str, str] = {}

    def repl(match: re.Match[str]) -> str:
        token = f"__PH_{len(replacements)}__"
        replacements[token] = match.group(0)
        return token

    protected = PLACEHOLDER_RE.sub(repl, text)
    return protected, replacements


def restore_placeholders(text: str, replacements: dict[str, str]) -> str:
    output = text
    for token, original in replacements.items():
        output = output.replace(token, original)
    return output


def translate_text(text: str, target_lang: str, cache: dict[str, str], *, max_attempts: int = 3) -> str:
    source = text.strip()
    if not source:
        return text
    if source in cache:
        return cache[source]

    protected, replacements = protect_placeholders(source)
    url = (
        "https://translate.googleapis.com/translate_a/single?"
        + urllib.parse.urlencode(
            {
                "client": "gtx",
                "sl": "en",
                "tl": target_lang,
                "dt": "t",
                "q": protected,
            }
        )
    )

    command = [
        "curl",
        "-sS",
        "--max-time",
        "40",
        "-H",
        "User-Agent: Mozilla/5.0",
        url,
    ]

    raw = None
    payload = None
    for attempt in range(1, max_attempts + 1):
        try:
            raw = subprocess.check_output(command, text=True)
            payload = json.loads(raw)
            break
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            if attempt == max_attempts:
                cache[source] = source
                return source
            time.sleep(min(2 * attempt, 6))

    if payload is None:
        cache[source] = source
        return source
    translated = "".join(part[0] for part in payload[0] if part and part[0])
    translated = restore_placeholders(translated, replacements).strip()
    cache[source] = translated if translated else source
    return cache[source]


def main() -> int:
    en_data = load_json(EN_PATH)
    en_flat = flatten_dict(en_data)

    for locale, target_lang in TARGETS.items():
        locale_path = LOCALES_DIR / locale / "translation.json"
        if not locale_path.exists():
            print(f"skip {locale}: {locale_path} not found")
            continue

        locale_data = load_json(locale_path)
        locale_flat = flatten_dict(locale_data)

        unchanged = []
        for key, en_value in en_flat.items():
            locale_value = locale_flat.get(key)
            if isinstance(en_value, str) and isinstance(locale_value, str) and en_value == locale_value:
                unchanged.append((key, en_value))

        if not unchanged:
            print(f"{locale}: no unchanged strings.")
            continue

        total = len(unchanged)
        print(f"{locale}: translating {total} unchanged strings...", flush=True)
        cache: dict[str, str] = {}
        updates = 0
        unchanged_after = 0
        for idx, (key, source_text) in enumerate(unchanged, start=1):
            translated = translate_text(source_text, target_lang=target_lang, cache=cache)
            if translated and translated != source_text:
                set_path_value(locale_data, key, translated)
                updates += 1
            else:
                unchanged_after += 1
            if idx % 25 == 0 or idx == total:
                save_json(locale_path, locale_data)
                print(f"{locale}: progress {idx}/{total}", flush=True)

        save_json(locale_path, locale_data)
        print(
            f"{locale}: updated={updates} still_unchanged={unchanged_after} "
            f"(target_lang={target_lang})",
            flush=True,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
