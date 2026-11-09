import { hash2 } from '@shared/rng'
import { CANYON_HALF_WIDTH, PLAZA } from '@shared/world'

import { STYLE } from '../materials'
import { SCOREBOARD } from './terrain'

/**
 * Blocky hills round the lobby: grass-topped columns of checkered dirt (STYLE.HILL), one
 * box per column on a 4 m grid, stepping up in terraces the further they stand from the
 * plaza - low banks just past its edge, cliffs 30 m high further out - with the runway's
 * mouth left open to the north (the valley is 190 m long) (Lane.jsx carries the hills on down the runway). Blocky
 * trees grow on the terraces: green ones mostly, now and then a pink blossom.
 *
 * Everything goes into the world's block set: no draw calls of its own, nothing to do per
 * frame. `density` (the preset's decorDensity) thins the trees and, on LOW, coarsens the
 * grid to 8 m columns (a quarter of the boxes).
 */

/** The open ground the hills keep clear of: the plaza and everything round its edge. */
const OPEN = { minX: PLAZA.minX - 4, maxX: PLAZA.maxX + 4, minZ: PLAZA.minZ, maxZ: PLAZA.maxZ + 4 }
/** The runway's valley floor, north of the plaza, left open for it. */
const VALLEY_HALF = CANYON_HALF_WIDTH + 6
/** How far out the hills go, from the middle. */
const REACH = { x: 96, south: 262, north: -104 }

const DIRT = ['#b98552', '#a8743f']
const LEAVES = ['#3fbf3a', '#54d34a', '#2fa83a']
const BLOSSOM = ['#ff9fd6', '#ffc0e4']
const TRUNK = '#8a5a32'

/** Metres from (x, z) to the nearest open ground (the plaza, or the runway's valley). */
function openDistance(x, z) {
  const dx = Math.max(OPEN.minX - x, 0, x - OPEN.maxX)
  const dz = Math.max(OPEN.minZ - z, 0, z - OPEN.maxZ)
  const plaza = Math.hypot(dx, dz)
  const valley = z < OPEN.minZ ? Math.max(0, Math.abs(x) - VALLEY_HALF) : Infinity
  return Math.min(plaza, valley)
}

/** Under the scoreboard on the south hills: kept below its screen. */
const underScoreboard = (x, z) =>
  Math.abs(x - SCOREBOARD.x) < SCOREBOARD.width / 2 + 3 && Math.abs(z - SCOREBOARD.z) < 4

/** A blocky tree standing on (x, top, z): a trunk and two tiers of leaf cubes. */
function addTree(blocks, x, top, z, k) {
  const pink = hash2(k, 31) > 0.82
  const leaves = pink ? BLOSSOM : LEAVES
  const h = 2.2 + hash2(k, 32) * 1.6
  blocks.addOn(x, top, z, 0.9, h, 0.9, TRUNK, STYLE.SMOOTH)
  blocks.addOn(x, top + h, z, 3.4, 2.2, 3.4, leaves[0], STYLE.STUDS)
  blocks.addOn(x, top + h + 2.2, z, 2.2, 1.6, 2.2, leaves[1 % leaves.length], STYLE.STUDS)
}

/**
 * Builds the hills into `blocks`. Returns how many columns and trees went in (for
 * tests/debug).
 */
export function buildHills(blocks, { density = 1 } = {}) {
  const cell = density < 0.5 ? 8 : 4
  const treeChance = density >= 0.75 ? 0.07 : density >= 0.5 ? 0.05 : 0.035
  let columns = 0
  let trees = 0
  for (let gx = -REACH.x; gx < REACH.x; gx += cell) {
    for (let gz = REACH.north; gz < REACH.south; gz += cell) {
      const x = gx + cell / 2
      const z = gz + cell / 2
      const d = openDistance(x, z)
      if (d < 2) continue
      // Terraces 4 m apart in height, every ~9 m out, with a little noise so the edges
      // wander; never higher than 36 m.
      const k = Math.floor(gx / 4) * 977 + Math.floor(gz / 4)
      const n = hash2(Math.floor(gx / 8), Math.floor(gz / 8))
      let h = 4 * Math.min(9, 1 + Math.floor(d / 9 + n * 1.3))
      if (underScoreboard(x, z)) h = Math.min(h, 20)
      const dirt = DIRT[(Math.floor(gx / 4) + Math.floor(gz / 4)) & 1]
      blocks.addOn(x, 0, z, cell, h, cell, dirt, STYLE.HILL)
      columns += 1
      // A tree now and then on a terrace near enough to be seen.
      if (d < 70 && hash2(k, 30) < treeChance * (cell / 4) ** 2) {
        addTree(blocks, x + (hash2(k, 33) - 0.5) * (cell - 3.4), h, z + (hash2(k, 34) - 0.5) * (cell - 3.4), k)
        trees += 1
      }
    }
  }
  return { columns, trees }
}
