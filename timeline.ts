/**
 * Session-scoped, bounded temporal branches. Authoritative saves are immutable
 * strings, never references to mutable Three or simulation objects. Rewinding
 * creates a new branch without deleting the earlier future.
 */
import {MAX_SAVE_BYTES, parseKingdom, type SavedKingdom} from './continuity';

export const MAX_TIME_ANCHORS = 12;
export const MAX_TIME_MEMORY_BYTES = 2_400_000;
export type AnchorCause = 'genesis' | 'event' | 'manual' | 'fork';

export interface TimeAnchor {
  id: number;
  marker: string;
  label: string;
  cause: AnchorCause;
  branch: number;
  simTime: number;
  parentId: number | null;
  // Signed difference from the previous anchor in this causal branch.
  structuresDelta: number;
  treesDelta: number;
  scarsDelta: number;
  structuresLost: number;
  treesLost: number;
  scarredCells: number;
  score: number;
  serialized: string;
}
export interface TimeLedger {
  seed: number | null;
  branch: number;
  nextBranch: number;
  nextId: number;
  forkedFrom: number | null;
  anchors: TimeAnchor[];
}
export const newTimeLedger = (): TimeLedger => ({
  seed: null, branch: 1, nextBranch: 2, nextId: 1, forkedFrom: null, anchors: [],
});

const countScars = (record: SavedKingdom) => {
  let count = 0;
  for (let i = 0; i < record.ground.heat.length; i++) {
    if (record.ground.heat[i] > 0.16 || record.ground.water[i] > 0.16 ||
        record.ground.frost[i] > 0.16 || record.ground.ash[i] > 0.12 ||
        record.ground.stone[i] > 0.12) count++;
  }
  return count;
};

/** Record only known-good, self-contained kingdom states; reject stale seeds. */
export function recordTimeAnchor(ledger: TimeLedger, saved: SavedKingdom,
  label: string, marker: string, cause: AnchorCause): TimeLedger {
  if (ledger.seed !== null && ledger.seed !== saved.seed) return ledger;
  if (ledger.anchors.some(anchor => anchor.marker === marker)) return ledger;
  const safeLabel = label.trim().slice(0, 72);
  if (!safeLabel || !marker || marker.length > 120) return ledger;
  const serialized = JSON.stringify(saved);
  if (serialized.length > MAX_SAVE_BYTES || !parseKingdom(serialized)) return ledger;
  const parent = [...ledger.anchors].reverse().find(a => a.branch === ledger.branch) ??
    ledger.anchors.find(a => a.id === ledger.forkedFrom);
  const structuresLost = saved.world.blocks.filter(block => block.destroyed).length;
  const treesLost = saved.world.trees.filter(tree => tree.burnt).length;
  const scarredCells = countScars(saved);
  const anchor: TimeAnchor = {
    id: ledger.nextId, marker, label: safeLabel, cause,
    branch: ledger.branch, simTime: saved.simTime, parentId: parent?.id ?? null,
    structuresLost, treesLost, scarredCells, score: saved.score, serialized,
    structuresDelta: structuresLost - (parent?.structuresLost ?? structuresLost),
    treesDelta: treesLost - (parent?.treesLost ?? treesLost),
    scarsDelta: scarredCells - (parent?.scarredCells ?? scarredCells),
  };
  const originals = [...ledger.anchors, anchor];
  const anchors = [...originals];
  let total = anchors.reduce((sum, item) => sum + item.serialized.length, 0);
  while ((anchors.length > MAX_TIME_ANCHORS || total > MAX_TIME_MEMORY_BYTES) && anchors.length > 1) {
    // Preserve genesis, the current fork point and the newest actual moment.
    const victim = anchors.findIndex((item, index) => index > 0 && index < anchors.length - 1 &&
      item.id !== ledger.forkedFrom);
    if (victim < 0) break;
    total -= anchors.splice(victim, 1)[0].serialized.length;
  }
  const originalsById = new Map(originals.map(item => [item.id, item]));
  const survivors = new Map(anchors.map(item => [item.id, item]));
  const repaired = anchors.map(item => {
    let parentId = item.parentId;
    while (parentId !== null && !survivors.has(parentId)) {
      parentId = originalsById.get(parentId)?.parentId ?? null;
    }
    const newParent = parentId !== null ? survivors.get(parentId) : undefined;
    return {...item, parentId,
      structuresDelta: item.structuresLost - (newParent?.structuresLost ?? item.structuresLost),
      treesDelta: item.treesLost - (newParent?.treesLost ?? item.treesLost),
      scarsDelta: item.scarredCells - (newParent?.scarredCells ?? item.scarredCells)};
  });
  return {...ledger, seed: saved.seed, nextId: ledger.nextId + 1, anchors: repaired};
}

/** Rewind does not mutate a prior future. Subsequent anchors enter a new branch. */
export function forkFromTimeAnchor(ledger: TimeLedger, id: number):
  {ledger: TimeLedger; restored: SavedKingdom} | null {
  const anchor = ledger.anchors.find(item => item.id === id);
  if (!anchor || ledger.seed === null) return null;
  const restored = parseKingdom(anchor.serialized);
  if (!restored || restored.seed !== ledger.seed) return null;
  return {restored, ledger: {...ledger, branch: ledger.nextBranch,
    nextBranch: ledger.nextBranch + 1, forkedFrom: anchor.id}};
}

/** Closest surviving causal predecessor; never cross to a discarded future. */
export function previousMoment(ledger: TimeLedger): TimeAnchor | null {
  const current = [...ledger.anchors].reverse().find(a => a.branch === ledger.branch);
  const id = current?.parentId ?? ledger.forkedFrom;
  return id === null ? null : ledger.anchors.find(a => a.id === id) ?? null;
}
