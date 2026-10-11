# Primordial Engine 3D - Operational State

Project ID: `primordial-engine-3d`
Source baseline: `primordial_engine_3d_repaired.zip` (26 entries, no .git)
Work target: a separately packaged project, version `0.11.1`; do not overwrite supplied baseline ZIPs.
Current status: v0.11.1 source repair tested (155/155); original AAA visual-overhaul requirement remains BLOCKED on missing npm build and unavailable browser/device proof.

## Purpose and invariants
- Preserve the 3D kingdom, procedural architecture, hand cursor, ten miracles, local restoration, gesture recognition, camera controls, configurable quality, audio, and optional Playground SDK integration.
- Maintain source portability: Vite + React + R3F + Rapier, no new runtime dependency without evidence.
- Preserve pure deterministic world transitions and meaningful, reversible weather/environment consequences.
- Existing baseline: 18/18 isolated regression tests and 15/15 TS/TSX syntax parses passed on 2026-10-10. These are not browser validation.

## Known gaps at baseline
- No in-world persistent material-field model or means to inspect consequences.
- World tick accumulates variable intervals rather than fixed 0.5 s environment steps.
- Independent physics solver runs on separate scheduling; high-speed parity unverified.
- Actual npm install, browser rendering, desktop/mobile input usability, and GPU metrics unverified because registry unavailable.
- No Git repository in local ZIP; never invent a remote, branch, or push result.

## Authorized uplift slice
- Add lightweight bounded environmental fields (heat, moisture, frost, ash, stone) with physically legible interactions.
- Couple the field to existing vegetation/building fire and damping mechanics.
- Render persistent consequences with one instanced surface, add a discoverable inspect tool and event chronicle with factual descriptions.
- Make environmental ticking fixed-step/capped, add deterministic regression and quality comparison tests.
- Maintain prior source ZIP and publish a new versioned download only after checks.

## Validation contract
- Baseline regression remains passing; add environmental causality, determinism, reset/restore, boundaries, no-op and inspection tests.
- Parse all modified TS/TSX sources; type-check pure TS modules when tooling permits.
- Attempt full app compile/build only when dependencies are available, else mark not verified.
- No claims of improved FPS without matched before/after browser measurement.

## 0.3.0 uplift record (2026-10-10)
- **Implemented-unverified in browser:** `environment.ts` 32x32 surface channels (heat, water, frost, ash, stone), local casting and restoration, fixed 0.5 s climate ticks, ecological coupling, `EnvironmentalMemory` instanced renderer and afterglow, safe Inspect mode, 300-entry bounded session chronicle and JSON export.
- **Verified with isolated execution:** 35/35 Node regression tests (18 baseline + 17 new), including quenching/stone deposition, deterministic diffusion, local restoration, fire-linked ash deposits, ecology coupling, desktop click arbitration and touch tap isolation.
- **Verified static:** 18 TS/TSX source files parsed without diagnostics, pure TypeScript modules passed global `tsc` strict check.
- **Measured narrow performance:** 600 Node.js isolated field steps, median about 0.32 ms and p95 about 1.38 ms in this container; not in-browser frame rate.
- **Still unknown:** Vite build, full TS typecheck with actual packages, WebGL/Rapier visual and interaction behavior, iPhone/Android ergonomics, GPU resource use, measured FPS improvement, hosted Playground parity.
- **Not applicable:** Git branch, commit, upstream and push; ZIP contains no `.git` directory and no remote identity.
- **Required next evidence:** Install declared dependencies where registry is available, then `npm run build`, launch the game, test Volcano -> Wave -> Inspect -> Restore, repeat regeneration, validate desktop/touch double-click behavior, and profile a representative device.

## 0.4.0 continuity and habitation record (2026-10-10)
- **Implemented but not browser-verified:** `continuity.ts` reproducible seed layout, versioned and bounded kingdom save/parse, local autosave and exit checkpoint, portable world import/export, scored and historical state restoration, pending meteor continuation, baseline structural compatibility check. `hazard.ts` pure terrain-aware evacuation guidance and Game.tsx integration for existing inhabitants and animals.
- **Memory/renderer lifecycle:** EnvironmentalMemory and geothermal light also detect field identity replacement (not just revision), and generated canvas textures have explicit unmount disposal. NPCs remount on a new seed/reset, avoiding inherited wander positions on kingdom regeneration.
- **Verified isolated:** 48/48 regression checks; TypeScript strict checks for pure environment, simulation, continuity and hazard modules; 20/20 TS/TSX syntax parses. CPU microbench for local save/parse and inhabitants' hazard decision available via `npm run benchmark:continuity`.
- **Preserved:** original authored procedural castle/village, source art/textures, ten miracles, gesture and camera controls, score recording, local restore, fixed environment tick and effects.
- **Unverified/blocked:** complete build and browser experience; physical device input, GPU and memory-lifecycle proof, full restoration in Chromium, rendering quality, localStorage behavior under quota/private mode. No offline simulation, NPC-position persistence, exact physics debris replay or terrain-mesh deformation.
- **No Git authority:** the supplied source was a ZIP without `.git`; no branch, commit, push, CI or deployment can be claimed.
- **Next decisive validation:** Run `npm install && npm run build && npm run dev` on an npm-connected machine. Cast meteor/volcano/wave, save/export, refresh/import, verify actual scene state, camera/touch, and profile; inspect after 20+ minutes.

