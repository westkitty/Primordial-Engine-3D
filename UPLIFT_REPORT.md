# Primordial Engine 3D - Transformative Uplift Review (0.3.0)

Date: 2026-10-10
Target: locally supplied, already repaired `primordial_engine_3d_repaired.zip`.
Execution: bounded source mutation in a separate directory. Original and previous repaired ZIPs preserved.

## Verdict

**PARTIAL - source implementation complete for the bounded 0.3.0 uplift; full runtime closure not proven.** The npm registry is unreachable here, so the production TypeScript/Vite build, in-browser visual inspection, input end-to-end journey, mobile check, and GPU performance comparison remain unverified. This is not a release/deployment claim.

## Quality delta (evidence-limited)

| Domain | Baseline | 0.3.0 | Proof status |
|---|---|---|---|
| UI | Compact ten-power dock, pause/settings | Adds World Memory panel, readable field counts, explicit Inspect mode and JSON export | Source inspected + syntax only; rendering unverified |
| WOW/experience | Short-lived catastrophe VFX and burning vegetation | Heat/water/frost/ash/stone remain in the landscape, can react across casts, and are inspectable | Pure model tests pass; 3D depiction unverified |
| Backend | Immutable structure/tree state and coarse environmental fire ticks | Bounded 32x32 material substrate, ecology coupling and fixed half-second stepping | Pure TypeScript check + deterministic tests passed |
| Assets | Existing authored procedural terrain and structures | Preserved original assets; introduced instanced ground overlay and one unshadowed geothermal light; no third-party assets | Source only; visual parity unverified |
| UX | Casting, runes, double-click camera focus, touch | Ground inspection cannot cast; prevents desktop first-double-click accidental cast and blur-triggered cast | Pure arbitration tests; physical mouse/touch runtime unverified |

Scores and subjective visual grades are intentionally omitted. They would not be evidence-based.

## Major implemented changes

1. `environment.ts`: 1,024-cell persistent material field; local miracle impact; heat and water form steam and stone; diffusion and cooling; safe boundary sampling; local restoration and inspection.
2. `simulation.ts`: natural combustion and wetness now consult real local environmental conditions rather than visual effects.
3. `Game.tsx`: shares a fixed 0.5-second field/fire tick; routes actual casts and effects into the new substrate; exposes a factual event feed and cached surface statistics; passes field revision to an efficient instanced renderer.
4. `components/EnvironmentalMemory.tsx`: a single instanced ground layer plus one geothermal light responsive to stored heat. No new runtime library.
5. `App.tsx`: opt-in inspector, bounded session chronicle, numeric material summary, exportable JSON event record, and mobile-aware overlay.
6. `tapArbitration.ts` / `input.ts`: eliminates a first-click double-focus destruction path, prevents blur-triggered phantom casts, and limits double-click camera focus to mouse pointers; finger and pen taps remain immediate.

## Prior art and restraint

- Ubisoft's **From Dust** demonstrates why causal nature simulation is more consequential than unrelated VFX, but also why a full fluid/soil simulator is expensive (Ubisoft game page; GDC Europe 2010 dynamic-world talk).
- **Noita** demonstrates the experiential payoff of coherent interacting materials; replicating a per-pixel physics universe in this R3F scene would be an unjustified architectural rewrite.
- **WorldBox** demonstrates long-lived sandbox state and discoverable divine powers; a full civilization simulation does not belong in this bounded source pass.

The transfer decision was **adapt**, not copy: a cheap fixed-size material field, not a new engine.

References:
- https://www.ubisoft.com/en-us/company/about-us/our-brands/from-dust
- https://gdcvault.com/play/1013667/Creating-a-High-Performance-Simulation
- https://www.noitagame.com/press/index.html
- https://apps.apple.com/us/app/worldbox-god-sandbox/id1450941371

## Verification actually executed

- `npm test`: **35/35 PASS**, 18 preserved + 17 added tests. No fabricated/browser-mocked results.
- `npm run syntax`: **18/18 PASS** TS/TSX files parse.
- `tsc --noEmit --strict --target ES2020 --module esnext --moduleResolution node --lib es2020,dom environment.ts simulation.ts tapArbitration.ts types.ts`: **PASS**, pure model files only.
- `npm run benchmark`: 600 Node.js field ticks with alternating volcano/wave; the initial run measured ~0.32 ms median / ~1.38 ms p95, while an independently extracted ZIP run measured 0.39 ms median / 2.29 ms p95 (a load-dependent outlier reached 14.47 ms). These are isolated CPU measurements, **not** a measured FPS or before/after speed-up claim.
- ZIP integrity: `unzip -tq` **PASS**; separate clean extraction contained 32 expected files and reran 35/35 regressions, 18-source parsing and strict pure-module typecheck successfully.
- `npm run build`: **BLOCKED** (`TS2688: Cannot find type definition file for vite/client`), caused by the unavailable dependency installation; React/R3F/Rapier/Vite packages are not locally installed.
- Browser/GPU/mobile: **UNVERIFIED**; require real dependencies and browser/device.

## Bugs caught in verification

1. Field ticking could continue indefinitely on permanently inert stone: excluded stone-only cells from active diffusion work and added regression.
2. A mouse double-click could cast on its first click before camera focusing: deferred desktop single-click casting by 0.32 s, canceling only the matching pending focus click; touch remains immediate.
3. Window blur could clear the pointer to a non-cancelled state and spuriously release a cast: blur now marks the pointer cancelled and discards queued mouse taps.
4. The test runner compared arrays across VM realms using `deepStrictEqual`, yielding a false failure; updated that test to compare primitive contents.
5. Propagated fire damage originally left no enduring residue in new cells. Derived fresh casualties from authoritative world transitions and deposited local ash, regression-tested.
6. The mouse double-click detector interpreted fast touchscreen taps as focus commands; limited focus arbitration to actual mouse pointers and reset cross-device click history, with regression coverage.

## Preserved and explicitly not implemented

Preserved: original procedural source models/textures, ten powers, gesture recognition, original gameplay state transitions, camera controls, physics effects, local restore, regeneration, sound, SDK integration, high score, and quality modes at source level.

Not implemented: true terrain mesh/collider deformation, fluid volume conservation and flow, coherent building fracturing, autonomous civilizations/economy, saved world reconstruction, history replay/rewind, mobile tactile testing, and guaranteed AAA performance.

## Git/delivery

The ZIP source is **not a Git checkout**. No branch or remote exists in it. No Git commit, push, CI, deployment, hosted build or Playground publish was attempted or claimed. Deliverable is a new ZIP containing the 0.3.0 source, tests and evidence documents.

## Manual proof scenario (mandatory before production)

1. Launch after `npm install`; verify the kingdom, dock, ten powers and controls render.
2. Cast Volcano into a dry area. Open World Memory and inspect a hot/scarred cell; ensure the map visibly retains a hot patch after the eruption VFX ends.
3. Cast Wave on the same location. Verify an actual steam response, nonzero cooled-stone cells and new journal record.
4. Ignite vegetation and wet an adjacent region. Verify moist cells suppress and limit further flame propagation.
5. Inspect while paused; clicking does not cast. Resume. Double-click to focus without an accidental first-click blast. Confirm a single desktop click casts after the short delay and touch taps remain immediate.
6. Locally Restore one region, then inspect it and another untouched scar. Regenerate and confirm all field counts return to zero, with effects and world objects reset.
7. Stress with repeated casts, 20+ minutes, mobile landscape layout, Firefox/Chrome/Safari and accessible keyboard UI. Profile CPU+GPU on representative devices.
