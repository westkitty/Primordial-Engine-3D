# Primordial Engine 3D — The Living Field Atlas (0.12.0)

This is a source-level uplift of the **user-provided Google Playground Labs project**, continuing versions 0.2 and 0.3 (not a restart). The original art direction and procedural kingdom have been retained; the repair addresses gameplay state corruption, camera and touch controls, catastrophe outcomes, rune recognition, world simulation and several rendering pressure points. The original third-party notice file remains included.

## v0.12.0 — Runtime hot-path repair and measured CPU uplift

This is an additive repair of the **existing** React Three Fiber game, not a replacement
or visual mockup. The 10 miracles, canonical world state, physics collision, mobile/desktop
controls, imports, Time Atlas, Covenant challenges, and visual style are protected.

- The live particle field uses the **same position, gravity, lifetime and order** as before,
  but now compacts particles in place. It avoids two temporary arrays per active frame,
  caches repeated per-particle color decoding, and avoids uploading unchanged paused
  particle matrices and colors. The newest 240 visual particles remain the visible cap.
- Rubble bodies avoid crossing into Rapier's WASM `translation` API every frame
  when no wave or tornado force exists; active impulse calculations are unchanged.
- Decorative forest motion updates at bounded high/medium/low rates of 30/20/12 Hz,
  without affecting villager movement or the simulation scheduler. Reduced motion skips
  the forest animation entirely.
- Run `npm run benchmark:particles` for a matched CPU-only comparison of the previous
  array-allocation loop and the new update logic. The output reports simulation cost,
  **not** WebGL draw time, GPU performance, or device FPS. Six additional regression
  tests cover conservation of particle behavior, pause, last-240 rendering, force guard,
  and forest quality cadence.
- Historical `RELEASE_MANIFEST.json` is the **immutable v0.11.1 ZIP manifest**, not a
  checksum index of the living `main` branch. Do not validate 0.12 source against it.

**Evidence:** GitHub Actions successfully built the previous 0.11.1 tree after compiler
repairs. This version requires its own CI build and runtime validation. GitHub Pages remains
**disabled** at the repository level until the owner selects GitHub Actions under
Settings → Pages; a green build does not mean the website was published.

## v0.11.1 - Recursive source repair (NOT runtime-certified)

A new release preserves v0.11.0 and corrects identified visual regressions without altering mechanics or world state: paused camera recoil no longer persists indefinitely, presentation shake decays independently of simulation speed, low/medium/high catastrophe light budgets are 0/1/3, the divine hand's low-tier orb retains emission without a point light, and optional reduced-motion mode also calms birds, foliage, water, and the hand's idle animation. See `RECURSIVE_REPAIR_REPORT.md` for tests and the original-task traceability gate. **Build / browser / mobile / AAA quality certification remain blocked** by missing npm dependencies.

## The Living Field Atlas — v0.11.0 finishing pass

The **actual existing React Three Fiber world** is upgraded, not a screenshot or mockup. All ten miracles, real destructible structure IDs, local save/import/export, Time Atlas, Covenant ordeals, gesture and touch input, and all former reports are preserved.

- **Inhabited village, from both sides:** batched timber posts, dark doors, window glazing, iron fittings and repairable/vanishing detail attached to each surviving canonical house wall. Roofs again use their original distinct painted colors, with one batched roof-ridge silhouette layer.
- **Defensive citadel:** solid forged iron portcullis (replacing the original wireframe cube), a stone entrance, and surviving-wall battlements rendered in batches; destroying a wall also removes its ornamentation.
- **Ruin permanence:** walls, houses and bridge pieces leave seed-stable physical-looking fragments while destroyed; restoring/reloading/rewinding removes or reproduces those fragments from the authoritative saved blocks without new save fields.
- **A natural horizon:** four conical perimeter mountains are replaced by seed-stable eroded escarpments. The geometry begins **outside** the playable ±80 map boundary and has no collider or interaction layer.
- **Living river:** quality-scaled thin current highlights follow the existing water normal-map movement, with no new flood simulation, collision, or dangerous transparent foam sheet.
- **Animation and creatures:** flexible vertex-animated castle pennant on a stationary mast, capped to 20 Hz and disabled by reduced-motion; smooth capped camera impact motion instead of independent white-noise camera jitter. The horses have horizontal torsos; villager and knight accessories improve miniature readability without altering limb animation or AI.
- **Consistency and budget:** PBR grass/stone grain is deterministic across scene remounts. Low graphics disables expensive nonessential point lights, and instancing groups repeated facade/battlement/rubble parts into bounded batches. The optional `npm run benchmark:finishing` measures CPU layout cost, not FPS.