## 0.5.0 temporal branching and render-path uplift (2026-10-10)
- **Current baseline:** v0.4.0 user-facing source ZIP; this work produces a new v0.5.0 ZIP without changing the original.
- **Implemented but not browser verified:** `timeline.ts` supports bounded session-only snapshots, causal parent deltas and branching without deleting surviving earlier futures. `App.tsx` Time Atlas binds snapshot creation to authentic world checkpoints/events, permits manual anchors, restores actual serialized world state, pauses a rewind, and retains pre-existing `primordial-world-v1` save compatibility.
- **Reliability:** imports must match live canonical geometry before any storage/write mutation; concurrent and stale file reads are rejected; obsolete scene checkpoints are rejected using an epoch token even when world seeds match. Invalid local capture cannot replace a known-good save.
- **Source-level render improvement:** hover hand and mandala use shared mutable Three position refs; Scene no longer updates React state for pointer position each frame. Previous-position vector reused in hand animation.
- **Preserved:** all v0.4.0 entities, catastrophe roster, gesture input, material-field simulation, playable camera controls, valid local saves and portable world imports.
- **Proof state:** isolated regression suite and pure-module typecheck are required on final ZIP; total browser compilation, WebGL display, mobile interactions, physics parity, actual FPS and memory-resource behavior are still unavailable here because npm registry DNS cannot resolve and runtime dependencies are absent.
- **Future work:** complete dependency-enabled build and representative desktop/mobile journey. Check Time Atlas genesis -> volcano -> wave -> rewind -> fork, verify ground/structures/score and no stale particle/terrain state. Confirm no regressions after 20+ minutes.
- **Git:** no checkout/branch/upstream exists inside the ZIP; do not claim or attempt commit/push without resolving a real repository target.

## 0.6.0 twelve-change uplift (2026-10-10)
- **Baseline:** user-received `primordial_engine_3d_uplift_v0.5.0.zip`; 40 entries, source had no .git. An interim 0.6 folder held earlier documentation only, so all code changes in this package were reconstructed from and checked against the exact v0.5 ZIP.
- **Implemented, browser unverified:** `forecast.ts` nonmutating production-rule projections, cast world bounds; quantified inspector; `weather.ts` time/seed deterministic winds and directional fire; seeded-regrowth state persisted as optional `regrowth` in v1 world files; x=0 runoff; memory filter; lineage-safe timeline pruning; previous causal anchor restore; `vault.ts` with three protected localStorage slots; smaller-screen exclusive panels and Escape dismissal.
- **Source-level protection:** full original cast roster, scoring, world material fields, Time Atlas, v1 save imports, NPC hazards, renderer ownership and original 3D artwork are preserved. No new runtime dependencies were introduced.
- **Verified, limited:** 79/79 focused Node regression tests; 24 TypeScript/TSX parse checks; strict pure-module TypeScript check; archive cold-extraction and SHA checks required before delivery.
- **Unverified:** full `npm run build`, runtime rendering, real desktop/mobile input, actual persistence under privacy/storage quotas, in-browser WebGL performance/FPS, 20-minute resource lifecycle, Rapier speed parity. Registry lookup fails DNS `EAI_AGAIN`; packages unavailable.
- **Not applicable:** Git branch/commit/push; ZIP source carries no .git. Preserve all earlier ZIP releases.
- **Next decisive evidence:** npm-connected `npm install && npm run build && npm run dev`, play Forecast → Volcano → Wave → Inspect → Save slot → undo → restore slot, simulate long-session/memory, test mouse and touch.

