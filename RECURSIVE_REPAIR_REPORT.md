# Primordial Engine 3D - v0.11.1 Recursive Repair Certificate

**Result: BLOCKED (source repair verified, full original visual task NOT certified).**

**Authority:** The original user task was the comprehensive AAA-quality visual overhaul of the existing game, including a six-pass process, an actual playable experience, preserved mechanics/controls/assets, quality-scaled graphics, responsive UI, and representative in-game visual/performance verification. The subsequent instruction requires a recursively clean pass, then Git staging/commit/push only where a real repository exists.

**Exact target:** the cold-extracted bytes of `primordial_engine_3d_visual_v0.11.0.zip` (no `.git`), built into a separate v0.11.1 correction ZIP. The former v0.11.0 archive is not overwritten.

## Verification-pass record

- **Source pass 1:** Inspected operational state, package scripts, v0.11.0 content, visual source, and current delta from v0.10.0. Confirmed 151/151 baseline regressions and missing dependency-enabled build. Found camera recoil decaying only in simulation time (so pause could hold shaking indefinitely), full three catastrophe lights on low tier, and incomplete scenic reduced-motion coverage. Implemented visual-only corrections, then ran focused checks. One older test was anchored to the replaced source text and was corrected to check the updated code path.
- **Source pass 2:** Rebuilt the requirement ledger against the original user task; inspected the corrected scene. Found an additional unconditional low-tier point light on the divine hand. Gated that light and reduced nonessential hand idle motion, while retaining the glowing orb and finger actions. Retested.
- **Source pass 3:** Re-read the requirement ledger and independently inspected final changed source and integrations; all 155 isolated tests passed; 27 source files parsed, pure TS modules typechecked, 52 relative imports resolved. The full project build still fails at missing `vite/client` (npm registry DNS `EAI_AGAIN`), so the required runtime/user-journey/visual audit cannot be completed. This is **not a complete clean pass** under the original contract.

## Defects repaired with directly checkable evidence

1. **Recoil freezes on pause / depends on gameplay speed:** `Game.tsx` now uses `settleCameraRecoil(recoil, renderDt, paused)` from `visualDirection.ts`. `simSpeed <= 0` immediately gates visible shake. Pure tests exercise paused, invalid, bounded and 30-step decay cases.
2. **Low quality pays for up to three calamity point lights:** `disasterLightLimit(low/medium/high)` is now 0/1/3, and the live `RealisticLighting` map is gated accordingly. A tier test and integration assertion confirm this.
3. **The divine hand's primed orb still allocated a low-tier point light:** the hand now receives the active graphics tier, skips that light on low, and retains its emissive mesh and all hand/gesture behavior.
4. **Reduce Motion stopped camera/cloth but not birds, forest, river, or idle hand:** cosmetic bird motion, tree sway, river current and hand idle animation now honor the same already-established reduced-motion preference. Normal-motion animations remain in place.
5. **Test tied to a source-code prefix:** update an existing shake test to find the new conditional while retaining its assertion against per-frame random jitter.

No simulation, trials, world assets, save format, Rapier colliders, UI controls, or user input handlers were changed. No new dependency or outside asset was added.

## Requirement-to-evidence ledger

`PASS (source)` means directly verified static integration or isolated tested behavior; it does **not** establish rendered usability. `BLOCKED` denotes a mandatory real-browser/device or subjective rendering obligation not provable in this environment.

