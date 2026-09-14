# Responsive Code Studio preview
- DONE (local, not deployed) 2026-09-14; Codex local owner; baseline 21fcd887 plus pending font-upload change. Preserved unrelated working-tree changes.
- Goal: turtle/pygame drawings remain visible on tablet/resized preview; student screenshot turtle steps reproduced without modifying source.
- Plan: inspect/reproduce intrinsic render surface overflow, fit surfaces to available viewport with coordinates preserved, compact code/result navigation with run showing result, usable enlarged preview, browser verification across sizes/rotation/input/resize.
- No deployment or production student-data writes.

## Implementation
- Reproduced a 600px intrinsic SVG height overflowing a 260px runtime viewport: turtle origin was below the visible surface. Constrained the runtime grid and fit the SVG while preserving its coordinate system and aspect ratio.
- Resize pygame's visible canvas to available width/height, retaining correct mouse coordinates. Constrain plot image height as well as width.
- At widths up to 1100px, provide code/files and execution/output views. Run and input requests reveal the result view; error navigation returns to code.
- Portable expanded preview keeps the existing interpreter and drawing mounted, with visible restore/run/stop controls.

## Verification
- `scripts/qa-python-game-responsive.mjs`: PASS in actual Chrome/WASM at 1440×900, 1024×768, 768×1024, 900×600, and 390×844. User screenshot turtle code renders within all viewports. Verified expansion/restoration, rotation, short preview, unchanged source and interpreter, pygame mouse coordinates, and tablet input submission.
- Geometry and screenshots: [verification/checks.json](verification/checks.json), [tablet portrait](verification/tablet-portrait.png), [tablet landscape](verification/tablet-landscape.png), [short preview](verification/short-preview.png).
- `npm run test:python-game-studio`: 14 passed. `python3 scripts/test-python-game-turtle.py`: 5 passed. Production build passed. Targeted ESLint: no errors; existing cleanup-ref warning. `git diff --check`: passed.
- Existing input QA helper updated to select the code view before editing on compact layouts; the whole legacy input QA was not rerun. Physical iPad/Safari and supplemental Tk/Matplotlib runtime scenarios were not tested in this task.
- Ready for deployment review; production has not been changed.

## Release 2026-09-14
- User explicitly authorized GitHub commit/push and production deployment. Releasing responsive preview and previously verified Korean font fix together.
- Commit scoped to Code Studio sources, QA and these task records. Preserve the current frontend build configuration and already-deployed SEO/crew screens; Functions, rules and student records excluded from deployment.
- Phase: RELEASE IN PROGRESS.
