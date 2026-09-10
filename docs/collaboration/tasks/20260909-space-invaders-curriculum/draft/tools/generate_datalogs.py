# -*- coding: utf-8 -*-
"""
generate_datalogs.py
Generates draft/data-log/01.md through 10.md incorporating all TEACHING-CONTRACT elements,
exact edit locations, line explanations, execution instructions, normal incomplete states,
failure diagnoses, and round 02 corrections.
"""

import os
from pathlib import Path

TASK_DIR = Path(__file__).resolve().parents[1]
DATALOG_DIR = TASK_DIR / "data-log"
DATALOG_DIR.mkdir(parents=True, exist_ok=True)

# We will generate 01.md to 10.md
from gen_datalogs_content import get_datalog_contents

def main():
    contents = get_datalog_contents()
    for num, text in contents.items():
        p = DATALOG_DIR / f"{num:02d}.md"
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Wrote {p} ({len(text)} chars)")

if __name__ == "__main__":
    main()
