# Primordial Engine 3D v0.8.0 — Witness & Consequence

## Verdict
**SOURCE-IMPLEMENTED AND ISOLATED-TESTED; PRODUCTION CLOSURE BLOCKED.** The user-requested transformational uplift is targeted to the real three-ordeal Covenant. It corrects invalid victory paths and makes physical consequences observable while keeping the v0.7 sandbox, world, save format and assets intact. Full app typecheck, Vite bundle, 3D/browser gameplay, mobile visual QA and GPU behavior remain unverified because npm dependencies cannot be obtained (`EAI_AGAIN registry.npmjs.org`). No runtime proof is substituted by source assertions.

## Evidence-based quality delta (v0.7 → v0.8)

| Domain | Before | After | Strongest proof/limit |
|---|---|---|---|
| UI | Countdown, will gauge, text objective and world-space beacon | Opt-in tactical map, actionable guidance, optional stage camera focus and after-action breakdown | Source wiring + 109/109 isolated test suite; **no rendered browser QA** |
| WOW / consequence | Trial feedback largely winner/loser plus cumulative points | Actual environmental casualty/map signals, peak historical damage, branch-safe repeated attempts and factual grades | Deterministic trial transitions tested; experiential effect **unverified** |
| Backend | Defensive responses and quench counts susceptible to irrelevant/no-op credit; retry started in the already damaged world | Validated physical after-state, location-gated quench, immutable replay snapshot, blocked post-result casts, no trial-score leakage | Pure TS strict typecheck and 109 Node tests; full bundle **blocked** |
| Assets | Original procedural kingdom, river and beacon | Preserved, plus a programmatic tactical SVG backed by world entities; no external assets | Source contains actual integrated component; visual style **not inspected in browser** |
| UX | Trial failure offered restart but world damage persisted, outcome had little explanation | Repeatable Retry, after-action export/ledger, next action and Focus on stage | Source + tests; touch/device workflow **not played** |

Do not assign 0–4 numeric scores to UI/WOW/assets/UX without real visual and gameplay evidence.

## Biggest transformations and repaired defects

1. **Authentic defense:** Grove rescue requires a real before→after change in marked burning/burnt trees. Castle repair requires a real before→after change in marked damaged/burning blocks. Unrelated or no-op casts no longer advance the trial.
2. **Authentic forge:** Wave produces counted cooled-stone cells near the bridge only **after** the volcanic event. Distant or pre-threat effects cannot count. The existing true `impactGround` result supplies the number.
3. **Damage that matters:** Actual peak tree/structure/village losses persist into grade and after-action narrative even when rebuilt before the next half-second tick. Preservation is computed against real entity totals; originally ruined groves cannot auto-win.
4. **Repeatable choice:** Retry restores a captured pre-attempt world with material ground, pending meteors, current time, scores, cooldowns, crystals and ice, rather than piling damage onto a defeated kingdom. It also resets that attempt's chronicle and cancels queued stale writes/exports. Return to sandbox instead preserves the damage.
5. **Visible causal consequence:** Context-specific next-action advice, optional real-world tactical map, stage grade and honest F on loss, distinct Covenant vs sandbox scoring, separate after-action JSON, and optional one-time focus per stage. Post-win/loss casting is blocked until retry or exit.

**Awe impact:** The same local place acquires memory across an attack, defense and potential alternative history; the visualised map points to actual burning trees and structures. This is a source-supported intended experience, **not** a claim that the untested rendered gameplay currently feels compelling.

## Exact preservation scope
- **All 46 v0.7 entries remain present**; no original asset or procedural mesh replaced. The original ten spells, free sandbox, gesture/touch input, 3D world, camera, Time Atlas, local storage vault, export/import, environment/wind and `primordial-world-v1` format were retained.
- Pure `simulation.ts`, `environment.ts`, `continuity.ts`, other physics/scenario modules were not edited, reducing regression risk. Session-only Covenant data is not silently injected into saved worlds.
- Existing world files, source ZIPs, and tests were not overwritten. Original v0.7 historical reports remain inside release as archived provenance.