**Validation limit:** Browser-level build, screenshots, real device playtesting, and GPU performance were not available in the authoring container (no installed npm packages, `vite/client` missing and npm registry DNS unavailable). Isolated tests, pure-module typecheck, syntax, and release checks **do not** prove premium visual quality or immediately playable behavior on a real device. See `V011_VISUAL_REPORT.md`.

## The Field Atlas visual overhaul — v0.10.0

- **Playable 3D scene:** color-graded weather sky, seed-stable distant mountain ridges, instanced believable cloud banks and stony meadow/shore details across all graphics tiers.
- **Architecture:** the actual village and citadel roofs now have gabled silhouettes; tower spires are faceted, not placeholders. Structural IDs, physics, and destruction remain canonical.
- **Materials and atmosphere:** original nine procedural PBR texture resources preserved; a mineral-blue river has gentle edge foam rather than an opaque white surface; warm/cool key lights, scaled shadows, limited catastrophe point lights and restrained postprocessing preserve readability.
- **Motion and FX:** silhouette bird wings now flap; NPC facing turns are smoothed without slowing escape actions; grass and high-tier dust animation use bounded update cadence; tornado, lightning and meteor effects receive distinct readable forms.
- **HUD:** one dark ink / brass / parchment design across controls, ordeal and tactical map, with touch-size buttons, keyboard focus, high-contrast mode and reduced-motion support.
- **Engineering:** no new npm dependencies, remote visual assets, world-save migrations, game mechanics, or physics collisions. Existing sandbox, all ten powers, Covenant, Time Atlas and vault remain.
- **Evidence:** see `VISUAL_DIRECTION.md` for budgets and acceptance oracle, `V010_VISUAL_REPORT.md` for the verified limits.

## Play online with GitHub Pages

Deployment is configured using `.github/workflows/pages.yml`, which installs the existing
pinned dependencies, runs the gameplay and syntax checks, type-checks and builds the actual
Vite game, then publishes `dist/` as a GitHub Pages artifact on pushes to `main`.

