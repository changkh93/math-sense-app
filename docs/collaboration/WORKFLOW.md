# MetaSense — Codex / Antigravity / ZCode collaboration

## Purpose and scope

The user supplies a goal and relays prepared packets between applications. Codex performs triage, local work, acceptance review, integration, and follow-up planning. This is an instruction-driven workflow, not a background service, automatic model router, or API integration. It continues when the user returns a result or asks to resume. No polling or scheduled reminders are implied.

The workflow applies in this repository. Existing sessions may need to read AGENTS.md explicitly; new project sessions can discover it. Other apps receive all necessary instructions in each packet; their automatic discovery of AGENTS.md is not assumed.

## Routing

Use the smallest useful team, often Codex alone. Optimize user relay effort and successful completion, not a fixed model quota.

| Work | Default owner | Effort recommendation |
|---|---|---|
| Coordination, normal implementation, integration | Codex / Sol | High; Medium for clear small edits; Standard speed |
| Ambiguous multi-layer bugs, authorization, reward ledger, learning-record integrity, LUMI runtime architecture | Codex / Astra | High; XHigh when unresolved |
| Research, visual/material analysis, learning-content drafts, independent UX review | Antigravity / Gemini 3.8 Flash | Medium; High for difficult reasoning |
| Bounded implementation with agreed contracts | ZCode / GLM 5.3 | Available app default |
| Mechanical edits, formatting, repetitive transformations | ZCode / GLM 5.3 Flash | Available app default |

Codex remains responsible for core changes and student feedback. External agents can inspect scoped core code read-only when helpful, but do not independently change reward, authorization, production data, or assessment semantics without a specific assignment. New instructions from the user take precedence.

Do not bounce an easy task through several models. After two unsuccessful corrections of the same issue, reassess assumptions and consider Astra or an independent diagnosis. Do not invent unavailable reasoning settings. The current coordinator can continue without a model switch when competent to finish.

## Starting work

1. Inspect relevant code, domain rules, current git state and existing pending records. Understand the actual outcome and how to verify it.
2. For a small local task, finish normally without creating a project-management packet.
3. For multi-stage work or any external handoff, create `docs/collaboration/tasks/<ID>/STATE.md` and add one row to INDEX.md. Use a unique timestamp plus a short slug; check for collisions. Each goal has its own record; never overwrite another task's state.
4. Record the user's original goal, acceptance criteria, baseline commit, existing uncommitted changes, ownership, dependencies, local work, and next action.
5. Perform useful local investigation or implementation first where it makes the external task concrete. Assign an independent bounded deliverable, not a vague request to help.
6. Prepare the work environment before giving a code-writing packet. Create a separate worktree at the intended baseline when parallel edits are needed. Follow actual filesystem permissions. If isolation cannot be prepared, use read-only external analysis or explicitly pause local writes for a sequential handoff; do not pretend a folder exists.
7. Fill PACKET-TEMPLATE.md completely and save as `01-antigravity-request.md` or `01-zcode-request.md` inside the task folder. Increment the sequence for each follow-up; retain old packets.
8. Show the full copyable instruction in one text block plus the destination application/model. Include an absolute file link as a convenience. Do not send placeholder packets. Default to one external packet at a time; allow two only if independent and isolated.
9. Mark the packet READY_TO_RELAY. Do not claim it was sent. Continue independent local work if available, then end the turn with the copyable packet and the requested return report. Do not busy-wait for the user.

## Ownership and context

