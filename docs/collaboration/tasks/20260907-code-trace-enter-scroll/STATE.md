# Code Trace Enter horizontal scroll

- Goal: 긴 5번째 줄 끝에서 Enter 후 새 줄 앞부분과 들여쓰기 뒤 커서가 보여야 한다.
- Phase: DONE (local), 2026-09-07
- Coordinator: Codex; local fix, no external relay.
- Baseline: 466191e, shared checkout. CodeTracePlayer.jsx already dirty (previous scroll-range fix and Hook-order relocation); preserved unrelated edits.
- Allowed scope: CodeTraceEditor Enter handler and task record.
- Root cause: installed @codemirror/view update handles scrollIntoView effects with e.value.clip(this.state) before updating viewState. New end-of-document cursor beyond OLD document length is clamped to previous long-line end. Browser diagnostics confirmed new cursor=210 but pending scroll target=205 (previous document end). This also explained why inserting a line before an existing trailing line initially appeared to pass.
- Final change: dispatch newline/cursor first, then dispatch scroll effect separately against updated document. Scroll range includes new line start through indentation; x=start with content-padding margin. Removed temporary immediate reset and requestMeasure approaches after they failed the end-of-document browser regression.
- Browser verification: user Chrome localhost:5173, original sprite exercise/set 3. End-of-document Enter passed, then delete trailing indentation/newline -> Enter repeated 3 times. Each scrollLeft 276.5 -> 0.5 (subpixel padding edge), caret x=1070.8359375 > gutter right=1019.890625. Screenshot confirms full line beginnings and indented cursor visible. Original draft restored and exact text equality verified. No assessment submitted. Temporary runtime diagnostic removed.
- Checks: scoped ESLint PASS, code-trace progress utility test PASS, final production build PASS (exit 0), git diff --check PASS. Build retains existing large-chunk/audio-manifest warnings.
- Limitations: verified desktop Chrome at existing viewport; mobile/IME not tested. Not deployed.
- Next action: production deployment only when requested; no user relay needed.