## Integration and source files
- Modified: `trial.ts` (pure rules/metrics/grades), `Game.tsx` (scene interaction, snapshots, consequences, score separation), `App.tsx` (challenge HUD, report/export, replay transitions), `tests/run-tests.cjs` (new adversarial tests), `README.md`, `OPERATIONAL_STATE.md`, `package.json`.
- Added: `components/TrialTacticalMap.tsx`, `tests/benchmark-covenant.cjs`, `V080_REPORT.md`, regenerated `RELEASE_MANIFEST.json`.
- Production path: actual world change (`applyMiracle` and `impactGround`) → `trialRecordResponse`/`trialRecordQuench`/`trialObserve` → `trialStep` graded report → `trialView` → actual App HUD/map/export. `trialOriginRef` restores the authoritative world for retries.

## Verification ladder and source limitations
- `npm test`: **109/109 PASS** in working source (92 inherited and 17 added). Pure progression uses real `applyMiracle` and material world fields on five seeded realms; the UI/assertion tests are weaker and do **not** prove a browser journey.
- `npm run syntax`: **26/26 TS/TSX sources parse with no syntax errors**.
- Global strict standalone TypeScript check: `tsc --noEmit --strict --target ES2020 --module esnext --moduleResolution node --lib es2020,dom trial.ts simulation.ts environment.ts types.ts continuity.ts timeline.ts forecast.ts weather.ts hazard.ts vault.ts` — PASS.
- Matched Node-only microbenchmark `node tests/benchmark-covenant.cjs <root>` measured the same 155-tree/93-structure trial-view workload. One warm run: v0.7 median **24.437 µs**, p95 **25.665 µs** per view; v0.8 median **26.722 µs**, p95 **29.651 µs**. Extra factual signals/advice cost ~2.285 µs/read (9.4% median). Since the view refreshes at most around two times a second, this narrow pure-module overhead is tiny; browser FPS is **unmeasured**.
- Final distributed archive must be independently extracted and rerun through this same validation ladder, with manifest SHA checks against the actual packaged content. Any failed mandatory build/runtime path must remain marked blocked.
- `npm run build` — expected **BLOCKED** due to missing `vite/client` types and registry DNS `EAI_AGAIN`; report the real command result when run. There is no synthetic compilation or fake screenshot.

## Remaining blockers / proof work
- **Browser/production:** A Node/npm-connected environment must install existing pinned dependencies, run `npm run build && npm run dev`, and test desktop/Android/iPhone playthrough, hitbox/rune control, directional cast, actual visual map alignment and UI accessibility. Test success and failure for all three stages, pause and resume, retry vs exit, after-action JSON, world save/import and long-session resource disposal. No evidence of measured in-browser performance or audio synchronization is available.
- **State scope:** The Covenant session's grades, objective timer and grade ledger are not part of `primordial-world-v1`. Retry recreates the world substrate, not unsaved NPC wander positions/rigid-body debris particle frames. Existing active threats present when a new Covenant begins may complicate visual replay; playtest pending.
- **Git/CI/deployment:** Source provided as ZIP without `.git`, branch or upstream. No commit, push, CI run, or deployment is claimed.
- **Drive:** Archival requires a provider-confirmed write to an unambiguous archive root; do not label archived without receipt.

## Acceptance / stop verdict
The intended source modifications are test-backed; physical/browser execution and build cannot be certified here, so this is **VERIFIED INCOMPLETE / BLOCKED for production closure**, not a full original-prompt PASS. No claim that all remaining bugs are known or that the project has been deployed.

## Independent packaged-artifact receipt
After a fresh ZIP extraction into `/mnt/data/primordial_engine_v080_coldcheck`, the delivered source passed **109/109** isolated tests, **26/26** TypeScript/TSX source parses, and strict pure-module `tsc`. SHA-256 fingerprints for **all 48 payload files** matched the packaged `RELEASE_MANIFEST.json`; archive integrity passed, with **no removed v0.7 source files**. The full build in the source worktree exited **2** with `TS2688: Cannot find type definition file for 'vite/client'` (dependencies unavailable). Registry lookup separately failed with `EAI_AGAIN`. This confirms source packaging but **not** production/browser execution.
