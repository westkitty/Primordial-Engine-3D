# Primordial Engine 3D — v0.4.0 Continuity & Consequence Proof Record

Date: 2026-10-10

## Verdict

**VERIFIED INCOMPLETE — real code and isolated tests pass; mandatory app/browser runtime validation remains blocked by missing npm packages and network DNS.** No live deployment or Git push occurred.

## Scope

Existing v0.3.0 ZIP is the source authority; this is a new versioned ZIP, not a replacement. All preexisting `.ts`, `.tsx`, JSON configuration, original procedural models/textures, and historical documentation are retained.

## Main transformations

1. `continuity.ts` provides a strict `primordial-world-v1` save contract with stable tree seeds, bounded world/material serialization, optional visual residue, pending meteors/cooldowns, scores and event history. It rejects corrupted, out-of-range, duplicate, mismatched, oversized, or geometrically incompatible imports.
2. `App.tsx` initializes from a valid local save, checkpoints locally approximately every seven real-time seconds and on `pagehide` through the actual Scene, and exposes Save, Export, Load and Regenerate. No second runtime model or network dependency was introduced.
3. `Game.tsx` restores the actual structure/tree state and typed material arrays instead of faking an inspected status readout, restores pending meteor motion and timers, and resets inhabitants when regenerating a world.
4. `hazard.ts` + Scene inhabitant integration makes villagers, horses and chickens avoid active **persistent** heat/flood/frost hazards after VFX expire, at bounded decision intervals. Previously they only fled visible disasters.
5. `EnvironmentalMemory.tsx` refreshes ground colors and geothermal lighting on field-object replacement even with identical revision numbers. Scene unmount explicitly disposes all nine generated canvas textures.

## Quality delta (source-proven only)

| Lane | 0.3.0 baseline | 0.4.0 after | Evidence |
|---|---|---|---|
| UI | Session chronicle, manual event-only export | Save, portable world export/import, local restoration status | Source and syntax; actual UI visuals unverified |
| Experience | Environment remembers scars until page closes | World resume across visits; animals react to dangerous aftermath | Pure save and hazard tests; browser unverified |
| Backend | Unseeded random tree positions, session-only state | Reproducible tree identity, validated serialized world and typed fields | Strict typecheck and roundtrip tests |
| Assets | Procedural PBR textures, persistent material overlay | Explicit generated texture disposal, reliable field-replacement refresh | Source inspection; GPU disposal not instrumented |
| UX | In-world inspect and catastrophe controls | World can be exported, imported and regenerated without mixing two seed layouts | Source wiring tests; live browser unverified |

## Real validation

- Pre-change (0.3.0) `npm test`: **35/35 PASS**; source parsed **18/18**.
- Current `npm test`: **48/48 PASS**, including 13 new tests for deterministic seed, saved world roundtrip, input world-state preservation, corrupt/oversized save rejection, field geometry compatibility, environment-driven navigation, and renderer lifecycle wiring.
- Current `npm run syntax`: **20/20 PASS** TypeScript/TSX parse diagnostics.
- `tsc --noEmit --strict --target ES2020 --module esnext --moduleResolution node --lib es2020,dom continuity.ts hazard.ts environment.ts simulation.ts types.ts`: **PASS** pure subsystems.
- `npm run benchmark:continuity`: source-world save ~0.22ms median / ~0.44ms p95; parse ~0.15ms median / ~0.41ms p95; 10 inhabitants' hazard decisions ~0.019ms median / ~0.095ms p95 on this container. These are **local Node CPU microbenchmarks**, not browser FPS/GPU measurements or before/after speedups.
- `npm run benchmark`: 32x32 material-field tick as previously defined; no code-level field algorithm changed. This does not establish a performance improvement.
- Vite/React/R3F/Rapier runtime packages **not installed**. `curl` to registry.npmjs.org fails DNS; full production build and browser tests cannot be closed in this environment.

## Known limitations and honest counterevidence

- A source-level passing test cannot prove that the Canvas mounts, captures touch, displays correct shading, or survives browser context loss. Actual render/device checks are mandatory before release.
- Local storage can be blocked or full; Export world works as an alternative if browser download is available. Imported worlds are validated before installation, and corrupted input leaves the current world unchanged.
- Audio and SDK integration are retained but unverified in this browser. Only session environment/structures are persisted; physics rubble and individual NPC trajectories are ephemeral.
- Generated ground scar visuals remain an instanced decal grid. The underlying collision geometry is not physically sculpted. Evacuation is local gradient navigation, not an autonomous society.
- All prior-art decisions from `UPLIFT_REPORT.md` are retained: bounded environmental modeling instead of reinventing a per-pixel fluid engine.

## Git/CI/delivery

Supplied authority is a local ZIP without Git metadata; no original checkout, remote, upstream, or revision identity was present. No commit/push/deployment performed. Final release is a separate versioned source ZIP. This is not a production sign-off.

## Browser user journey required to finish closure

Open locally on a dependency-enabled machine. Observe the castle and existing ten powers. Cast Volcano near villagers, wait until its visual effect disappears, and verify they continue avoiding hazardous ground. Cast Wave at the hot spot; verify cooled-stone scars remain. Save, export JSON, refresh, and import; confirm the same trees, damaged structures, geologic scars, scored chronicle, and pending meteor consequences remain. Regenerate; confirm new tree layout and no old scars, then check mouse/touch gestures, pause, camera orbit, accessibility, memory pressure and FPS.