| ID | Original task obligation | Evidence in this release | State |
|---|---|---|---|
| R01 | Modify the established game; no unnecessary rebuild | v0.11.0 file inventory retained, four source files repaired | PASS |
| R02 | Preserve existing miracles and mechanics | Pure simulation/trial modules unchanged; regression suite | PASS |
| R03 | Preserve original world entity IDs, save schema and collision | Core world files/physics source unchanged | PASS |
| R04 | Preserve input, gestures, mouse and touch handlers | Input modules and handlers unchanged | PASS |
| R05 | Preserve existing perspective, orbit and zoom design | Camera controls remain; only cosmetic recoil decay changed | PASS |
| R06 | Keep the actual game immediately playable | Full Vite build and real gameplay path unavailable | BLOCKED |
| R07 | Implement visuals in the playable game rather than mockups | `Game.tsx` direct scene components and actual state bindings | PASS |
| R08 | Establish consistent genre-appropriate art direction | `VISUAL_DIRECTION.md` and retained medieval miniature palette | PASS |
| R09 | Deliver visually exceptional commercial-grade results | No rendered browser views or human/visual QA | BLOCKED |
| R10 | Upgrade landscape, terrain, props, buildings | Actual instanced details/roofs/landscape in scene source | PASS |
| R11 | Improve character silhouettes; retain animation | Procedural actor meshes and movement retained in source | PASS |
| R12 | Integrate contextual spells and effects | Existing FX renderer and cast event handlers unchanged | PASS |
| R13 | Lighting, atmosphere, depth and transitions | Dynamic sky/fog/quality light integrations in `Game.tsx` | PASS |
| R14 | Smooth and safely bounded camera reaction | Presentation-time, pause-safe pure function and scene test | PASS |
| R15 | Verify camera smoothness and no clipping in play | Live browser camera tests unavailable | BLOCKED |
| R16 | Cohesive HUD with usable existing controls | UI code unchanged from v0.11.0 | PASS |
| R17 | Accessible working phone/tablet UI and touch feedback | Requires rendered/mobile interaction testing | BLOCKED |
| R18 | Reduced-motion experience actually works on devices | Source integration passes; rendered experience unavailable | BLOCKED |
| R19 | Budget effects for weak devices and preserve high tier | Light counts 0/1/3, established tier caps, regression tests | PASS |
| R20 | Stable measured FPS and responsive input across devices | GPU/device frame-time and input latency unknown | BLOCKED |
| R21 | Prove no long-session leaks/accumulating effects | 20-minute WebGL and scene-remount checks unavailable | BLOCKED |
| R22 | Visual consistency across every available gameplay state | No complete visual playthrough or screenshots | BLOCKED |
| R23 | No newly introduced unlicensed assets | No new art/assets or remote asset URLs | PASS |
| R24 | No broken new external dependencies | Dependencies unchanged from v0.11.0 | PASS |
| R25 | Preserve all original project files/capabilities | File-hash / inventory comparison and baseline regressions | PASS |
| R26 | Complete a real game-state playthrough | Cannot launch dependency-enabled game | BLOCKED |
| R27 | Provide actual implemented graphical improvements | Code changes in production scene, not static mocks | PASS |
| R28 | Inspect source and choose a visual direction | Existing 0.10/0.11 visual direction, current fresh source audit | PASS |
| R29 | Optimize expensive effects and avoid extra complexity | Removed low-tier dynamic lights, original render mechanisms retained | PASS |
| R30 | Run full QA at all available game states and fix visual defects | Browser/device graphics evidence unavailable | BLOCKED |
| R31 | Reach zero failed required validation in a fresh pass | Full `npm run build` blocked and runtime QA unavailable | BLOCKED |
| R32 | Deliver an inspectable updated artifact | New 0.11.1 ZIP with SHA manifest | PASS |
| R33 | Git commit/push when repository exists and final gate passes | Packaged ZIP contains no `.git` or upstream; final gate blocked | N/A |

## Final validation actually run

- `NODE_PATH=/opt/nvm/versions/node/v22.16.0/lib/node_modules npm test`: **155/155 passing** (151 baseline plus four relevant tests) and normal exit 0.
- `NODE_PATH=... npm run syntax`: **27/27** parse checks, no diagnostics.
- `tsc --strict --target ES2020 --module esnext --moduleResolution node --noEmit --lib es2020,dom visualDirection.ts continuity.ts hazard.ts environment.ts simulation.ts forecast.ts weather.ts timeline.ts vault.ts trial.ts types.ts`: PASS, **not a full app typecheck**.
- Relative import graph: **52** paths checked, **0** unresolved; no deletions.
- `npm run benchmark:finishing`: executable bounded CPU layout check; not an FPS or GPU result.
- `npm run build`: **BLOCKED** with TypeScript `TS2688: Cannot find type definition file for 'vite/client'`; `npm ping --fetch-timeout=5000 --fetch-retries=0` fails `EAI_AGAIN registry.npmjs.org`.
- Cold extraction: archive integrity, checksums, and all executable source checks must be repeated on the final packaged ZIP before delivery.

## Git and delivery

The v0.11 source and v0.11.1 correction package contain no `.git`, branch, configured upstream or remote. **Commit: NOT_APPLICABLE. Branch: NOT_APPLICABLE. Push: NOT_APPLICABLE.** Do not initialize a fabricated repository or assert any Git operation.

## Required next validation gate

On a device with working npm access, perform install, full TypeScript/TSX build, browser gameplay in desktop and mobile, all ten miracles, three Covenant ordeals, camera motions and reduced motion, castle/village destruction and restoration, Time Atlas rewind and save import, and matched low/medium/high graphics and 20-minute memory profiling. Repair any observed defects and restart from the original task; do not mark the AAA visual task complete before that.
