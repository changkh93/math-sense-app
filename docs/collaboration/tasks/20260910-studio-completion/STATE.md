# Studio Python completion
- Phase: DONE (local; not deployed)
- Goal: VS Code-like beginner-friendly completion for Python builtins, turtle/pygame, student variables/classes/objects, and related editing assistance.
- Baseline: 9204899. Preserve unrelated INDEX edits and exam5-6 artifacts. Codex sole writer in current workspace; no external relay needed.
- Scope: opt-in shared PythonEditor extension used only by Game Studio; static local catalog/type inference, project symbols/assets, snippets, signatures, keyboard help. No execution/upload of code for completion, no cloud service or deployment.
- Acceptance: automatic word/dot completion; aliases and star imports; common return types, user class fields/methods, scope filtering, project imports; Korean descriptions/signatures; safe comments/strings; keyboard/mouse acceptance, normal Tab indentation, snippets; actual browser and focused model tests.
- Limit: lightweight inference, not complete Python language server/dynamic runtime introspection.
- Next: implementation and editing verification complete; no deployment requested.

## Local result
- Added opt-in CodeMirror completion/signature extension, curated Korean catalog, scope/type/project analyzer, snippets and local context suggestions. Tab/Enter accept, Ctrl+Space/Alt+/ activate, Escape dismiss; 4-space indentation and snippet navigation.
- Infers aliases/star imports, common returned objects, student classes/fields/inheritance/annotations and list elements; filters unrelated function locals. Uses project file metadata without executing or uploading code. Large-file/depth/cache bounds.
- Fixed during real UI checks: initial completion key delay and multi-variable pygame return inference; additionally guarded class instances against erroneous parentheses insertion.
- Checks: completion model 7 cases; existing studio 12 and turtle/loop 9 pass. Chrome complete editing QA passed, desktop/narrow screenshots in verification visually inspected. Scoped lint passes; existing unrelated deletedIds cleanup warning remains. Production build passed (existing chunk warning).
- Coverage: common teaching APIs and lightweight inference, not full Pyright/VS Code semantic analysis or all pygame APIs. No unsupported turtle callbacks suggested. No deployment or server writes, no external agents/relay, no user project migration.
- Next: use locally; deployment has not been requested for this change.

## 2026-09-11 — Dotted import completion (DONE, local; not deployed)

- User reported no Turtle recommendation after `from ColabTurtlePlus.`. Import completion was treating the whole dotted path as a top-level module prefix.
- Complete only the segment after the final dot, using known submodules and project package paths. Preserve the parent path and suppress function-call parentheses in import statements. Also covers `import ColabTurtlePlus.`, partial `.Tu`, `matplotlib.pyplot`, NumPy submodules, and nested project files.
- Verification: 11 model tests pass, including replacement offsets, namespace/class distinction, unknown/comment/string exclusions and file-list freshness. Full Chrome completion QA passes: typed the dot, selected Turtle with Tab, selected the imported Turtle class, executed forward(100), stdout confirms (100.0, 0.0); existing keyboard, objects, signatures, snippets and path cases pass. Focused ESLint and production build pass (existing chunk warning). No production deploy, user project edits, or server writes. Existing unrelated INDEX/manual-feedback edits preserved.