## 0.7.0 gameplay covenant (2026-10-10)
- **Canonical baseline:** supplied and verified `primordial_engine_3d_uplift_v0.6.0.zip`. No repository metadata; deliver a new ZIP, never overwrite or rename earlier releases.
- **Implemented but not browser verified:** `trial.ts` supports an opt-in three-act campaign (grove wildfire containment, magma quenching + bridge protection, post-impact castle restoration), resource-limited player casting, simulated incoming threats, genuine impact milestones, deadlines, mission score and victory/defeat. Game.tsx schedules hazards through existing actual miracle and pending-meteor paths, and renders one objective beacon. App.tsx adds challenge onboarding, tactical HUD/collapse, power cost, focus, session score and locally stored victory best.
- **Protected:** Free sandbox remains the default. Ten powers, gesture handling, environment, world saves, Time Atlas, vault, mobile input, 3D procedural assets and scoring are not replaced. Trial is **session only**; kingdom saves retain `primordial-world-v1` schema. A live trial locks Time Atlas rewind and restores the pre-trial speed/force after ending; importing/regenerating a world ends the trial. Rejected imports leave active trial untouched.
- **Source-verifiable:** 92/92 isolated regressions covering prior behavior + actual three-act scenario with five seeded realms; syntax parsing and strict pure-module TypeScript to be rerun on packaged artifact. React/Three/Rapier rendering has not been observed or playtested on target hardware.
- **Environment blocker:** registry DNS `EAI_AGAIN` prevents npm dependency installation; `npm run build` cannot prove type safety or browser behavior until dependencies are available. No measured browser FPS delta.
- **Next proof:** Install packages in an npm-connected Node 22 environment; build; play a challenge from village, cast wave after forest ignition, quench magma at bridge, restore bridge, wait for meteor to hit and restore castle. Validate pause/Resume, focus, small-screen panel, progress, win/loss, high score, and return-to-sandbox controls. Inspect WebGL/physics lifecycle after extended play.

## 0.8.0 Witness & Consequence integrity pass (2026-10-10)
- **Active predecessor:** delivered `primordial_engine_3d_gameplay_v0.7.0.zip` (no Git checkout). This uplift is an independent copy; preserve every previous release artifact. Primary evidence is the final v0.8 ZIP cold extraction and `V080_REPORT.md`.
- **Implemented; browser unverified:** `trial.ts` verifies meaningful before/after targeted defensive impact; local post-threat wave quench; peak harm observation, real completion constraints, stage-by-stage S/A/B/C/F report, source-grounded tactical signals and specific next-action advice. `Game.tsx` records true before/after state, separates sandbox scoring, snapshots/reconstructs the same world substrate for replay, forbids casts after completed trials. `App.tsx` adds optional tactical SVG, once-per-ordeal focus, grade ledger and offline JSON report; rewind/retry cancels stale queued actions and resets the chronicle.
- **Verified in isolation:** baseline 92 tests plus 17 new fixtures (109/109); strict standalone simulation TypeScript check; 26 TS/TSX syntax parses. ZIP integrity, source SHA matching, removal-free delta and same-checks-from-extracted-archive required at handoff.
- **Measured narrow tradeoff:** identical 155-tree/93-structure pure trial-view microbenchmark: baseline median ~24.44 microseconds/read, modified median ~26.72 microseconds/read (about 9% higher on one local run), p95 25.67 vs 29.65. Deliberate factual signal/advice cost; no browser/frame-rate improvement claimed.
- **Protected:** unrestricted sandbox; original ten miracles, gesture/touch/camera, authored procedural scene, immutable environmental field, Time Atlas, vault, existing `primordial-world-v1` save/restore, 0.7 challenge mechanics and prior source ZIPs. No new runtime packages.
- **Still unknown/blocking production closure:** npm registry DNS `EAI_AGAIN`, cannot install React/R3F/Rapier/Vite types or prove full bundle; 3D rendering, browser UI, challenge feel, physical input/mobile, GPU/audio, long play remain unverified. Saved world does not persist trial score/timer. Challenge replay does not rewind NPC positions or physics debris. No Git metadata/upstream; no source commit/push/deployment possible from ZIP.
- **Next decisive evidence:** dependency-enabled `npm run build`; browser mission playthrough I–III, no-op and remote spell checks, saved-world reload, failed-ordeal Retry vs Return to sandbox, after-action download, real mobile map layout/accessibility, resource tracking during extended play.
- **Delivery receipt:** extracted v0.8.0 release was rechecked: 109/109 tests, 26/26 source parsing, strict pure-module `tsc`, all 48 payload SHA-256 digests and ZIP integrity PASS. Full Vite compilation remains BLOCKED (`TS2688 vite/client` because package registry DNS `EAI_AGAIN`). Browser/gameplay NOT VERIFIED; final report `V080_REPORT.md` is controlling on this pass.

