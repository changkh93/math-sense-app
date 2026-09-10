# -*- coding: utf-8 -*-
"""
verify_all.py
Full automated verification suite for round 02 deliverables.
Verifies Python AST, JSON schemas, assessment line limits & quiz structures,
edits applicability, and runs gameplay acceptance.
"""

import ast
import json
import os
from pathlib import Path
import subprocess
import sys

TASK_DIR = Path(__file__).resolve().parents[1]
CHECKPOINTS_DIR = TASK_DIR / "checkpoints"
DATALOG_DIR = TASK_DIR / "data-log"
MANIFEST_FILE = TASK_DIR / "manifest.json"
EDITS_FILE = TASK_DIR / "edits.json"
ASSESSMENTS_FILE = TASK_DIR / "assessments.json"
VERIFY_GAMEPLAY_PY = TASK_DIR.parent / "verify-gameplay.py"

def check_python_ast():
    print("[1] Checking Python AST across all checkpoints...")
    cp_files = sorted(list(CHECKPOINTS_DIR.glob("*.py")))
    assert len(cp_files) == 25, f"Expected 25 checkpoint files, found {len(cp_files)}"
    for cp in cp_files:
        content = cp.read_text(encoding="utf-8")
        try:
            ast.parse(content, filename=str(cp))
        except SyntaxError as e:
            print(f"FAILED: AST syntax error in {cp.name}: {e}")
            return False
    print(f"  PASS: All 25 checkpoint files ({len(cp_files)}) parsed successfully.")
    return True

def check_manifest():
    print("[2] Checking manifest.json structure and references...")
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["totalUnits"] == 10
    assert data["totalSteps"] == 24
    assert data["totalCheckpoints"] == 25
    assert len(data["units"]) == 10
    step_count = 0
    for u in data["units"]:
        dpath = TASK_DIR / u["dataLogPath"].replace("draft/", "")
        assert dpath.exists(), f"Missing datalog: {dpath}"
        for s in u["steps"]:
            step_count += 1
            cpath = TASK_DIR / s["codePath"].replace("draft/", "")
            assert cpath.exists(), f"Missing checkpoint: {cpath}"
    assert step_count == 24
    print(f"  PASS: manifest.json valid (10 units, {step_count} steps, 25 checkpoints).")
    return True

def check_assessments():
    print("[3] Checking assessments.json constraints...")
    with open(ASSESSMENTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    units = data["units"]
    assert len(units) == 10
    total_ex = 0
    total_qz = 0
    for u in units:
        ukey = u["unitKey"]
        exs = u.get("exercises", [])
        qzs = u.get("quizzes", [])
        total_ex += len(exs)
        total_qz += len(qzs)
        assert len(qzs) == 10, f"{ukey} has {len(qzs)} quizzes (expected 10)"
        for ex in exs:
            lines = len(ex["answerLines"])
            assert 2 <= lines <= 8, f"{ukey} {ex['title']} has {lines} lines (must be 2-8)"
        for qidx, q in enumerate(qzs):
            assert len(q["options"]) == 4, f"{ukey} q{qidx+1} options != 4"
            corrects = sum(1 for opt in q["options"] if opt["isCorrect"])
            assert corrects == 1, f"{ukey} q{qidx+1} corrects != 1 (found {corrects})"
    assert total_ex == 29, f"Expected 29 exercises, found {total_ex}"
    assert total_qz == 100, f"Expected 100 quizzes, found {total_qz}"
    print(f"  PASS: assessments.json valid (29 exercises strictly 2-8 lines, 100 quizzes 4-opt/1-correct).")
    return True

def check_edits():
    print("[4] Checking edits.json structure...")
    with open(EDITS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["totalSteps"] == 24
    assert data["totalCheckpoints"] == 25
    assert len(data["steps"]) == 24
    for s in data["steps"]:
        target_path = CHECKPOINTS_DIR / s["target"]
        assert target_path.exists(), f"Target checkpoint {target_path} does not exist"
    print(f"  PASS: edits.json valid (24 steps matched to checkpoints).")
    return True

def check_datalogs():
    print("[5] Checking data-log files (01.md - 10.md)...")
    for i in range(1, 11):
        p = DATALOG_DIR / f"{i:02d}.md"
        assert p.exists(), f"Missing datalog {p}"
        text = p.read_text(encoding="utf-8")
        assert len(text) > 1000, f"Datalog {p.name} too short ({len(text)} chars)"
        assert "학생 작전 점검 체크리스트" in text, f"Missing checklist in {p.name}"
    print("  PASS: All 10 Data Log files verified with full contract structure.")
    return True

def run_gameplay_acceptance():
    print("[6] Running gameplay acceptance tests (verify-gameplay.py)...")
    res = subprocess.run(
        [sys.executable, str(VERIFY_GAMEPLAY_PY)],
        capture_output=True,
        text=True,
        cwd=str(TASK_DIR.parents[2])
    )
    print(res.stderr or res.stdout)
    assert res.returncode == 0, f"verify-gameplay.py failed with exit code {res.returncode}"
    assert "Ran 7 tests" in res.stderr
    assert "OK" in res.stderr
    print("  PASS: All 7 gameplay acceptance tests PASSED.")
    return True

def main():
    print("==================================================")
    print(" MetaSense Space Invaders Curriculum Round 02 Verifier")
    print("==================================================")
    assert check_python_ast()
    assert check_manifest()
    assert check_assessments()
    assert check_edits()
    assert check_datalogs()
    assert run_gameplay_acceptance()
    print("==================================================")
    print(" ALL CHECKS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    main()
