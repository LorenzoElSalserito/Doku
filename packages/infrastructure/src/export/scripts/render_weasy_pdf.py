from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: render_weasy_pdf.py <input_html> <output_pdf>", file=sys.stderr)
        return 2

    input_html = Path(sys.argv[1]).resolve()
    output_pdf = Path(sys.argv[2]).resolve()

    try:
        from weasyprint import HTML
    except ModuleNotFoundError:
        print(
            "WeasyPrint is not installed in this Python environment, so web-style PDF export cannot run yet.",
            file=sys.stderr,
        )
        return 3

    HTML(filename=str(input_html), base_url=str(input_html.parent)).write_pdf(str(output_pdf))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
