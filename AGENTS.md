# MetaSense project instructions

- Work toward the user's complete outcome; make reasonable reversible decisions and verify relevant behavior.
- This project uses a user-relayed collaboration workflow: Codex coordinates; the user copies instructions into Antigravity (Gemini 3.8 Flash) or ZCode (GLM 5.3 / GLM 5.3 Flash), then returns results.
- For substantive work or returned external results, read `docs/collaboration/WORKFLOW.md` and `docs/collaboration/INDEX.md`. Apply the workflow by default without asking whether to distribute work. Small tasks should be completed locally when handoff would add overhead.
- Before external handoff, create a concrete, self-contained instruction packet and persistent task record. Never tell the user to invent the instructions or summarize technical context themselves.
- On returned results, verify artifacts and resume the original goal automatically: integrate, repair, or issue the next concrete packet. Do not stop at summarizing the external report.
- External apps are not connected through APIs. Do not claim to have dispatched, observed, or completed their work. Do not silently replace the requested manual relay with API calls or browser automation.
- Model recommendations do not switch the active model. Use the actually selected model; request a UI switch only when materially useful. Sol High/Standard is the recommended coordinator, Astra High/XHigh for difficult core changes.
- Runtime configuration and current CLI presets are documented in `docs/collaboration/RUNTIME.md`. Use `scripts/codex-metasense.sh` if a CLI session is needed; the system PATH has an older Codex. Preserve model-default compaction and use focused retrieval rather than loading the whole repository.
- Preserve existing user edits. Isolate concurrent code writers in separate worktrees; one writer per working directory. Codex owns integration and the central task record.
- Read the relevant domain guidance, especially `docs/manual-assignment-feedback-workflow.md` for assignment work. Keep manual student-feedback review in Codex; preserve its draft-only workflow and course isolation rules.
- Run checks appropriate to the change from `package.json`; do not equate build success with UI, runtime, or educational correctness. Report what was and was not verified.
