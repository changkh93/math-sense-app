# Studio Error Coach credential isolation

## Confirmed local state

- `OPENAI_API_KEY` is absent from the current shell, a fresh login zsh, and the launchd user environment.
- `~/.zshrc` has no active `OPENAI_API_KEY` assignment and retains one commented assignment.
- `~/.codex/auth.json` reports `auth_mode: chatgpt`. No plaintext credential was read or recorded.
- The installed `codex` CLI could not run `codex login status` because it does not accept the desktop configuration value `model_reasoning_effort = "xhigh"`; this compatibility issue is separate from the stored ChatGPT authentication mode.

## Credential boundary

- `studioErrorCoach` binds only `STUDIO_ERROR_COACH_OPENAI_API_KEY` from Firebase Secret Manager.
- A generic `OPENAI_API_KEY` in a developer shell is deliberately ignored by the callable.
- The synthetic live-check script refuses to run when a generic `OPENAI_API_KEY` is present, then reads only the dedicated secret, keeps it in memory, and silences the Firebase logger before access.
- The live-check resolves modules from the installed `firebase` executable instead of `npm root -g`, avoiding a different global Node installation in an isolated checkout.
- Regression coverage asserts both the dedicated runtime binding and rejection of the generic environment variable.

## Operational rule

Do not place the production coach key in shell startup files, global `.env` files, `launchctl` variables, source, Git, command arguments, or desktop-app launch environments. Register and rotate it only as the dedicated Firebase Secret, then redeploy only `studioErrorCoach` from an isolated release checkout. Historical records mentioning `OPENAI_API_KEY` describe the former binding and are retained as history.

## Verification and release status

- `npm run test:studio-coach-learning`: 69 passed.
- Scoped ESLint, Node syntax checks, diff whitespace checks, and the generic-environment refusal check passed.
- `npm run build` exited successfully. Existing Frontier audio manifest/provisional warnings remain unrelated to this credential change.
- After explicit user confirmation, existing Secret version 4 was copied in memory to `STUDIO_ERROR_COACH_OPENAI_API_KEY` version 1 in `math-sense-1f6a8`; version 1 is `ENABLED`. No key value was printed or written to a file, and the source Secret was not changed or deleted.
- Deployed only `studioErrorCoach` from an isolated checkout. Firebase reports `studioErrorCoach`, `asia-northeast3`, Node.js 22, `ACTIVE`; Hosting and other functions were not deployment targets.
- Synthetic Turtle constructor check: HTTP 200 from `gpt-6-luna`, 1,278 input tokens and 158 output tokens; repeated request was served from the in-memory cache. The check used an in-memory fake database, wrote no production Firestore data, and sent no student data.
