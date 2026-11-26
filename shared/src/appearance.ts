import type { Appearance, Gender } from './types.js';

export const SKIN_COLORS = [
  '#FFE3C8', // 明るいもも肌
  '#FAD2B0', // やわらかベージュ
  '#F2BC94', // げんき小麦肌
  '#DF9F73', // あたたかタン
  '#B87B56', // ココア肌
];

export const HAIR_COLORS = [
  '#4A3728', // チョコブラウン
  '#2C2A35', // くろかみ
  '#D98A3C', // ハニーオレンジ
  '#E8C563', // ブロンド
  '#C95B5B', // ストロベリーレッド
  '#6E8EC9', // スカイブルー
  '#7BAE7F', // フォレストグリーン
  '#B784C9', // ラベンダー
  '#E598B2', // さくらピンク
  '#E8E6E1', // シルバーホワイト
];

export const EYE_COLORS = [
  '#3A2E2A', // ダークブラウン
  '#2E6DA4', // サファイアブルー
  '#3B8C57', // エメラルドグリーン
  '#C47D2C', // アンバーゴールド
  '#8C4FA8', // アメジストパープル
  '#C44B6C', // ローズピンク
];

export const OUTFIT_COLORS = [
  '#E06B6B', // りんごレッド
  '#5A9BD5', // そらいろブルー
  '#6BB377', // わかばグリーン
  '#E6B44C', // ひまわりイエロー
  '#A57BC9', // すみれパープル
  '#E88FA8', // ももいろピンク
  '#5D6D7E', // ネイビー
  '#D98B5F', // テラコッタ
];

export const HAIR_STYLE_NAMES = [
  'さらさらショート',
  'ふんわりボブ',
  'ツインテール',
  '元気ツンツン',
  'ゆるふわロング',
  'ポニーテール',
  'おだんごヘア',
  'マッシュカット',
];

export const EYE_SHAPE_NAMES = [
  'まんまるキラキラ',
  'にっこりアーモンド',
  'おっとりタレ目',
  'きりっと元気目',
  'きらめきスター',
];

export const OUTFIT_NAMES = [
  'まちのチュニック',
  'オーバーオール',
  'ふんわりワンピース',
  'ぼうけんベスト',
  'カフェエプロン',
  'おでかけマント',
];

export const ACCESSORY_NAMES = [
  'なし',
  'あかいリボン',
  'むぎわら帽子',
  'まるメガネ',
  'おはなピン',
  'ベレー帽',
];

export function randomAppearance(gender: Gender, rng: () => number = Math.random): Appearance {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const maleHairStyles = [0, 3, 7, 1];
  const femaleHairStyles = [1, 2, 4, 5, 6];
  const maleOutfits = [0, 1, 3, 4, 5];
  const femaleOutfits = [0, 2, 4, 5, 1];

  return {
    skinColor: pick(SKIN_COLORS),
    hairStyle: gender === 'male' ? pick(maleHairStyles) : pick(femaleHairStyles),
    hairColor: pick(HAIR_COLORS),
    eyeShape: Math.floor(rng() * EYE_SHAPE_NAMES.length),
    eyeColor: pick(EYE_COLORS),
    browStyle: Math.floor(rng() * 3),
    cheekStyle: Math.floor(rng() * 3),
    outfitId: gender === 'male' ? pick(maleOutfits) : pick(femaleOutfits),
    outfitColor: pick(OUTFIT_COLORS),
    accessoryId: rng() < 0.45 ? 0 : 1 + Math.floor(rng() * (ACCESSORY_NAMES.length - 1)),
  };
}

/**
 * Generates a child's appearance by inheriting traits from both parents.
 * Each trait has 45% chance from parentA, 45% chance from parentB, and 10% rare mutation.
 */
export function inheritAppearance(
  parentA: Appearance,
  parentB: Appearance,
  childGender: Gender,
  rng: () => number = Math.random
): Appearance {
  const inheritTrait = <T,>(a: T, b: T, pool: T[]): T => {
    const roll = rng();
    if (roll < 0.45) return a;
    if (roll < 0.9) return b;
    return pool[Math.floor(rng() * pool.length)];
  };

  const maleHairStyles = [0, 3, 7];
  const femaleHairStyles = [1, 2, 4, 5, 6];
  const hairPool = childGender === 'male' ? maleHairStyles : femaleHairStyles;
  const outfitPool = childGender === 'male' ? [0, 1, 3, 4] : [0, 2, 4, 5];

  return {
    skinColor: inheritTrait(parentA.skinColor, parentB.skinColor, SKIN_COLORS),
    hairStyle: inheritTrait(parentA.hairStyle, parentB.hairStyle, hairPool),
    hairColor: inheritTrait(parentA.hairColor, parentB.hairColor, HAIR_COLORS),
    eyeShape: inheritTrait(parentA.eyeShape, parentB.eyeShape, [0, 1, 2, 3, 4]),
    eyeColor: inheritTrait(parentA.eyeColor, parentB.eyeColor, EYE_COLORS),
    browStyle: inheritTrait(parentA.browStyle, parentB.browStyle, [0, 1, 2]),
    cheekStyle: inheritTrait(parentA.cheekStyle, parentB.cheekStyle, [0, 1, 2]),
    outfitId: outfitPool[Math.floor(rng() * outfitPool.length)],
    outfitColor: inheritTrait(parentA.outfitColor, parentB.outfitColor, OUTFIT_COLORS),
    accessoryId: rng() < 0.5 ? 0 : inheritTrait(parentA.accessoryId, parentB.accessoryId, [1, 2, 3, 4, 5]),
  };
}