**One-time repository setting:** In [Settings > Pages](https://github.com/westkitty/Primordial-Engine-3D/settings/pages),
choose **GitHub Actions** under **Build and deployment > Source**. This cannot be enabled
by the repository workflow's default `GITHUB_TOKEN`. After selecting the source, rerun
[Publish Primordial Engine 3D to GitHub Pages](https://github.com/westkitty/Primordial-Engine-3D/actions/workflows/pages.yml)
or push a new commit to `main`.

The expected URL after a successful deployment is
<https://westkitty.github.io/Primordial-Engine-3D/>. The workflow sets Vite's asset base to
`/Primordial-Engine-3D/` only for deployment; local `npm run dev` still works at `/`.
No static screenshots or precompiled mockups are deployed. Production browser playability
and mobile performance still require independent checks after Pages reports success.

## Start locally

Requires Node.js 20.19+ or 22.12+ and an internet connection for the initial dependency install.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). This local preview uses the source's fake Playground SDK instead of trying to initialize a real production SDK.

To validate locally (after dependencies install):

```bash
npm run syntax
npm test
npm run build
npm run benchmark
npm run benchmark:continuity
npm run benchmark:timeline
npm run benchmark:covenant
npm run benchmark:visual
npm run benchmark:finishing
```

**Important:** In this execution environment, `registry.npmjs.org` fails DNS resolution and the packages are not installed. Therefore a full dependency-enabled TypeScript/Vite build, browser gameplay, GPU measurement, and mobile input validation remain **unverified**. `V010_VISUAL_REPORT.md` has the current evidence; earlier reports preserve earlier history.

## Controls

- Click / tap the world: cast the selected catastrophe.
- Hold and trace a rune: cast only when the gesture is recognized. An unrecognized gesture does **not** trigger a fallback spell.
- Use the **Miracles** selector for ten powers, or number keys `1` to `0`.
- Right mouse drag: orbit; Shift + right drag or middle drag: pan; mouse wheel: zoom; double click: focus.
- WASD / arrow keys: pan; Q / E: rotate camera.
- Two fingers on touch devices: pinch zoom and pan. Single-finger hold-and-drag: rune.
- **P** or the dock button: pause/resume. Settings: force, simulation speed, graphics quality, audio, camera presets, full regeneration.
- **Inspect**: temporarily disable casting and tap any ground position to read local heat, water, frost, ash and stone. Works while paused.
- **World Memory**: open an event chronicle and live ground-cell counts. Export the chronological session records as JSON; the latest 30 events are visible (up to 300 saved).
- **Time Atlas**: The Forking Hours automatically records a bounded first moment and key catastrophe/aftermath moments. Select an earlier moment to **rewind** the actual kingdom state and begin a new temporal branch; the old future remains selectable while its anchor is retained. Current branch, event time, material damage and signed before/after deltas are shown. **Anchor this moment** creates a manual checkpoint. The atlas is limited to 12 snapshots / ~2.4 MB and is **session-only**; export a world JSON to preserve one alternate future across refreshes. Rewind clears transient particles/debris and pauses the game until resumed.
- **Settings → Save kingdom**: write the actual kingdom state to this browser. Background checkpoints run about every seven real-time seconds and on page exit. **Export world** produces a portable JSON save; **Load world** imports a validated save. These controls are distinct from exporting the chronicle.
- **Regenerate kingdom**: creates a new seed, discards the previous active saved world, and keeps the best-score record intact.
- Desktop mouse single-click casts after a short 320 ms disambiguation window to prevent the first click of a double-click camera focus from detonating a catastrophe. Touch taps remain immediate.

## Gameplay behavior

- All structure and tree changes run through immutable transitions in `simulation.ts`; the pristine world is preserved, so repeated restoration is possible.
- Earthquake, meteor, lightning, tornado and other damage now respect impact radius, force and structure integrity.
- Wildfire advances over simulation time, spreads to dry nearby vegetation/timber and eventually consumes them.
- Waves and freezing wet and extinguish nearby burning vegetation and buildings. Rain does not globally change every tree.
- Meteor damage is deferred until the animated object reaches the world, rather than being applied immediately on selection.
- Tornado and flood fields can apply impulses to existing physics rubble.
- The target mandala previews the actual selected catastrophe radius at the current force multiplier.
- Regenerate starts a fresh world and clears debris, storms, crystals and temporary ice. Local restore repairs entities within the radius.

## World-memory uplift (0.3.0)

The 160-unit ground is now tracked by a lightweight deterministic **32x32 material field** (`environment.ts`; 1,024 cells, 5 units per cell). Each cell retains heat, water, frost, ash and solid stone. It is not a fluid-dynamics solver or deformable collision terrain.

**Integrated scenario**: cast Volcano to heat/scorch an area; cast Wave onto that area to generate a steam response and deposit cooled stone; open World Memory to inspect the surface and secondary fire events. Those deposits remain after the spectacle finishes. A local Restoration clears its own affected cells but does not change distant history; Regenerate creates a completely fresh field.

Each fixed half-second environment tick diffuses and cools the fields while dampening or igniting nearby trees and combustible structures. A single instanced mesh overlays persistent effects and one unshadowed light follows the hottest cell. A cold world takes a no-op field path. An opt-in inspection mode cannot fire powers.

Chronicle entries and environmental state are now part of a **versioned local kingdom snapshot**; exports are portable JSON. A `primordial-chronicle-v1` event-only export is not an importable world save. Saving **suspends** the world while the browser is closed; no offline background simulation runs. Short-lived particles and settled rigid-body rubble are not serialized, so visual replays are not frame-exact.

## Continuity and inhabited-world uplift (0.4.0)

The saved world format is `primordial-world-v1` (`continuity.ts`). A deterministic 32-bit seed regenerates tree placements, while the saved snapshot carries structure damage, vegetation burning/wetness, five 32×32 material channels, the world clock, cooldowns, pending meteor impacts, crystals, ice patches, score, and recent event history. World import is bounded and validates positions, schema, field ranges, seed/layout consistency, and fixed structure geometry before replacing the active scene. Incompatible imports are rejected rather than silently painting damage onto unrelated models.

Inhabitants now consult `hazard.ts` to flee persistent dangerous heat, water and frost after an immediate catastrophe animation ends. Ash and cooled stone remain historical evidence rather than causing permanent panic. Navigation samples at bounded intervals and does not simulate a full civilization, pathfinding mesh or saved NPC positions.

The instanced surface and geothermal light now react to both changes in field revision **and replacement of the field object**. This ensures world import/regeneration cannot leave a visually stale overlay. Imperatively created procedural textures are disposed when the scene unmounts.

## Temporal atlas and reliability uplift (0.5.0)

`timeline.ts` stores at most twelve individually validated world snapshots as immutable in-memory JSON strings. Each records its own material/structure outcomes and a causal parent; jumping backward preserves surviving alternate-future anchors and creates a new branch rather than modifying historical saves. Snapshot data is the existing `primordial-world-v1` schema: **the save format did not change**. Timeline archives themselves intentionally do not persist across sessions. Manual world export saves the currently active future.

The live save callback rejects obsolete scene epochs, including same-seed time travel, and checks snapshot round-trip validity **before replacing** the previous local save. Imported world geometry is compared against the current canonical scene **before** any active state or backup is replaced. Asynchronous imports are rejected if another import or world transition wins while file bytes load.

The divine-hand targeting and summoning-ring positions now follow a shared Three.js ref directly inside the render loop instead of allocating React state on mouse motion. The hand also reuses its previous-position vector rather than cloning it each frame. This removes a known source-level rerender/allocation path; browser GPU/FPS gains are not claimed without a real build and matched runtime profile.

## Twelve gameplay and reliability improvements (0.6.0)

1. **Forecast**: choose a power, activate Forecast, then tap the ground. The readout uses the same `applyMiracle` and `impactGround` rules as a real cast but does not mutate the world. It shows *immediate* effects only, labels a meteor's delayed landing, and does not promise future chain reactions.
2. **Safe world boundary**: casts outside the playable 154×154-unit interior are rejected without starting FX, consuming cooldown or scoring damage.
3. **Quantitative soil inspection**: Inspect now shows each material channel and hazard intensity in percentages, alongside the historical interpretation.
4. **Persistent deterministic wind**: simulated winds change by world time and seed, then return to the same conditions after time travel or loading a save.
5. **Directional wildfire**: ignition reach is stronger downwind and weaker upwind, based on those same wind vectors.
6. **Conditional forest recovery**: scorched trees regrow slowly only when sustained moisture, cool ground and tolerable frost/ash permit. Recovery progress is saved as an optional new v1 field; old v1 files still load.
7. **Riverward runoff**: a bounded model transports a fraction of water toward the existing central river (world x=0); river cells discharge water, while permanent stone deposits remain.
8. **Material-layer filters**: show all scars or isolate heat, water, frost, ash or stone without changing any underlying simulation data.
9. **Causal Time Atlas retention**: pruning past moments now repairs retained ancestor links and signed differences, protecting the active fork's source where feasible.
10. **Undo to previous anchor**: returns the kingdom to its last surviving causal predecessor and opens a fresh branch; this is not a frame-by-frame replay.
11. **Three independent protected vault slots**: save/restore real worlds, refusing to overwrite an occupied slot unless **Replace slot** is explicitly selected. Corrupt stored slots remain visible and protected until consciously replaced. The browser's normal autosave remains separate.
12. **Accessible panel and mobile control refinements**: incompatible panels close automatically; Escape dismisses overlays; smaller screens cap panel height and retain accessible labelled buttons. Actual mobile layout inspection is still required.

**Controls:** Use **Forecast** to preview without casting. **Inspect** reads terrain. **World Memory → Show surface layer** filters the overlay. **Time Atlas → Undo to previous anchor** forks from a surviving previous checkpoint. **Settings → Kingdom vault** shows the three independent slots.

The vault stores data in the current browser only and may be unavailable in private modes or under storage quotas. World exports remain the portable recovery path. The 32×32 ground model is not a volumetric simulation or deformable collision mesh. Relative timing, physics parity, 3D rendering, GPU/memory footprint and actual phone usability remain unverified until the npm packages install and a real browser is tested.

## Architecture / performance

- `simulation.ts`: deterministic-ish pure world-state transitions, independent of rendering (the simulation itself does not use randomness; map generation and visual effects still do).
- `gestures.ts`: normalized, thresholded rune recognizer with negative tests and direction-aware classes.
- `input.ts`: pointer capture/cancellation, keyboard action map, multiple-pointer touch interaction.
- `Game.tsx`: much less per-frame React state traffic; a 15 Hz FX state update while effects exist; instanced grass and dust; pooled instanced particles; graphics quality modes.
- `App.tsx`: compact HUD, user controls, score storage, and a local status/telemetry surface.
- `tests/run-tests.cjs`: 120 isolated regression tests covering previous mechanics and adversarial challenge rules.
- `tests/benchmark.cjs`: repeatable local pure CPU model measurement (not FPS).

## The Covenant: an optional three-act game mode (0.7.0)

**Sandbox mode remains unrestricted.** Tap **Trial** in the bottom dock and choose **Begin three-act trial** to face a survival-and-restoration challenge in the *current* kingdom. Trials do not erase earlier damage. The world continues to obey the original `simulation.ts` and `environment.ts` rules, and opponent disasters travel through the same actual cast/meteor path as manual miracles. There is no separate fake challenge world.

- **I — The Emberline (45 simulation seconds):** an incoming wildfire attacks a marked forest grove at +6 seconds. After it strikes, cast Wave, Freeze, or Restoration near the beacon, extinguish the local flames, and preserve most of the grove. Merely waiting for a non-existent fire to disappear cannot win.
- **II — The Crucible (50 seconds):** a volcano erupts near the river bridge at +5 seconds. Quench at least two genuinely heated ground cells with Wave to form solid stone; repair the bridge if necessary until two of its pieces remain standing. Synthetic points or Crystal casts do not satisfy the quench requirement.
- **III — The Fallen Crown (60 seconds):** an actual descending meteor hits the castle after its +7-second warning. Once the impact lands, restore at least 85% of its structures and extinguish burning segments. Pre-impact restoration does not satisfy the ordeal.

Each player-cast miracle consumes **divine will** (`trial.ts`, between 18 and 40 points depending on its type). Will regenerates at 1.6 points per simulated second to a maximum of 100. Failed or unaffordable casts do not consume resources. Complete an ordeal to earn a time/energy score bonus and 35 will. Missing a deadline ends the trial without resetting your world.

The game displays a **world-space tactical beacon**, countdown, mission objective, available will, objective progress, earned points and selected-spell cost. **Focus beacon** moves the camera toward the actual danger. On smaller displays, **Collapse** reduces the mission panel to a compact status strip. Pause also pauses the trial clock; trial scoring uses fixed 1× simulation speed and force, restoring previous sandbox settings when the trial ends. The Time Atlas cannot rewind during an active ordeal; it becomes available again afterward.

**To finish a session:** use **Return to sandbox**. The resulting damage and world state remain; trial points are a separate score. A victory high score is stored locally when storage is available. The challenge session itself is intentionally **not included in the existing `primordial-world-v1` save**, because altering that validated format without migration would risk older saves. Importing/loading/regenerating a kingdom ends the current trial, while an incompatible import is rejected without altering it.

**Verification boundary:** pure mechanics and connected production-path sources pass automated regression tests; actual browser rendering, HUD ergonomics, device input, and challenge feel remain unverified until the npm dependency-enabled build and playtest. A full three-ordeal success path was executed under the real simulation functions using five deterministic world seeds. See `V070_REPORT.md`.

## Witness & Consequence: gameplay integrity uplift (0.8.0)

The Covenant now requires **verifiable intervention**, not merely a button press. A defensive spell only earns credit when the marked grove or castle actually changes from on-fire/burned or destroyed/burning to recovered. Empty spells, distant unrelated rescue, and pre-impact restoration do not advance the objective. The Crucible requires actual stone formation from a Wave near the bridge *after* the volcanic threat physically hits. A grove already ruined when the trial begins cannot produce an unearned win.

The **Trial Tactical Map** is a compact, optional in-game SVG map grounded in current world entities. It shows the objective, river, up to 16 local burning trees or damaged structures, and provides descriptive accessibility text. A stage-specific **Next action** prompt tells you what is still missing, including delayed meteor impact and insufficient will. Optional **Auto-focus once per ordeal** moves the camera on stage entry, never every frame.

The **After-action Ledger** scores each ordeal separately with stage letter grade, duration, cast count, preservation percentage, peak observed damage and earned points. Damage is recorded *even if restored before the next clock tick*. A failed stage yields an explicit F entry and no points. Trial points never pollute the sandbox chaos score. Final reports export as a separate, fictional `primordial-covenant-after-action-v1` JSON document; world save compatibility is unchanged.

**Retry from the same starting kingdom** restores an immutable world-state checkpoint (tree/structure states, material ground, world time, cooldowns, scores, pending impacts, crystals and ice). It also discards the prior attempt's chronicle and cancels queued checkpoint/export requests that could attach to the wrong attempt. Cosmetic effects and inhabitant positions are not frame-perfect restored. Ending the trial instead keeps real damage and restores earlier sandbox settings. After success/failure, spells remain locked until the player retries or returns to sandbox; the final report cannot be invalidated by post-trial casting.

**Verification:** 109/109 isolated regression tests including the inherited suite; 26/26 TS/TSX parses, strict pure-module TypeScript and a cold-extracted ZIP check. See `V080_REPORT.md` for the exact evidence and performance tradeoff. This is not a certified browser release: required packages remain unavailable because registry DNS lookup fails `EAI_AGAIN`. In-browser layout, rendering, controls and 20-minute GPU behavior still require device testing.

## The Witness Account: consequence and performance uplift (0.9.0)

**A victory is no longer exempt from its own collateral.** During the optional Covenant, each player miracle is compared against the actual before/after tree and structure states. Damage *directly caused by the player outside the current objective* is recorded in a bounded Witness Account and visibly marked with gold crosses on the tactical map. Opponent disasters and indirectly propagating fire are **not** presented as player-caused. This is a ledger of physical entities, not an invented census of fatalities.

The account records damaged off-target structures and newly ignited trees, even if the player restores them later. Its grading cost is capped at 420 points and applied only on a secured stage; failed stages award no points. The running HUD shows potential grade impact; the After-action Ledger and exported record show the applied penalty separately from raw harm. The existing chronicle also includes any off-target consequences in the authentic miracle event rather than generating a fake unrelated record. Each new ordeal begins a fresh accounting stage.

**The Crucible is geographically honest:** a wave only advances the bridge forge with actual *newly solidified* stone within a 12-unit radius of the river bridge; remote patches hit by a large-area wave no longer score. Existing stone and Crystal deposits do not count. **The verdict waits for falling meteors:** outstanding player meteors must actually land before a Covenant stage can end, without extending the objective deadline or admitting new casts after the time expires.

**Forest lifecycle:** 155 individual tree sway animations previously each subscribed to `useFrame`. A single `SwayingForest` now owns one per-frame callback and preserves the existing per-tree geometry, fire/burn state, individual timing offsets and visuals. The exact runtime performance benefit is **unverified**: React/R3F/Vite packages were not installable in this environment; static callback reduction is not proof of FPS improvement. The richer pure trial display cost was benchmarked against v0.8 under the same Node harness, with a small variable microsecond-level overhead. See `V090_REPORT.md`.

**Validation:** 120/120 isolated regression checks (including inherited 109); 26/26 source files parse; strict standalone TypeScript checks pass; release ZIP is verified from a fresh extraction. Full app build, real 3D gameplay, on-device UX, GPU and long-session performance remain blocked/unverified. `primordial-world-v1` remains unchanged and the trial remains session-only.

## Preserved scope and remaining work

This is a **targeted repair**, not a new game engine. The original procedural terrain, citadel, village, river, character models and catastrophe visuals remain. True deformable terrain, volumetric fluid routing, multistage fractured-mesh building collapse, persistent civilization/economy, offline world evolution and cinematic replay remain **unimplemented**; adding them would be a separate large project. There are no claims of measured FPS improvement or end-to-end iPhone compatibility without real device testing. Full continuity **and temporal branching** are source-tested only until the Vite build and actual Chrome/Safari/Android scenarios run. See `V060_REPORT.md` for the current proof state.
