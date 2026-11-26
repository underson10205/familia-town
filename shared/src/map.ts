import type { JobId } from './types.js';

export const TILE_SIZE = 48;
export const MAP_COLS = 36;
export const MAP_ROWS = 26;
export const WORLD_WIDTH = MAP_COLS * TILE_SIZE; // 1728
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE; // 1248

export interface BuildingDef {
  id: string;
  name: string;
  emoji: string;
  kind: 'guild' | 'shop' | 'house' | 'hall' | 'dungeon' | 'pasture';
  jobId?: JobId;
  plotIndex?: number; // 0..3 for player houses
  x: number; // tile x
  y: number; // tile y
  w: number; // tiles wide
  h: number; // tiles high
  roofColor: string;
  wallColor: string;
  doorTileX: number;
  doorTileY: number;
  solid: boolean;
}

export const BUILDINGS: BuildingDef[] = [
  // North: Dungeon Entrance & Adventurer's Guild
  {
    id: 'dungeon_gate',
    name: 'はじまりの森ダンジョン',
    emoji: '🌲',
    kind: 'dungeon',
    jobId: 'adventurer',
    x: 15,
    y: 1,
    w: 6,
    h: 3,
    roofColor: '#4E6B52',
    wallColor: '#7C7D7A',
    doorTileX: 17.5,
    doorTileY: 4,
    solid: true,
  },
  {
    id: 'adventurer_guild',
    name: '冒険者ギルド',
    emoji: '⚔️',
    kind: 'guild',
    jobId: 'adventurer',
    x: 5,
    y: 3,
    w: 5,
    h: 4,
    roofColor: '#C84B4B',
    wallColor: '#F5E6CA',
    doorTileX: 7,
    doorTileY: 7,
    solid: true,
  },
  {
    id: 'town_hall',
    name: 'ファミリア役場（転職・掲示板）',
    emoji: '🏛️',
    kind: 'hall',
    x: 25,
    y: 3,
    w: 6,
    h: 4,
    roofColor: '#4A7FB5',
    wallColor: '#F8F1E3',
    doorTileX: 27.5,
    doorTileY: 7,
    solid: true,
  },

  // West Wing: Blacksmith & Apothecary
  {
    id: 'blacksmith_shop',
    name: 'ほのおの鍛冶屋',
    emoji: '🔨',
    kind: 'shop',
    jobId: 'blacksmith',
    x: 3,
    y: 10,
    w: 5,
    h: 4,
    roofColor: '#B85C2A',
    wallColor: '#EBD9C1',
    doorTileX: 5,
    doorTileY: 14,
    solid: true,
  },
  {
    id: 'apothecary_shop',
    name: '森の調合堂（薬局）',
    emoji: '⚗️',
    kind: 'shop',
    jobId: 'apothecary',
    x: 3,
    y: 17,
    w: 5,
    h: 4,
    roofColor: '#7A54A8',
    wallColor: '#F2EBF9',
    doorTileX: 5,
    doorTileY: 21,
    solid: true,
  },

  // East Wing: Realtor, Beauty Salon & Farm/Pasture
  {
    id: 'realtor_office',
    name: 'くらし不動産',
    emoji: '🏡',
    kind: 'shop',
    jobId: 'realtor',
    x: 27,
    y: 10,
    w: 5,
    h: 4,
    roofColor: '#3687A8',
    wallColor: '#EAF5F9',
    doorTileX: 29,
    doorTileY: 14,
    solid: true,
  },
  {
    id: 'beauty_salon',
    name: 'パステル美容サロン',
    emoji: '✂️',
    kind: 'shop',
    jobId: 'beautician',
    x: 27,
    y: 17,
    w: 5,
    h: 4,
    roofColor: '#DF6E98',
    wallColor: '#FDF0F4',
    doorTileX: 29,
    doorTileY: 21,
    solid: true,
  },
  {
    id: 'farm_pasture',
    name: 'ひだまり農園＆牧場',
    emoji: '🌾',
    kind: 'pasture',
    jobId: 'farmer',
    x: 11,
    y: 17,
    w: 13,
    h: 3,
    roofColor: '#69A854',
    wallColor: '#D6B27A',
    doorTileX: 17,
    doorTileY: 16.5,
    solid: false,
  },

  // South Residential Row: 4 Starter Player Houses
  {
    id: 'house_0',
    name: '1ばんちの小さな家',
    emoji: '🏠',
    kind: 'house',
    plotIndex: 0,
    x: 9,
    y: 21,
    w: 4,
    h: 3,
    roofColor: '#D97B66',
    wallColor: '#FFF5E6',
    doorTileX: 10.5,
    doorTileY: 24,
    solid: true,
  },
  {
    id: 'house_1',
    name: '2ばんちの小さな家',
    emoji: '🏠',
    kind: 'house',
    plotIndex: 1,
    x: 14,
    y: 21,
    w: 4,
    h: 3,
    roofColor: '#66A3D9',
    wallColor: '#FFF5E6',
    doorTileX: 15.5,
    doorTileY: 24,
    solid: true,
  },
  {
    id: 'house_2',
    name: '3ばんちの小さな家',
    emoji: '🏠',
    kind: 'house',
    plotIndex: 2,
    x: 19,
    y: 21,
    w: 4,
    h: 3,
    roofColor: '#78B872',
    wallColor: '#FFF5E6',
    doorTileX: 20.5,
    doorTileY: 24,
    solid: true,
  },
  {
    id: 'house_3',
    name: '4ばんちの小さな家',
    emoji: '🏠',
    kind: 'house',
    plotIndex: 3,
    x: 24,
    y: 21,
    w: 4,
    h: 3,
    roofColor: '#D9A756',
    wallColor: '#FFF5E6',
    doorTileX: 25.5,
    doorTileY: 24,
    solid: true,
  },
];

