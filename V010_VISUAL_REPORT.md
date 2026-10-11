# Primordial Engine 3D v0.10.0 — Visual Overhaul Verification

**VERDICT: VERIFIED INCOMPLETE / PRODUCTION VISUAL CERTIFICATION BLOCKED.** A substantial, integrated source-level art-direction and rendering pass is present. Browser screenshots, visual gameplay assessment, responsive device proof, full dependency-enabled build, frame-time measurement, and final AAA-grade quality are **not** proven. Do not present this as an already playable hosted game or a commercial-release certification.

## Authority and baseline

- Direct source: user-supplied `primordial_engine_3d_gameplay_v0.9.0.zip` (SHA-256 `20c7db3e54537b845ed4a720c38d6422e7ce0bf236f1b84b8d4ee0b3233c317d`), 50 entries, no `.git` metadata.
- Framework and renderer retained: Vite / React 19 / React Three Fiber 9 / Three.js 0.180 / Rapier. No added npm dependency, remote font or unlicensed external art.
- Preserved primary user journey: select one of ten miracles, cast by click/touch/gesture into the actual physical kingdom, observe saved environmental and structural changes, inspect, forecast, restore, branch time, save/load, play the three Covenant ordeals. No modified world-save schema, gameplay rules, collision or gesture algorithms.
- Design contract: `VISUAL_DIRECTION.md`. Quality goal: a material, inhabited **weathered medieval diorama**, not photorealism or glossy generic sci-fi.

## Quality delta — v0.9.0 → v0.10.0

| Domain | Actual changes | Evidence strength |
|---|---|---|
| Playable 3D world | Gradient blue/brass/ember sky, explicit scene fog, three stratified mountain-ridge bands, deterministic non-colliding shoreline/ground fragments, seeded cloud banks | Source integration + pure data tests; rendered appearance UNVERIFIED |
| Environment/material | Pale mineral-blue moving river with narrow edge foam; smooth mound silhouettes; retained authored normal/diffuse maps, lower glare | Source inspection and texture ownership audit; live PBR appearance UNVERIFIED |
| Architecture/props | Gabled roofs on surviving village/citadel roof blocks, faceted tower spires, more natural bird wings/beat; original block identities and damage logic unchanged | 136 regression checks; no live geometry screenshot |
| Lighting/VFX | Lower overexposure, weather-matched key/fill/fog, bounded catastrophe lights, volumetric dust tornado and zigzag lightning, stone meteor with ember wake; no redundant tone-map pass | Source shaders/effects checked for wiring; actual WebGL rendering UNVERIFIED |
| Characters/motion | Smoothed visible NPC facing; immediate hazard movement and original animations untouched; idle presentation when paused; less frequent grass/dust updates | Logic / wiring checked, runtime smoothness UNVERIFIED |
| UI/UX | Unified matte ink/brass/paper typography and controls, tactical cartography consistency, pressed/focus/expanded states, min 44px touch controls, higher-contrast and reduced-motion CSS | DOM/CSS source checked; layout, keyboard/device QA UNVERIFIED |
| Performance | Original 128 mesh cloud puffs replaced with **two instanced mesh batches**, with budgets for each quality tier; static undergrowth batches, shadow map resolution limits and toned-down post effects | Draw-submission reduction inferred from source; no matched GPU or FPS evidence |

No numeric UI/art/awe scores are assigned without rendered representative screenshots and playtesting. The architecture, functionality and thematic identity are preserved at the source-and-isolated-test level, not certified in a browser.

## Important causal transformations

1. **Sky/world composition:** flat blue sphere plus excessively large individual cloud meshes → horizon-tinted dynamic sky, human-scale layered cloud banks and weather-matched distance fog; makes the kingdom occupy a plausible valley and maintains disaster legibility.
2. **Landmark silhouettes:** rectangular roof volumes → pitched roof geometry and roof-spire accents via old saved structure records; distinctive old kingdom buildings are retained instead of replaced with unrelated assets.
3. **Readability of disasters:** cyan tornado wireframes and an unbroken lightning pole → distinguishable dust funnel and bent lightning path; meteor becomes a faceted overheated rock while retaining its existing flight and impact schedule.
4. **Premium input surfaces:** translucent blue-gray HUD → one tactile, restrained ink/brass visual language. Buttons still dispatch the original handlers and keyboard and touch interaction contracts remain.
5. **Rendering cost discipline:** non-colliding seeded scenery generated per world/quality; geometric assets disposed on unmount; cloud effects grouped, 30/20 Hz cosmetic animation cadence, bounded cast lights, three preset graphics budgets.

## Bugs/risk surfaces identified and fixed

- Original sky was a flat sphere with fixed day color; dynamic weather and atmosphere now use one context-dependent palette and proper THREE.Scene fog assignment (not accidental group attachment).
- Original river used a wide foam rectangle across virtually all water; replaced with narrow edge strips preserving its active scrolling normal map.
- Original tornado/lightning VFX did not resemble their stated phenomena; their display geometry was changed without touching spell causality.
- Original roof `boxGeometry` silhouette was incompatible with pitched fantasy architecture; visible geometry now comes from current authoritative `StructureBlock.size`, without creating new gameplay collider state.
- New visual benchmark script initially conflicted with CommonJS's built-in `module`; repaired and rerun successfully.
- Visual CSS retains semantic buttons, focus-visible, small-screen settings and reduced-motion; no inert replacement controls.

