import { describe, it, expect } from 'vitest';
import {
  inheritAppearance,
  randomAppearance,
  SKIN_COLORS,
  HAIR_COLORS,
  EYE_COLORS,
} from './appearance.js';

describe('appearance & genetic inheritance', () => {
  it('generates valid random appearance for male and female', () => {
    const boy = randomAppearance('male', () => 0.25);
    const girl = randomAppearance('female', () => 0.75);

    expect(SKIN_COLORS).toContain(boy.skinColor);
    expect(HAIR_COLORS).toContain(boy.hairColor);
    expect(EYE_COLORS).toContain(girl.eyeColor);
    expect(boy.hairStyle).toBeGreaterThanOrEqual(0);
    expect(girl.hairStyle).toBeGreaterThanOrEqual(0);
  });

  it('inherits traits from parentA when roll < 0.45', () => {
    const parentA = randomAppearance('male', () => 0.1);
    const parentB = randomAppearance('female', () => 0.8);

    const child = inheritAppearance(parentA, parentB, 'female', () => 0.2);
    expect(child.skinColor).toBe(parentA.skinColor);
    expect(child.hairColor).toBe(parentA.hairColor);
    expect(child.eyeColor).toBe(parentA.eyeColor);
    expect(child.eyeShape).toBe(parentA.eyeShape);
  });

  it('inherits traits from parentB when 0.45 <= roll < 0.90', () => {
    const parentA = randomAppearance('male', () => 0.1);
    const parentB = randomAppearance('female', () => 0.8);

    const child = inheritAppearance(parentA, parentB, 'male', () => 0.6);
    expect(child.skinColor).toBe(parentB.skinColor);
    expect(child.hairColor).toBe(parentB.hairColor);
    expect(child.eyeColor).toBe(parentB.eyeColor);
    expect(child.eyeShape).toBe(parentB.eyeShape);
  });

  it('produces valid palette traits even on rare mutation roll >= 0.90', () => {
    const parentA = randomAppearance('male', () => 0.1);
    const parentB = randomAppearance('female', () => 0.8);

    const child = inheritAppearance(parentA, parentB, 'female', () => 0.95);
    expect(SKIN_COLORS).toContain(child.skinColor);
    expect(HAIR_COLORS).toContain(child.hairColor);
    expect(EYE_COLORS).toContain(child.eyeColor);
  });
});
