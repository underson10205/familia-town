import { describe, it, expect } from 'vitest';
import { advanceWorldClock, DAYS_PER_SEASON, GAME_MINUTES_PER_REAL_SECOND } from './worldSim.js';
import type { StoredWorldClock } from './db.js';

describe('shared world clock simulation', () => {
  const startClock: StoredWorldClock = {
    year: 1,
    season: 'spring',
    day: 1,
    minuteOfDay: 540, // 09:00
  };

  it('pauses completely when 0 players are online', () => {
    const res = advanceWorldClock(startClock, 600, 0);
    expect(res.clock).toEqual(startClock);
    expect(res.newDay).toBe(false);
    expect(res.newYear).toBe(false);
  });

  it('advances time when at least 1 player is online', () => {
    const res = advanceWorldClock(startClock, 10, 1);
    expect(res.clock.minuteOfDay).toBeCloseTo(540 + 10 * GAME_MINUTES_PER_REAL_SECOND, 5);
    expect(res.newDay).toBe(false);
  });

  it('rolls over day, season, and year properly', () => {
    const endOfYear: StoredWorldClock = {
      year: 1,
      season: 'winter',
      day: DAYS_PER_SEASON,
      minuteOfDay: 1430,
    };
    const res = advanceWorldClock(endOfYear, 10, 2); // +48 game minutes
    expect(res.newDay).toBe(true);
    expect(res.newYear).toBe(true);
    expect(res.clock.year).toBe(2);
    expect(res.clock.season).toBe('spring');
    expect(res.clock.day).toBe(1);
    expect(res.clock.minuteOfDay).toBeCloseTo(38, 5);
  });
});
