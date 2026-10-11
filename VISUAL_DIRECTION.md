# The Field Atlas — Primordial Engine 3D art direction (v0.10.0)

**Status:** Implemented in the actual R3F playable scene and DOM HUD. Isolated source and simulation checks pass. Appearance, motion, screen composition, and performance are NOT browser-verified in this environment.

## Visual premise

The game is a **weathered medieval diorama under a divine observing hand**: a believable, inhabited valley whose material history is visible after its catastrophes. This is not photorealism, a space simulation, or a generic particle showcase. The familiar citadel, riverside village, shrine, forests, birds, inhabitants, wildlife, catastrophes, tactical atlas, and divine hand remain distinctive anchors.

| Element | Direction | Protected meaning |
|---|---|---|
| Landscape | Green-gray meadows, limestone fragments, distant blue-slate mountain folds | The kingdom is a finite traversable world; extra objects never add collision or change targeting |
| Architecture | Pitched terracotta tile roofs, faceted spires, masonry wall normals, off-white plaster | Castle and village structural block IDs, dimensions, and damage rules are unchanged |
| River | Mineral blue moving current, restrained pale edge foam, textured stony banks | Flood/ice effects and the saved water field are simulation authority, not decoration |
| Sky | Horizon-to-zenith tonal gradient, two instanced cloud strata, storm/ember palette states | Weather/light signals come from the actual active disasters |
| Lighting | Warm solar key, cool diffuse fill, geographically relevant limited spell glows | Hazards and target silhouettes remain legible |
| Magic | Original azure shrine / special power colors stay recognizable against less saturated surroundings | Each of the ten spells still communicates its original power type |
| Interface | Dark cartographer ink, mineral green/slate, antique brass, warm paper text | Actual menu buttons, power selection, time controls, saves and mission outcomes remain functional |

## Visual language

- Material response: rough mineral stone and stone ashlar, matte greenery, slightly reflective river, glowing divine features only where the power has in-world meaning. No new external texture or sound assets.
- Shape: pitched roofs and simple faceted small-town models stay in the existing miniature stylization; mountain ridges are soft repeated silhouettes, not a symmetrical row of giant cones.
- Color: brass `#e1c181`, ink `#101e26`, meadow `#344f3e`, mineral river `#2d8296`, slate `#536a77`, parchment `#f0e2be`. Player powers retain their distinct original colors.
- Atmospheric rule: distance is communicated by layered silhouettes, haze and narrower tonal contrast. Storms push the same world toward cold gray; volcanic catastrophes push it toward warm smoke.
- Effects: tornado displays dust and a swept coil (not electric wireframe); lightning displays a branching zigzag tube (not a straight pipe); meteor retains a descending physical boulder and a faint thermal wake.
- UI: accessible contrast and visible focus rings; no remote font dependency. Reduce Motion disables nonessential drifting/grass motion and CSS transitions, not essential disaster/gameplay simulation.

## Scene implementation and authority

`Game.tsx` owns visual geometry and effects; `visualDirection.ts` owns reproducible scenic data and quality budgets. Neither changes `simulation.ts`, `trial.ts`, world-save schema, collider geometry, selected powers, frame-loop simulation speed, or target coordinate computation. All new landscape fragments and patches are non-colliding; point-to-ground targeting still intersects the original world plane directly.

Sky and ridge geometries are local resources with explicit cleanup. Cloud and scenic details share instanced meshes, are updated only when their seed/quality changes, and have at most one low-frequency drift animation. The existing procedural canvas material maps remain physically integrated with their original disposal contract. Effects are limited by existing duration and source events.

## Tier budget

| Layer | Low | Medium | High |
|---|---:|---:|---:|
| Cloud banks | 10 | 19 | 28 |
| Cloud draw batches | 2 | 2 | 2 |
| Rock instances | 75 | 165 | 280 |
| Meadow patches | 44 | 94 | 160 |
| Detail draw batches | 2 | 2 | 2 |
| Mountain ring bands | 2 | 3 | 3 |
| Skyline segments per band | 56 | 72 | 96 |
| Shadow map | 512² (shadows disabled in low mode) | 1024² | 2048² |
| Device pixel ratio max | 1.0 | 1.45 | 1.8 |
| Fullscreen postprocessing | None | soft bloom/vignette | soft bloom/vignette |
| Animated dust | Off | Off | On |

Visual terrain accents and cloud shapes use deterministic integer-noise seeds. All new decorative populations have finite caps. This is **source-level budget policy**, not observed GPU performance.

## Manual visual acceptance matrix (requires a browser/device)