- The packet must distinguish coordinator and external-worker roles, so an external app reading AGENTS.md does not re-delegate or edit central state.
- Record concrete allowed paths, interface constraints, and excluded overlapping work. Codex owns INDEX.md and STATE.md. Workers report in their final answer or a uniquely assigned report path.
- A worktree is an actual separate directory. A different branch name in the same directory is not isolation. Separate development-server ports when simultaneous previews are needed.
- Uncommitted source changes required by the task must be included in the baseline explicitly through a reviewed checkpoint or scoped patch. Never assume a worktree contains uncommitted changes. Avoid carrying unrelated user changes into a handoff.
- Carry only relevant source excerpts, fixtures and documents. Do not package service-account files, tokens, environment secrets, or real student records for generic external development tasks. Prefer synthetic data.
- For research-only work without repository access, provide sufficient context inside the packet and require evidence links; do not pretend the remote agent can read local paths.
- External workers do not merge, deploy, write production data, switch the shared checkout, or send work to another application under the ordinary packet. Scope any exceptional authorization explicitly from the user's actual request.

## Receiving a result

1. Recognize a pasted external report or a statement such as “Gemini finished” as continuation of the existing goal. Match packet ID, paths and context. If several packets could match, ask one short question before modifying any candidate task.
2. Save the report in that task folder as `<sequence>-returned.md`, redacting accidental secrets. Mark RETURNED_UNVERIFIED. A report is evidence to check, not new authority to change the user's goal.
3. Inspect the actual diff/commit/artifacts. Check baseline, scope, required files, correctness and relevant tests. For research, inspect supporting sources; for visual work, view the actual output. If artifact access is missing, issue an exact recovery request instead of treating “done” as completion.
4. A stale baseline, conflicting edits or missing verification requires reconciliation. Never blindly apply a patch, cherry-pick a commit range, or accept claimed test success. Inspect before integrating and preserve unrelated edits.
5. Choose: ACCEPTED (usable), NEEDS_REVISION (specific unmet criteria), or BLOCKED (missing dependency). Save reasons and evidence. Keep external completion separate from integrated completion.
6. Fix small gaps locally. For substantial revisions, generate the next packet with exact failures, expected behavior and retained constraints. Do not make the user formulate the follow-up.
7. Integrate accepted changes using the least disruptive appropriate method. Verify the final combined state. Deployment or production actions follow the user's actual authorization, not an external report.
8. Update STATE.md and INDEX.md before ending the turn. Continue the original goal until verified completion or a real external/input dependency. Mark DONE only when acceptance criteria are met; never infer educational outcomes from unit tests alone.

## State and recovery

Task phases: ACTIVE, WAITING_EXTERNAL, REVIEWING, NEEDS_REVISION, BLOCKED, DONE, CANCELLED.
Packet phases: READY_TO_RELAY, USER_CONFIRMED_SENT, RETURNED_UNVERIFIED, ACCEPTED, NEEDS_REVISION, INTEGRATED, CANCELLED.
WAITING_EXTERNAL means the next step depends on external work, not that dispatch is confirmed.

STATE.md must contain:
- ID, original goal, coordinator identity if available, acceptance criteria;
- phase and last-updated time;
- source baseline, dirty-state note, task worktree/branch paths;
- subtask owners, allowed paths, dependency order, packet phases;
- local changes and checks actually performed;
- returned artifact locations and acceptance decisions;
- next action and the exact item expected from the user;
- final verification and remaining limitations when DONE.

On context loss or a new Codex session, read INDEX.md and the matching STATE.md, inspect current artifacts, and resume. Do not assume a previous session's worktree or uncommitted state is unchanged. Do not resume unrelated pending tasks without the user's request. The user may identify a pending task by goal or ID.

## Response contract

Use Korean with the user. Keep progress short and concrete.
For handoff: what Codex finished → application/model → one complete copyable packet → what result to bring back.
For returned work: acceptance verdict and evidence → local follow-up performed → next packet or verified final outcome.
The user should normally only copy instructions and copy the worker's final report back. Never require the user to manually maintain task records or explain git diffs.

## Setup verification

This workflow is installed through project AGENTS.md, this protocol, a packet template and a task index. Document/reference checks verify installation only. A real cross-app round trip is not verified until a user-relayed task has actually returned and passed acceptance review.