## 0.9.0 The Witness Account (2026-10-10)
- **Authoritative predecessor:** exact shipped `primordial_engine_3d_gameplay_v0.8.0.zip` extracted into a new independent worktree; all older releases preserved. ZIP carries no `.git`, branch, remote or CI context.
- **Implemented, browser unverified:** `trial.ts` tracks direct player-caused off-objective tree/structure harm, bounded geographic evidence, transparent capped grade liability and applied penalty per ordeal; no fictional person/casualty counts. Opponent events and secondary fire remain distinct. The live map/HUD/after-action JSON and actual chronicle disclose this harm.
- **Physics-rule repair:** `forgeStoneFormed` counts newly solidified bridge-area ground cells, rejecting offsite stone generated inside huge Waves. Verdict defers until any player-launched meteor in flight actually impacts; casts cannot continue past the deadline, and late impacts cannot retroactively win.
- **Lifecycle uplift:** `SwayingForest` registers existing tree meshes under one R3F `useFrame` subscriber rather than one per tree. No art or tree construction changed. Only source-level proof; real FPS still unknown.
- **Preserved:** original ten miracle roster, free sandbox, three timed ordeals, authored 3D assets, gestures, camera and touch controls, world memory, Time Atlas, vault, forecast, `primordial-world-v1` schema, deterministic simulation and historic ZIPs.
- **Validation from working source:** 120/120 isolated tests, 26/26 TS/TSX parses, strict pure-module TypeScript PASS. Full `npm run build` exits `TS2688` (missing `vite/client`) and npm DNS registry `EAI_AGAIN` remains observed; browser/device/GPU/audio and long-session evaluation UNKNOWN. Final ZIP must pass fresh extraction, file hash verification and replayed checks.
- **Benchmark:** v0.8 and v0.9 matched 155-tree / 93-structure trial-view CPU-only benchmark spans about 27 to 29 microseconds per read in repeated local runs; v0.9 added accountability metadata incurs slight and variable overhead. No browser frame rate claim. Single forest frame subscription verified structurally only.
- **Git/delivery:** no source Git metadata, so commit/push/CI/deployment not applicable. Drive archival requires unambiguous canonical root and an actual provider upload receipt.
- **Next decisive proof:** dependency-enabled install/build, then desktop and phone playthrough: collateral vs threat, local bridge forge, meteor spanning attempted completion, short and long world-simulation sessions, 3D forest burn/regrow, app performance and accessibility. Do not declare production PASS before this evidence.

## 0.10.0 Field Atlas visual finishing pass (2026-10-10)
- **Baseline:** existing v0.9.0 ZIP (50 project entries), no Git metadata. All former project files are preserved; produce a separate v0.10.0 ZIP and keep v0.9.0 intact.
- **Protected:** original 3D god-game perspective; castle, village, wildlife, forest, shrine, ten miracles, gestural/touch/desktop controls, camera, actual weather/environment impacts, Covenant, Time Atlas, session chronicle, vault and `primordial-world-v1` save schema.
- **Implemented; browser not yet verified:** `visualDirection.ts` seeded, bounded landscape/cloud placements and skyline heights; `Game.tsx` weather-graded sky, true scene fog, sculpted mountain ridges, instanced cloud strata and scattered shoreline details, roof/spire geometry, moving bird wing silhouettes, corrected river foam, refined tornado/lightning/meteor FX, smooth NPC turns, tiered shadows/DPR/postprocessing, bounded lights and cosmetic animation cadence; `App.tsx` and TrialTacticalMap reworked into one ink/brass cartographic UI.
- **No gameplay authority shift:** decorative meshes have no colliders; targeting remains the authoritative ground-plane intersection. All gameplay logic, original saved structure IDs, power definitions, physics rules, and trials stay unchanged. No additional third-party dependency or external art is introduced.
- **Proof:** final cold ZIP extraction, 136/136 Node regressions and 27 TS/TSX syntax parses, strict standalone TypeScript checks including visual-direction code, deterministic tier and reserved-zone tests, budgeted Node scenic generation benchmark. Browser view, visual quality, controls and real GPU/CPU frame-time measurements remain **unknown** until dependency-enabled runtime testing.
- **Known blocker:** `npm run build` stops at `TS2688` (`vite/client` unavailable); `npm ping` fails DNS `EAI_AGAIN`. No branch/upstream in packaged source; Git and CI claims are not applicable.
- **Next decisive proof:** On npm-connected machine run `npm install && npm test && npm run build && npm run dev`. Inspect original kingdoms at three graphic tiers on phone/tablet/desktop. Exercise all ten powers and three trials, rewind/restore, verify responsive UI and 20-minute GPU resource lifecycle. Do not call the visual finishing pass production-certified until screenshots and frame-time data exist.

