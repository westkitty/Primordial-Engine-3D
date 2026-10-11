# Primordial Engine 3D — v0.5.0, The Forking Hours

Date: 2026-10-10

## Verdict

**VERIFIED INCOMPLETE.** The 0.4.0 project source was extended, the isolated regression suite passes, and the new archive is reproducible. The full application TypeScript/Vite build cannot finish because required npm dependencies and `vite/client` types are not installed, and registry DNS lookup fails in this container. No desktop/mobile/WebGL proof or Git publication can be claimed.

## Controlling source

- Baseline: `primordial_engine_3d_uplift_v0.4.0.zip` supplied by the current conversation. Not a verified Git checkout.
- Current user instruction: make the existing project meaningfully more coherent, consequential and robust, preserve working identity, validate against the actual work, and stop honestly at unavailable mandatory proof.
- Protected: all ten powers, procedural kingdom identity, PBR art, camera and gesture controls, score and chronicle, ecological simulation, 0.4.0 `primordial-world-v1` save/import contract, offline suspension semantics, and original source files.

## Main transformations (observed source → intervention → inspectable effect)

1. **Temporal Atlas / The Forking Hours:** `timeline.ts` records bounded validated world snapshots as immutable strings. Causal parent IDs, signed deltas, seed isolation, retention caps and branch IDs protect earlier futures from a rewind. The `Time Atlas` panel allows manual anchors and a rewind of an actual world snapshot. Rewinding uses the existing `restoredKingdom` engine path, restores material/structure/cooldown/score/chronicle state, discards transient rubble, and pauses until resumed. This is not a video replay or a full reversible rigid-body simulation.
2. **Reliable restore and import:** A scene-generation token rejects late checkpoints even when the same seed is restored; the actual source block geometry must match imported JSON before it replaces either the live world or the previous local save. Concurrent imports are discarded when their initiating epoch or file-read request becomes obsolete. App-produced checkpoints are round-trip validated before overwriting a known-good save.
3. **Rendering-hotpath repair:** Divine hand and mandala now follow an imperative shared world-space position ref inside `useFrame`, removing the hover-driven `setState` that could rerender the entire scene each pointer update. Hand-follow animation reuses its previous-position vector rather than allocating a new Vector3 every frame. No new visual asset, model, or runtime package was introduced.
4. **Causal legibility:** History anchors show fallen structures, burned trees and affected terrain cells with signed changes relative to their parent. Branching is displayed without generically replacing the original dark miniature-world interface.

## Quality delta (not subjective numerical scoring)

| Domain | v0.4.0 baseline | v0.5.0 source delta | Evidence boundary |
|---|---|---|---|
| UI | World Memory and Save controls | Time Atlas with branch-aware anchors and signed consequences | JSX/CSS wiring checked; rendered visuals unverified |
| Experience | Persistent kingdom state, but no reversible history | Rewind to valid kingdom checkpoints and explore alternate outcomes | Pure branch tests pass; actual user journey unverified |
| Backend | Version-one world persistence | Snapshots validated before store, geometry gate before import, stale-epoch import/checkpoint cancellation | Isolated tests + source integration checks |
| Assets | Generated PBR textures, divine hand and summoning glyph | Same assets preserved; pointer path no longer forces scene reconciliation | Source diff / syntax; visual and lifecycle profiling unverified |
| UX | Save, Export, Load and Regenerate | Discoverable time control, manual anchor, causal comparisons, paused restoration | Source/UI accessibility attributes inspected; device usability unknown |

## Measured narrow performance

`npm run benchmark:timeline` exercises one valid timeline anchor for a 120-structure, seeded-forest world with a 32×32 geothermal field. On this container in Node.js it took approximately **1.22 ms median, 1.94 ms p95** across 60 post-warmup runs, 29,968 serialized characters. This is an **added cost** of recording a validated anchor, not a speedup over v0.4.0.

A previous hotpath React state update on pointer movement was removed from the source, but no full React reconciliation or browser frame-time benchmark is available. Do not claim an FPS, GPU, memory, loading or input latency improvement from these source-only findings.

## Checks actually executed

- `npm test`: **60/60 PASS** (48 v0.4.0 baseline + 12 added targeted validations).
- `npm run syntax`: **21/21 TS/TSX files parse, zero parse errors**.
- `tsc --strict --target es2022 --module esnext --moduleResolution bundler --noEmit --skipLibCheck --lib es2022,dom environment.ts simulation.ts continuity.ts hazard.ts timeline.ts`: **PASS**.
- `npm run benchmark:continuity`: **PASS**, isolated CPU measurements only.
- `npm run benchmark:timeline`: **PASS**, isolated CPU measurements only.
- `npm run build`: **BLOCKED** at `TS2688: Cannot find type definition file for 'vite/client'`. Required npm dependencies absent, DNS lookup `registry.npmjs.org` returns `EAI_AGAIN`.
- Full TypeScript checking with React/R3F/Rapier, actual Vite production output, browser rendering and mobile physical input: **NOT VERIFIED**.

## Regression evidence and limits

- Original source files from 0.4.0 are retained; no pre-existing file is removed.
- Direct immutable JSON roundtrips test that historical state includes real scores, structures, vegetation and geothermal fields. Same-seed forks keep earlier futures while new anchors go to the new branch. Older format-one saved worlds still parse.
- Branches are session-only, bounded to 12 anchors and 2.4 million serialized characters. Older anchors may be evicted; an exported **individual world** persists, not the complete historical atlas.
- NPC exact positions, settled rubble and particle trajectories remain outside the saved-state contract.
- No added fluid simulator, terrain collider deformation, full civilization AI, camera replay, browser visual QA, or soundscape overhaul. These remain separate future project phases.

## Delivery and Git

The artifact is a new standalone ZIP, not a Git checkout. There is no `.git`, branch, HEAD, remote or upstream to commit/push. No deployment or CI run was performed; no source-of-truth repository was invented. `RELEASE_MANIFEST.json` records the packaged file hashes and change set.

## Real-world acceptance journey still required

On a machine able to install the pinned packages: run `npm install && npm test && npm run build && npm run dev`. In browser, test genesis anchor → volcano near village → local fire evolution → wave cooling → Time Atlas → rewind to genesis → resume → try an alternate miracle. Verify visible castle damage, vegetation, ground scars, score, cooldowns and event history return to the selected state, then that earlier future remains selectable while the cap allows. Import an incompatible save and confirm the current scene/local save remain intact. Compare mouse and touch controls, pause/reload behavior, rendering on multiple quality tiers and prolonged GPU memory behavior.

**Closure state:** source-level change set verified; production signoff **BLOCKED** on dependency-enabled runtime/visual proof.