// Central Plaza Fountain
export const FOUNTAIN_CENTER = {
  x: 18 * TILE_SIZE,
  y: 11.5 * TILE_SIZE,
  radius: 52,
};

export const TOWN_SPAWN = {
  x: 18 * TILE_SIZE,
  y: 14 * TILE_SIZE,
};

export function clampAndResolvePosition(x: number, y: number, radius = 16): { x: number; y: number } {
  let nx = Math.max(TILE_SIZE + radius, Math.min(WORLD_WIDTH - TILE_SIZE - radius, x));
  let ny = Math.max(TILE_SIZE + radius, Math.min(WORLD_HEIGHT - TILE_SIZE - radius, y));

  // Push out of solid buildings
  for (const b of BUILDINGS) {
    if (!b.solid) continue;
    const left = b.x * TILE_SIZE;
    const right = (b.x + b.w) * TILE_SIZE;
    const top = (b.y + 0.6) * TILE_SIZE; // allow slight overlap with roof top for depth
    const bottom = (b.y + b.h) * TILE_SIZE;

    const closestX = Math.max(left, Math.min(nx, right));
    const closestY = Math.max(top, Math.min(ny, bottom));
    const dx = nx - closestX;
    const dy = ny - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius) {
      if (distSq === 0) {
        ny = bottom + radius;
      } else {
        const dist = Math.sqrt(distSq);
        nx = closestX + (dx / dist) * radius;
        ny = closestY + (dy / dist) * radius;
      }
    }
  }

  // Push out of fountain
  const fdx = nx - FOUNTAIN_CENTER.x;
  const fdy = ny - FOUNTAIN_CENTER.y;
  const fDistSq = fdx * fdx + fdy * fdy;
  const minDist = FOUNTAIN_CENTER.radius + radius;
  if (fDistSq < minDist * minDist) {
    const dist = Math.sqrt(fDistSq) || 1;
    nx = FOUNTAIN_CENTER.x + (fdx / dist) * minDist;
    ny = FOUNTAIN_CENTER.y + (fdy / dist) * minDist;
  }

  return { x: nx, y: ny };
}
