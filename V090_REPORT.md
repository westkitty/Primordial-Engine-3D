# Primordial Engine 3D v0.9.0 — The Witness Account

**VERDICT: SOURCE-IMPLEMENTED AND ISOLATED-TESTED; PRODUCTION CERTIFICATION BLOCKED.**

## Controlling contract and preserved purpose
- Continue the existing god-game sandbox; deepen consequential gameplay, awe and authored coherence without replacing the underlying game or breaking existing behavior.
- Protected from v0.8.0: procedural 3D kingdom, ten miracles, direct sandbox, the optional three-stage Covenant, immutable world transitions, seeded map, persistent five-material ground, Time Atlas, save slots, versioned world import/export, gesture/touch/camera controls and existing art.
- The incoming omniprompt calls for actual uplift plus fresh adversarial verification; a successful test suite cannot substitute for browser, build or target-hardware behavior.

## Material changes and causal proof

| Observed problem | Intervention | Improvement | Proof boundary |
|---|---|---|---|
| Winning ignored player-inflicted harm elsewhere | Pure `trialRecordCollateral` compares actual pre/post player-cast entities outside objective, stores bounded geo marks and penalties | Choices have an attributable, inescapable cost, even after healing | Direct before/after simulation tests; UI wiring source inspected; browser unverified |
| Inaccurate grading copy under high damage | Separate raw harm from applied penalty, cap potential penalty at 420 and report awarded score delta | The post-trial score tells the truth | Penalty fixture checks actual score difference and limit |
| Tactical interface omitted own damage | Amber crosses for actual off-objective sites, contextual line and after-action fields | Actual on-world harm is legible at location and in chronology | Source integrations; visual quality not runtime-verified |
| A wide Wave could claim stone created far from the bridge | `forgeStoneFormed` counts real newly crossed stone thresholds strictly within 12 world units of bridge | Forge challenge has geographic physical meaning | Hot/quenched local and remote grid fixtures |
| Launched player meteors could land after a stage completed | `trialStep` receives pending player impacts and delays finalization until they land; deadline remains binding, late spells blocked | Recorded results cannot evade their pending causes | Two deterministic verdict/cast fixtures and Game source wiring |
| Each tree subscribed to a per-frame callback | `SwayingForest` batches all existing tree sway into one `useFrame` and keyed reference registry | Removes ~155 frame subscription callbacks without replacing authored trees | Source-level single-callback invariant; browser FPS not measured |

## Gameplay / awe impact
- The campaign can award a victory while making clear that the player's miracle harmed structures and trees away from the objective. The account is deliberately *not* a claim about living casualties; actual NPC deaths or a civilization economy do not exist in this build.
- The same stage shows imminent danger, actual damage, off-target marks, and grades that penalize direct reckless interventions. Player actions are different from opposing catastrophes and secondary spreading fire.
- The forge checks local physical transformation rather than generic event counters, and falling meteor impacts remain causal even across a stage boundary.
- Existing procedural textures/models retained; no unvalidated asset replacement or speculative new visual theme was introduced.

## Quality delta (v0.8.0 -> v0.9.0)
- **UI:** Tactical SVG adds distinct player-harm evidence; direct source contract verified, browser layout **unverified**.
- **WOW:** More consequential and morally ambiguous objective play; experiential awe **unverified** without playtesting.
- **Backend:** Genuine off-target damage comparison and bounded penalty; remote-forge and airborne-projectile exploits closed with isolated tests.
- **Assets:** Exact authored geometry/texture assets retained; tree animation ownership consolidated, without claiming rendered visual improvement.
- **UX:** HUD and after-action grade distinguish potential score cost, actual penalty, opposing threats and past harm. Keyboard/mobile interactions still need runtime proof.
- 0–4 numeric scores intentionally omitted for unobserved visual/experiential domains.

## Validation / before-after evidence
- v0.8.0 baseline extraction, `npm test` -> **109/109 PASS**, `npm run syntax` -> **26/26 PASS** (observed before edits).
- v0.9.0 source, `npm test` -> **120/120 PASS**, covering additional causal, geographic, score and lifecycle invariants.
- `npm run syntax` -> **26/26 PASS** (TS/TSX parse only).
- `tsc --noEmit --strict --target ES2020 --module esnext --moduleResolution node --lib es2020,dom trial.ts simulation.ts environment.ts types.ts continuity.ts timeline.ts forecast.ts weather.ts hazard.ts vault.ts` -> **PASS**.
- `npm run build` -> **BLOCKED**, `TS2688: Cannot find type definition file for 'vite/client'`. The `node_modules` package tree was absent and registry access failed DNS `EAI_AGAIN` in this environment. No full React/R3F/Rapier typecheck, Vite bundle or browser run succeeded.
- Matched pure Node microbenchmark (`tests/benchmark-covenant.cjs`) for 155 trees / 93 structures, 2000 reads per batch, repeated three times: baseline medians 27.16, 27.15, 28.30 microseconds; v0.9 medians 28.94, 28.52, 27.14 microseconds. Small variable trial-read overhead; **not an FPS/GPU measurement**.
- One `useFrame` for the forest instead of a callback per tree is inspectable in source; the claim of faster rendering has **not** been proven.
- Release ZIP to be independently extracted and checked. No Git metadata exists in supplied ZIP, so no Git SHA/branch, commit, push, CI or deployment claim is possible.

## Scope / file ledger
- Changed gameplay: `trial.ts`, `Game.tsx`, `App.tsx`, `components/TrialTacticalMap.tsx`.
- Changed proof: `tests/run-tests.cjs`, `tests/benchmark-covenant.cjs`.
- Changed metadata: `package.json`, `README.md`, `OPERATIONAL_STATE.md`, `V090_REPORT.md`, `RELEASE_MANIFEST.json`.
- All earlier files and historical reports retained; `continuity.ts`, `simulation.ts`, `environment.ts`, V1 save schema and original assets untouched.

## Requirements and blockers
- **Verified in source:** actual uplift rather than wishlist; bounded causal model and region-specific forge; in-source original features; 120 test checks; strict standalone TypeScript; versioned package planned.
- **Unverified mandatory production behavior:** Vite build, actual desktop/mobile game runtime, responsive layout, accessibility in browsers, scene parity, WebGL context lifecycle, audio, long play and matched FPS. Do not declare full PASS.
- **Git:** NOT APPLICABLE to the ZIP source; no upstream, branch or configured remote was invented.
- **Drive:** requires authoritative destination and provider-confirmed write; no archival claim without evidence.

## Reproduction steps in a dependency-capable environment

```bash
npm install
npm test
npm run syntax
npm run build
npm run dev
```

Play all three ordeals with a safe wave, then a reckless off-target meteor, view the witness crosses, restore the site, and inspect the grade. Forge close to and far from the bridge; use a meteor with impact pending at the moment a stage would otherwise clear. Re-test world saves, Time Atlas and the original sandbox. Profile draw calls, forest frame time and memory over a long session on desktop and mobile.

**FINAL PROOF STATE:** verified source-level improvement, **production BLOCKED**, not a shipped playable web deployment.
