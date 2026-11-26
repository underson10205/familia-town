import { describe, it, expect } from 'vitest';
import { canUnlockSkill } from './jobs.js';

describe('branching skill tree unlock rules', () => {
  it('allows unlocking root node when player has enough SP', () => {
    expect(canUnlockSkill('adv_root', {}, 1).ok).toBe(true);
    expect(canUnlockSkill('adv_root', {}, 0).ok).toBe(false);
  });

  it('blocks child node until parent node is unlocked', () => {
    const blocked = canUnlockSkill('adv_slash_wide', {}, 5);
    expect(blocked.ok).toBe(false);

    const allowed = canUnlockSkill('adv_slash_wide', { adv_root: 1 }, 5);
    expect(allowed.ok).toBe(true);
  });

  it('blocks unlocking beyond maxRank', () => {
    const maxed = canUnlockSkill('adv_root', { adv_root: 3 }, 5);
    expect(maxed.ok).toBe(false);
  });
});