- Fresh kingdom: the sky has a warm horizon and a cooler zenith; the mountain skyline provides depth; clouds have realistic relative size and never cover the whole valley.
- Free-roam: church/citadel roof silhouettes, village homes, natural river banks, inhabitants, and focus/camera movement are clearly readable across zoom levels.
- Lighting: clear day, storm, volcano/meteor and fire keep hazards visible without blinding bloom or edge-darkening.
- Miracles: tornado coil rotates, lightning bends, meteor descends, local ice/water/scars remain distinct.
- Recovery: volcano → wave → inspect → restore, followed by time rewind and saved-world reload; decorative scatter must remain deterministic and must not alter the actual ground condition state.
- Covenant: all three ordeals, objective beacon, tactical map and after-action consequence ledger; no obscured essential controls.
- UI: 360px phone portrait, 800px tablet landscape, desktop at 1080p; focus rings, min-44px touch controls on small screens, reduced-motion preference and maximum-contrast preference.
- Performance: capture FPS/p95 frame times, draw calls and `renderer.info` on medium/low hardware; run repeated world changes and 20-minute play to check geometry/texture churn and memory growth.

**Browser evidence unavailable here:** npm DNS `EAI_AGAIN`, missing `node_modules` and `vite/client`; syntax/tests alone do not prove actual look, game runtime, stability, or target-device smoothness.


## v0.11.0 - the inhabited miniature, beyond its first frame

This is a continuation of The Field Atlas, **not** a palette replacement. All visual additions are non-canonical decoration that derives from authoritative live `StructureBlock` state. The original saved block IDs, coordinates, sizes, hit regions, physics and collateral scoring remain unchanged.

- Surviving `v_house_w_*` walls receive east-road-facing doors and glazed windows plus detailed west-facing walls, in four shared material batches. Destroyed walls lose every such detail; restoration re-adds it.
- Surviving `c_w_*`, `c_bastion_top_*` and `c_keep_battlement` blocks get instanced ashlar merlons. The iron gate is modeled in solid iron, not `wireframe`. Rooftop ridge caps are linked to surviving `v_house_r_*` or `c_keep_roof` blocks.
- Destroyed canonical village/castle/tower/bridge/mill blocks drive a bounded rubble scatter, keyed by seed and block ID. Source-world damage determines whether debris appears, so Time Atlas branches render the correct physical aftermath.
- Four eroded escarpments sit outside the original ±80 boundary; mountain decoration has no collider, raycaster or effect on miracle radius. Distant atmospheric ridge bands from 0.10.0 remain.
- The river's thin specular foam-like highlights are cosmetic and come from a shared instanced plane (8/20/34 instances for low/medium/high). The original river material, water animation and mechanics remain authoritative. No new postprocessing stage.
- A 9-by-4 vertex pennant shifts at most 20 Hz and stays fixed under reduced-motion preference; the flagpole never pivots. Camera impact motion is continuously sampled, capped and disabled when reduced motion is requested.
- The horse body axis now follows its four legs and forward-facing neck; clothing and helmet silhouette upgrades use small fixed primitive geometry, preserving animation and existing actors.
- Procedural PBR textures use independent deterministic material noise; game outcome random sources are never reseeded. Renderer-owned resources and quality tiers stay bounded.

### New QA states (not yet browser certified)

1. Orbit each house front and rear, then destroy house wall and roof independently. Confirm no floating trim, roof cap, or chimney smoke remains. Restore and repeat.
2. Destroy individual castle wall and keep components. Verify battlements and iron gate disappear only with their respective parent block. Inspect ruined foundation from three camera angles and across Time Atlas rewind.
3. Fly toward all four map edges; cliffs must remain outside the strikeable kingdom and never intercept a cast. Compare weather clear/storm/ember and day shadow contrast.
4. Inspect river current from overhead and near-water zoom, with reduced motion on and off, and low/high graphics. Ensure current is visible but never covers actual ground aftermath.
5. Follow knights/peasants/horses while running away from lava and fire; orientation, shadows, leg cycles, and contact with ground must stay coherent.
6. Complete each Covenant stage, cast every miracle, save/export/import, retry, and regenerate. No decoration may alter scoring, hit testing, game-state persistence or input.
7. Compare actual FPS and p95 frame time, draw calls, WebGL memory and device thermals against v0.10.0 on the *same* scene, graphics settings and device. Run a long session and scene remount cycle. Without this evidence, make no FPS or commercial visual-quality certification claim.

## v0.11.1 correction notes

The low tier now omits catastrophe and divine-hand point lights while keeping emissive spell meshes; medium limits calamity lights to one and high to three. Camera recoil uses presentation time and vanishes on pause. Under a reduced-motion preference, decorative bird orbiting/wing tilt, forest sway, river current/wheel motion, and idle divine-hand motion are calmed without changing the actual simulation or controls. These are source-level contracts awaiting real-device visual validation.