## 0.11.0 Living Field Atlas verified source record (2026-10-11)
- **Baseline:** SHA-256 `c3c7a54b833c3f9b1ed9894ac6113cb3d637bb970f70ea8eba19ff7f597c85b5` is the exact 0.10.0 ZIP, 54 entries. Its original source and historical reports remain untouched.
- **Implemented in source, rendering unverified:** house facade instancing tied to surviving `v_house_w_*`; solid iron castle gate; state-driven battlements, roof caps and persistent ruins; four outside-boundary escarpments; animated river glints; cloth banner with stationary pole; smoother bounded camera recoil and reduced-motion support; horizontal horse bodies / more legible small actors; seeded repeatable PBR grain; quality-scaled ambient point lights.
- **Authority boundaries:** no changes to `simulation.ts`, `trial.ts`, `environment.ts`, input system, App controls, save format, checkpoint logic, Rapier colliders, or original scenery material identities. Visual additions read canonical blocks rather than becoming new game entities.
- **Evidence:** 151/151 isolated regression tests (136 baseline plus 15 targeted), 27/27 TS/TSX sources parse, strict pure TypeScript check PASS. 52 relative imports resolve. CPU visual-layout benchmark in container: median approx 0.258/0.418/0.616 ms for low/medium/high, an **added** setup cost, not an FPS gain.
- **Unverified mandatory gates:** full TypeScript/TSX build blocked at missing vite/client package; npm registry unavailable. No real R3F/WebGL screenshot, playthrough, camera/gesture QA, mobile FPS or long-session leak proof. Mark commercial/AAA quality and user-visible functionality **UNVERIFIED**, despite source coverage. Actual scene needs browser verification, after which correct discovered defects and rerun packaging.
- **Git:** No .git metadata inside source ZIP; branch/remote/commit/push/deployment unavailable, not claimed.
- **Continuation:** Cold-install pinned npm dependencies on a network-connected machine, typecheck/build, inspect staged scenes in VISUAL_DIRECTION.md across all camera presets and disaster states, measure matched v0.10 vs v0.11 GPU data, repair any runtime defects before certifying.

## 0.11.1 recursive-repair evidence (2026-10-11)
- **Baseline:** exact v0.11.0 ZIP; new 0.11.1 correction kept separate. Original complete AAA visual task is still BLOCKED: full npm build and browser/device visual verification cannot execute, no commercial-quality claim authorized.
- **Source defects fixed:** simulation-clock-only recoil freezes camera shake when paused; quality `low` retained up to three calamity point lights; primed divine-hand orb retained an unconditional low-tier point light; birds/forest/river/idle hand did not honor the preexisting reduced-motion preference consistently. All modified code remains cosmetic.
- **Source proof:** 155/155 Node regressions; 27/27 TypeScript parse checks; strict pure TS module check; 52 relative imports resolved. Original mechanics/world state/input and v1 saves not changed. New bundled requirement matrix in `RECURSIVE_REPAIR_REPORT.md`.
- **Blocking requirement:** `npm run build` fails TS2688 missing `vite/client`; npm ping EAI_AGAIN. No R3F/WebGL visual evidence, mobile input/gameplay, device FPS, or 20-minute lifecycle proof. The required fresh complete verification gate cannot pass.
- **Git:** archive is not a Git checkout; no branch/commit/push. Do not invent or initialize one.
- **Continuation:** npm-connected install; full TSX build; run desktop/mobile visual scenario matrix; check 10 miracles, 3 trials, Time Atlas, restores, 3 quality tiers and reduced motion; fix observed defects and begin an independent original-task verification pass.

## GitHub Pages publication setup (2026-10-11)
- Remote source target: `westkitty/Primordial-Engine-3D`, `main`; source now lives in GitHub, unlike earlier ZIP-only reports.
- Added `.github/workflows/pages.yml` to run `npm test`, `npm run syntax`, and the full dependency-enabled Vite build with base `/Primordial-Engine-3D/`, then deploy only the generated `dist/`.
- Pages site initial state observed on the repository API as `has_pages: false`; selection of **Settings > Pages > Source: GitHub Actions** may still be required to enable the site. The default workflow token cannot perform the one-time Pages enablement.
- Do not mark live deployment/playability verified unless a successful Pages Actions run and the hosted game have been inspected. If a CI build reports TS/R3F defects, repair them in a separate bounded pass before claiming a live release.
