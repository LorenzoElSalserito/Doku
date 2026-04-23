#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "Usage: render_weasy_pdf.py <input-html-path> <output-pdf-path>",
            file=sys.stderr,
        )
        return 1

    html_path = Path(sys.argv[1]).resolve()
    output_path = Path(sys.argv[2]).resolve()

    if not html_path.is_file():
        print(f"Input HTML file does not exist: {html_path}", file=sys.stderr)
        return 1

    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        from weasyprint import HTML
    except ImportError:
        print("WeasyPrint is not installed in the selected Python runtime.", file=sys.stderr)
        return 1

    try:
        HTML(filename=str(html_path)).write_pdf(str(output_path))
    except Exception as error:  # pragma: no cover - surfaced to the caller for diagnostics
        print(f"WeasyPrint failed: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
