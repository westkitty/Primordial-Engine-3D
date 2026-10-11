# Primordial Engine 3D — 0.7.0 Gameplay Uplift Verification

## Verdict
**IMPLEMENTED IN SOURCE / VERIFIED IN ISOLATED TESTS / NOT PRODUCTION-CERTIFIED.** This release is a continuation of the user's v0.6.0 ZIP. It creates a structured, optional gameplay challenge where incoming catastrophes must be countered using the world systems already present. No new JavaScript dependencies were added. Browser compilation and playtesting still cannot be run in the current npm-isolated container.

## Source-grounded problem
The original project provided ten powers, a richly decorated procedural kingdom, localized destruction/restoration, a responsive world-memory model, an event chronicle and a branchable history, but no adversarial objective, loss condition, resource constraint, or scored challenge. Simply adding more disaster effects would not address this. This version implements **The Covenant**, a three-ordeal trial which uses the existing authored kingdom as its arena.

## Functional gameplay transformations

| Mechanic | Player experience | Grounded implementation/proof |
|---|---|---|
| Opt-in challenge | A player can enter The Covenant without losing free sandbox mode | `App.tsx` dock, `trialEnabled`, `Scene` opt-in controller |
| Real opposing catastrophes | Forest wildfire, bridge-side volcano and castle meteor arrive on clock-based schedules | `trial.ts` threats -> `Game.tsx` `executeThreat` -> existing `applyImpact` / deferred pending meteor |
| Deliberate goals | Save marked forest; cool actual lava; rebuild actual castle | `trialMetrics` and stage tests require real world blocks, burning trees and `impactGround` quench responses |
| Limited spell economy | Each manual miracle consumes will, regenerating during simulation; unused sandbox is unlimited | `trialSpend` enforced after normal range/cooldown and before casting |
| Telegraphed danger | Mission ring and vertical light beam show actual threat target; HUD shows countdown | `TrialBeacon`, `trialView`, Focus beacon camera preset |
| Tactical recovery | Wave/Freeze/Restore have distinct uses; bridge and castle restoration matter | Real `applyMiracle`, `tickEnvironment`, `impactGround`, outcome tests |
| Win and defeat | Each stage has a deadline and success predicate; three clears yields victory; time-out ends challenge | `trialStep`, full five-seed playable-rule test and defeat test |
| Scoring and replay | Time and remaining will affect ordeal bonuses; completed victories set a local record | `trialStep` rewards, `TRIAL_BEST_KEY` |
| Session safeguards | Rewind prohibited midtrial, rejected import preserved, regeneration ends trial, old controls restored on exit | `App.tsx` state transitions and source regression checks |
| Mobile-aware cockpit | Expand/collapse challenge readout; normal dock and gesture controls retained | `App.tsx` CSS/controls source; visual device QA remains pending |

## Exact rules
- Fire: warning +6s, deadline 45s; strike must actually occur; one player defense near the target; no burning trees within the marked grove, and <=28% newly burnt (with a minimum allowance of 2).
- Forge: warning +5s, deadline 50s; volcanic impact must occur; >=2 actual `wave`-quench threshold-crossings; >=2 bridge pieces standing.
- Crown: meteor warning +7s, deadline 60s; actual meteor impact required (not merely scheduled); post-impact local `restore` near the castle; >=85% standing castle/tower structures and no structural fires.
- Will pool max 100, regenerated 1.6 per simulation second. Individual miracles cost between 18 and 40. Completing an ordeal refills 35 will and awards a time/energy-sensitive score; no outcome can be advanced merely by a textual message.

## Files changed from v0.6.0
- **Added:** `trial.ts`, `V070_REPORT.md`.
- **Changed:** `Game.tsx`, `App.tsx`, `tests/run-tests.cjs`, `README.md`, `OPERATIONAL_STATE.md`, `package.json`, `RELEASE_MANIFEST.json`.
- **Preserved:** All 44 files in the source v0.6.0 ZIP; earlier release artifacts remain unchanged. No renderer, engine, asset replacement or package dependency additions.

## Verification ledger
- Original 79 regression checks continue to pass (final isolated suite: 92/92). New checks cover deterministic timing, cost/recharge, real threat execution requirements, no win on fake hazards, preservation thresholds, actual volcano-water quench, actual castle meteor damage/repair, timeouts, blocked/valid save transitions, pre-trial configuration restoration, compact UI controls and a complete, winnable three-act route on five distinct seeds.
- `node tests/run-tests.cjs` with the globally available TypeScript parser (NODE_PATH): **92/92 PASS before packaging**. Strict TypeScript checking of `trial`, `simulation`, `environment`, `types`, `continuity`, `timeline`, `forecast`, `weather`, `hazard` and `vault`: **PASS**. Repeat these from the extracted final ZIP.
- Source syntax: `node verify-syntax.cjs` with TypeScript resolution: **25/25 TS/TSX parsed** (repeat from final ZIP).
- Full `npm run build`: blocked at the old missing `vite/client` definition because package registry lookup fails `EAI_AGAIN`.
- **Not evidenced:** in-browser Three.js or Rapier execution, challenge balance through live input, mouse/touch UX, image-based visual QA, actual FPS/memory, sound, mobile layout, device thermals, CI or deployment.

## Preservation and design constraints
- Trial entry does not regenerate the user's kingdom, and exiting leaves the world as altered. The intended player may use prior damage as a challenge modifier.
- The simulation and complete kingdom save continue to use `primordial-world-v1` without schema changes. Trials are temporary sessions; exporting/loading a kingdom preserves the kingdom, **not** the trial timer/score. Victory best is a separate browser-local key.
- The original chaos score is separate from trial rewards; automatic trial threats are not credited as deliberate player impact score at direct strike time.
- Time Atlas rewinds cannot short-circuit a live trial. Importing incompatible world data must fail before ending a live trial.
- A full sandbox is always accessible through Return to sandbox, even after a failed trial.

## Git, delivery, blocker
The source ZIP contains no `.git` metadata. No commit, remote, push, CI or deployment was performed. Google Drive archival requires separate confirmed provider write evidence. The release does **not** claim to be production ready while dependencies and a real browser are inaccessible.

## Required manual playtest
1. Install dependencies on Node 22 with a working npm registry, run `npm run build`, then `npm run dev`.
2. Begin trial in an undamaged kingdom, use Focus beacon. When fire strikes, use Wave/Freeze on the marked grove and verify it remains safe.
3. Wait for the bridge volcano; use Wave at the beacon to visibly quench hot ground; Restore the bridge if broken.
4. Wait for the meteor to actually fall; Restore castle structures; check victory, score and separate local best.
5. Test mid-trial pause/Resume, unaffordable spell, rune cast, mobile panel Collapse/Expand, Time Atlas lock and exit-to-sandbox controls, then retry after a failure.
6. Export and import a world. Confirm existing save format/fields load and do not silently resume an old trial. Perform 20+ minutes of play and inspect renderer memory/draw calls on target devices.
