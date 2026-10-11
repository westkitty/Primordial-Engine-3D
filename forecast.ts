/** A no-mutation immediate-impact estimate using the actual world/ground rules. */
import {FIELD_EXTENT, impactGround, type GroundField} from './environment';
import {applyMiracle, type MiracleRequest, type WorldBlock, type WorldSnapshot, type WorldTree} from './simulation';

export interface ImpactForecast {
  permitted: boolean;
  delayed: boolean;
  collapsed: number;
  ignited: number;
  repaired: number;
  recoveredTrees: number;
  affectedCells: number;
  steamCells: number;
  newStone: number;
}

export function insideKingdom(x: number, z: number): boolean {
  const playable = FIELD_EXTENT / 2 - 3;
  return Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= playable && Math.abs(z) <= playable;
}
export function forecastImpact<B extends WorldBlock, T extends WorldTree>(
  current: WorldSnapshot<B,T>, initial: WorldSnapshot<B,T>, field: GroundField,
  request: MiracleRequest,
): ImpactForecast {
  const permitted = insideKingdom(request.x, request.z) && Number.isFinite(request.force) &&
    Number.isFinite(request.radius) && request.radius > 0;
  if (!permitted) return {permitted: false, delayed: false, collapsed: 0, ignited: 0,
    repaired: 0, recoveredTrees: 0, affectedCells: 0, steamCells: 0, newStone: 0};
  const world = applyMiracle(current, initial, request);
  const ground = impactGround(field, request);
  return {permitted: true, delayed: request.type === 'meteor',
    collapsed: world.destroyed.length, ignited: world.treesIgnited,
    repaired: current.blocks.filter((b, i) => b.destroyed && !world.world.blocks[i].destroyed).length,
    recoveredTrees: current.trees.filter((t, i) => t.burnt && !world.world.trees[i].burnt).length,
    affectedCells: ground.affected, steamCells: ground.steam, newStone: ground.formedStone};
}
export function formatForecast(forecast: ImpactForecast): string {
  if (!forecast.permitted) return 'Outside the playable kingdom. Move your target onto the map.';
  return `${forecast.delayed ? 'Meteor landing estimate (delayed): ' : 'Immediate impact estimate: '}` +
    `${forecast.collapsed} structures collapse, ${forecast.ignited} trees ignite, ` +
    `${forecast.repaired} structures repaired, ${forecast.recoveredTrees} trees restored, ` +
    `${forecast.affectedCells} terrain cells affected` +
    `${forecast.steamCells ? `, ${forecast.steamCells} steam reactions` : ''}` +
    `${forecast.newStone ? `, ${forecast.newStone} cooled-stone formations` : ''}. ` +
    'Secondary fires and subsequent weather are not included.';
}
