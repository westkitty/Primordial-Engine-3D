/** Separate recoverable user checkpoints; existing autosave is never used as a scratch slot. */
import {MAX_SAVE_BYTES, parseKingdom, type SavedKingdom} from './continuity';
export const VAULT_SLOTS = [1, 2, 3] as const;
export type VaultSlot = typeof VAULT_SLOTS[number];
export const vaultKey = (slot: VaultSlot) => `primordial_engine_vault_v1_slot_${slot}`;
export interface SlotStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface SlotSummary {slot: VaultSlot; savedAt: number; seed: number; simTime: number; score: number;}
export function readSlot(store: Pick<SlotStorage,'getItem'>, slot: VaultSlot): SavedKingdom | null {
  try {return parseKingdom(store.getItem(vaultKey(slot)));} catch (_) {return null;}
}
export function summaries(store: Pick<SlotStorage,'getItem'>): SlotSummary[] {
  return VAULT_SLOTS.flatMap(slot => {const s = readSlot(store, slot);
    return s ? [{slot, savedAt:s.savedAt, seed:s.seed, simTime:s.simTime, score:s.score}] : [];});
}
export function writeSlot(store: SlotStorage, slot: VaultSlot, save: SavedKingdom, replace = false):
  'saved' | 'occupied' | 'invalid' | 'storage-unavailable' {
  if (!VAULT_SLOTS.includes(slot)) return 'invalid';
  const serialized = JSON.stringify(save);
  if (serialized.length > MAX_SAVE_BYTES || !parseKingdom(serialized)) return 'invalid';
  try {
    // Corrupted slots still require an explicit replacement; never silently erase user bytes.
    if (!replace && store.getItem(vaultKey(slot)) !== null) return 'occupied';
    store.setItem(vaultKey(slot), serialized);
    return 'saved';
  } catch (_) {return 'storage-unavailable';}
}