## Validation performed on current implementation

- `npm test` → **136/136 PASS**. Baseline release had 120/120, now +16 art-direction, lifecycle, visual budget and integration checks. Includes all former gameplay protections.
- `npm run syntax` → **27/27 TS/TSX source files parsed**, 0 parse errors (baseline 26/26).
- `tsc --noEmit --strict --target ES2020 --module esnext --moduleResolution node --lib es2020,dom visualDirection.ts continuity.ts hazard.ts environment.ts simulation.ts forecast.ts weather.ts timeline.ts vault.ts trial.ts types.ts` → PASS. This is **pure-module type-checking**, not full TSX application checking.
- Relative TypeScript/TSX import references: **51 checked, 0 missing**.
- Matched pure environmental model benchmark (600 fixed 0.5-s ticks, same Node tool): baseline v0.9 median **0.1760 ms**, p95 **0.3681 ms**; new median **0.1751 ms**, p95 **0.3464 ms**. These tiny differences are within variable machine conditions and **do not** prove faster actual game rendering.
- Initial scenic-generation Node benchmark (350 world seeds per tier): median **0.415 ms low**, **0.889 ms medium**, **1.574 ms high**; 95th-percentile **0.600 ms / 1.110 ms / 2.144 ms**. This measures one-time coordinate computation, **not** Three.js geometry creation or GPU upload.
- `npm run build` → **BLOCKED**: `TS2688: Cannot find type definition file for 'vite/client'` (no project node_modules). `npm ping --fetch-retries=0 --fetch-timeout=6000` → **EAI_AGAIN** for `registry.npmjs.org`.
- Actual R3F/WebGL playthrough, screen capture, visual QA, mobile responsiveness, actual FPS, draw-call measurement, audio and long-session scene/resource disposal are **NOT RUN / UNKNOWN**. `VISUAL_DIRECTION.md` includes a concrete manual acceptance matrix.

## Files changed relative to v0.9.0

**Changed:** `App.tsx`, `Game.tsx`, `components/TrialTacticalMap.tsx`, `index.html`, `package.json`, `README.md`, `OPERATIONAL_STATE.md`, `tests/run-tests.cjs`, `RELEASE_MANIFEST.json`.

**Added:** `visualDirection.ts`, `VISUAL_DIRECTION.md`, `V010_VISUAL_REPORT.md`, `tests/benchmark-visual.cjs`.

**Removed:** NONE. All original 0.9.0 source, tests, historical reports and existing assets remain in the archive.

## Explicit original-request compliance / proof limit

| Requirement family | Current evidence | Status |
|---|---|---|
| Implement in actual existing playable project, not mockups | R3F Game.tsx and original App controls changed | Source integrated; runtime unverified |
| Unified non-photoreal art direction across game | Sky/terrain/landmark/FX/HUD changes; design contract | Implemented; visual outcome unverified |
| Atmospheric lighting, depth and shadows | Real scene fog, graded sky, quality-scaled shadow map, updated light colors | Implemented; rendering unverified |
| Animation feedback with preserved controls | NPC presentation smoothing, bird wingbeat, throttled grass/dust, original input methods intact | Logic and source tested; interactive behavior unverified |
| Context-specific FX | Tornado, lightning, meteor geometry with original event lifecycle | Source integrated; live effect unverified |
| Camera/control continuity | Same existing camera controller, controls and input pathways | Old regression suite PASS; playthrough unverified |
| Cohesive responsive HUD and accessibility | CSS, aria-pressed/expanded, focus, touch, reduced motion | Source integrated; real-device QA unverified |
| Low-end graphics and no heavy dependencies | Tier budgets, seeded instancing, limited shadows / lights, no new deps | Budgets verified; actual perf unverified |
| Full application build, live playthrough and visual QA | Dependencies unavailable; cannot produce R3F bundle/screenshots | **BLOCKED** |
| Git/CI/deployment delivery | Baseline is ZIP with no .git/upstream; no hosted target provided | NOT_APPLICABLE / not claimed |

## Remaining blockers and next decisive action

Install in a network-enabled environment with Node 22+:

```bash
npm install
npm test
npm run syntax
npm run build
npm run dev
```

Visually QA castle / village / sanctuary, close/far/overhead cameras, all ten spells, Covenant fire/forge/meteor states, meteor → wave → restore, Time Atlas rewind, import/export, and 360px phone + tablet + desktop. Sample real WebGL frame time and draw calls before/after on the **same scene/device**, check `renderer.info`, and measure a long session. Validate saving/reloading and all help and popup buttons. No release certification until this proof is obtained.

**Packaging:** the final v0.10.0 release uses a separate versioned ZIP, retains the original v0.9.0 predecessor, and includes a checksum manifest. Reproducible cold-extraction receipts are required before delivery.
