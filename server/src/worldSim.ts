import {
  type NpcData,
  type Season,
  type WorldClock,
  MAX_PLAYERS,
  clampAndResolvePosition,
} from '@familia-town/shared';
import type { StoredWorldClock } from './db.js';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const DAYS_PER_SEASON = 7;
// 1 game day (1440 min) = 5 real minutes (300s) -> 4.8 game minutes per real second
export const GAME_MINUTES_PER_REAL_SECOND = 4.8;

export interface ClockAdvanceResult {
  clock: StoredWorldClock;
  newDay: boolean;
  newYear: boolean;
}

/**
 * Advances the shared world clock ONLY when at least 1 player is online.
 */
export function advanceWorldClock(
  current: StoredWorldClock,
  deltaSeconds: number,
  onlineCount: number
): ClockAdvanceResult {
  if (onlineCount <= 0 || deltaSeconds <= 0) {
    return { clock: { ...current }, newDay: false, newYear: false };
  }

  let minuteOfDay = current.minuteOfDay + deltaSeconds * GAME_MINUTES_PER_REAL_SECOND;
  let day = current.day;
  let seasonIndex = SEASONS.indexOf(current.season);
  let year = current.year;
  let newDay = false;
  let newYear = false;

  while (minuteOfDay >= 1440) {
    minuteOfDay -= 1440;
    day += 1;
    newDay = true;
    if (day > DAYS_PER_SEASON) {
      day = 1;
      seasonIndex += 1;
      if (seasonIndex >= SEASONS.length) {
        seasonIndex = 0;
        year += 1;
        newYear = true;
      }
    }
  }

  return {
    clock: {
      year,
      season: SEASONS[seasonIndex],
      day,
      minuteOfDay,
    },
    newDay,
    newYear,
  };
}

export function toPublicClock(stored: StoredWorldClock, onlineCount: number): WorldClock {
  return {
    year: stored.year,
    season: stored.season,
    day: stored.day,
    minuteOfDay: Math.floor(stored.minuteOfDay),
    paused: onlineCount === 0,
    onlineCount,
    maxPlayers: MAX_PLAYERS,
  };
}

interface NpcWanderState {
  targetX: number;
  targetY: number;
  waitUntil: number;
}

export class NpcSimulator {
  private states = new Map<string, NpcWanderState>();

  step(npcs: NpcData[], dtSeconds: number, now: number): void {
    const speed = 42; // gentle stroll px/sec
    for (const npc of npcs) {
      let st = this.states.get(npc.id);
      if (!st) {
        st = { targetX: npc.homeX, targetY: npc.homeY, waitUntil: now + 2000 + Math.random() * 4000 };
        this.states.set(npc.id, st);
      }

      if (now < st.waitUntil) {
        npc.moving = false;
        continue;
      }

      const dx = st.targetX - npc.x;
      const dy = st.targetY - npc.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4) {
        npc.moving = false;
        // Pick a new nearby gentle wander target within 75px of home
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 65;
        const resolved = clampAndResolvePosition(
          npc.homeX + Math.cos(angle) * radius,
          npc.homeY + Math.sin(angle) * radius
        );
        st.targetX = resolved.x;
        st.targetY = resolved.y;
        st.waitUntil = now + 2500 + Math.random() * 5000;
      } else {
        const moveDist = Math.min(dist, speed * dtSeconds);
        const nx = npc.x + (dx / dist) * moveDist;
        const ny = npc.y + (dy / dist) * moveDist;
        const resolved = clampAndResolvePosition(nx, ny);
        npc.x = resolved.x;
        npc.y = resolved.y;
        npc.moving = true;
        if (Math.abs(dx) > Math.abs(dy)) {
          npc.dir = dx > 0 ? 'right' : 'left';
        } else {
          npc.dir = dy > 0 ? 'down' : 'up';
        }
      }
    }
  }
}
