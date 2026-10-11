# Primordial Engine 3D - v0.11.0 Visual Finishing Report

**Verdict: VERIFIED INCOMPLETE.** An integrated, non-destructive visual source uplift has been implemented and tested as far as the available tooling permits. A dependency-enabled build and real WebGL gameplay/visual inspection remain required before AAA or full-playability certification.

## Authority / protected game
- Previous distribution: `primordial_engine_3d_visual_v0.10.0.zip`, SHA-256 `c3c7a54b833c3f9b1ed9894ac6113cb3d637bb970f70ea8eba19ff7f597c85b5`, 54 files; this release is separately versioned. No Git checkout, remote, branch, or upstream.
- Existing: R3F / Three 0.180 / React 19 / Rapier world, one shared fixed environment step, all ten miracles, mouse/touch/runes, camera, time manipulation, autosave/import/export, three protected vault slots, Covenant three-stage trial and consequences, original PBR maps and VFX. All are protected; no gameplay/persistence/collider edits were authorized or made.
- Visual identity: the same non-photoreal weathered medieval Field Atlas miniature, without extra package dependencies or outside licensed assets.

## Actual visual changes and causal value
1. **Inhabited houses:** front and rear timber framing, street doors, glazed windows and iron hardware now read from the original surviving `v_house_w_*` blocks and render as four instanced batches. A house that burns or shatters sheds its visible details; a restored/rewound wall recovers them.
2. **Citadel:** formerly wireframe portcullis is a solid 11-piece forged iron lattice with a stone portal; surviving castle wall/top IDs generate single-batch crenellations.
3. **Damage history visible in 3D:** destroyed castle, tower, village, bridge and mill blocks leave capped seed-stable rubble, driven by actual destruction flags. Restoration deletes rubble; it adds no new saved world field or collision.
4. **Original roof differentiation:** a neutral PBR tile base allows the existing distinct `block.color` for village roofs and castle tops; gabled silhouettes gain survivor-bound ridge caps with one batch.
5. **Horizon:** four perfect cone mountains are replaced by geometry-disposed low-poly escarpments, positioned beyond the game world's ±80 border; existing atmospheric far ridges retained.
6. **River:** one quality-scaled instanced stream-highlight layer follows the moving normal-mapped water (8/20/34 low/medium/high). Still nonphysical and disabled in reduced motion; flood/frost state remains authoritative.
7. **Weathered motion:** royal cloth pennant deforms at most 20 Hz while its pole remains stationary; camera shake now a bounded smooth waveform, disabled for reduced-motion preference; chimney smoke cannot survive its source building's destruction.
8. **Characters:** low-poly knight/peasant silhouettes get small uniform helmet, brim and tunic details. Horses now carry horizontal bodies and saddle placement rather than an upright cylinder. Limb and hazard movement code remains identical.
9. **Graphical stability:** procedural grass and stone PBR map grain uses an independent reproducible pseudo-random texture source. Low graphics now omits nonessential village/citadel/sanctuary dynamic lights while retaining their luminous mesh props.

## Code/asset integration
- Implementations are in `Game.tsx`, `visualDirection.ts`, `components/HumanoidCharacter.tsx`, `components/AnimalCharacter.tsx`.
- Tests: `tests/run-tests.cjs` and `tests/benchmark-finishing.cjs`.
- `package.json` version 0.11.0, new `benchmark:finishing`; `README.md`, `VISUAL_DIRECTION.md`, `OPERATIONAL_STATE.md`, current report/manifest updated. No new npm dependencies, raster art, network font, source replacement or save schema changes.
- Existing decorative geometry and previous visual improvements are preserved. Geometry disposal is explicit for generated escarpments; other new primitive geometries/materials are owned by R3F and unmounted with their components. New detail instances are updated before first paint (`useLayoutEffect`); independent collision meshes are not introduced.

## Verified checks (current source)
- `npm test`: **151/151 PASS**, against the previous 136/136. Targeted tests cover surviving/destroyed/restored facade and crenellations, roof fidelity and identity, source-anchored ruins across seeds/quality tiers, canyon edge profiles, river placement, batch integration, no wireframe gate, source smoke dependency, smooth/reduced camera, deterministic PBR textures and retained actor animation.
- `npm run syntax`: **27/27 TS/TSX sources parsed**, zero parse errors.
- `tsc --strict --target ES2020 --module esnext --moduleResolution node --noEmit --lib es2020,dom visualDirection.ts continuity.ts hazard.ts environment.ts simulation.ts forecast.ts weather.ts timeline.ts vault.ts trial.ts types.ts`: **PASS**. This is not full project typechecking.
- Relative TypeScript import paths: 52 checked, zero missing.
- `npm run benchmark:finishing` isolated Node CPU placement layout: **low 0.258 ms median / 0.548 ms p95**, **medium 0.418 / 0.726**, **high 0.616 / 0.730** across 400 timed per-tier samples after warmup. It measures additional CPU data generation, not rendering or FPS.
- `npm run build`: **BLOCKED**, `TS2688 Cannot find type definition file for vite/client` (no installed node_modules, registry unreachable). Browser runtime, rendered before/after images, actual desktop/tablet/mobile playthrough, GPU/draw-call measurements, and memory/lifecycle stress tests **not run**.

## Compliance and limits
| User requirement | What can be established | Status |
|---|---|---|
| Modify existing playable code rather than create mockup | Existing source scene and old controls kept; runtime integration source verified | SOURCE PASS / RUNTIME UNVERIFIED |
| Preserve game mechanics, world, camera, actors and save compatibility | Simulation, input, data format, original entities and tests unchanged | STATIC + REGRESSION PASS / USER JOURNEY UNVERIFIED |
| Upgrade landscape, buildings, characters, material/style consistency | Actual scene geometry tied to canonical state and original art palette | SOURCE PASS / VISUAL QA UNVERIFIED |
| Improve animation, effect readability, camera quality | Cloth animation, smoke ownership, smooth bounded shake, water overlay | SOURCE PASS / VISUAL QA UNVERIFIED |
| Scale and dispose graphics safely for weak devices | Tier caps, instanced batches, low-tier dynamic lights, geometry cleanup | SOURCE CHECKED / DEVICE QA UNVERIFIED |
| Fully playable premium/commercial release | Full application build/browser and representative mobile testing absent | **BLOCKED** |

## Environment / delivery
No `.git` repository is present in the versioned source ZIP; branch, SHA, remote, CI/deployment and push are **not applicable / not performed**. The release is delivered as a downloadable ZIP only. No client APK, hosted URL, Play Store release or installed build is claimed.

**Next decisive validation:** Unzip on a machine with npm access, run `npm install && npm test && npm run syntax && npm run build && npm run dev`, then inspect castle/village front and rear, destroy/restore/rewind, all three Covenant stages, controls and 10 miracles in desktop and touch. Capture matched frame-time and draw-call samples relative to v0.10.0. Until then, use the honest verdict **VERIFIED INCOMPLETE**.
