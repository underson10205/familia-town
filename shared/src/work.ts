import type { JobId } from './types.js';

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  category: 'food' | 'material' | 'product';
  buyPrice?: number;
  sellPrice: number;
  hungerRestore?: number;
  staminaRestore?: number;
}

export const ITEMS: Record<string, ItemDef> = {
  // Food (buyable from Farmer NPC & craftable/dropped)
  onigiri: { id: 'onigiri', name: 'ほかほかおにぎり', emoji: '🍙', category: 'food', buyPrice: 30, sellPrice: 12, hungerRestore: 35, staminaRestore: 25 },
  carrot: { id: 'carrot', name: 'あまいにんじん', emoji: '🥕', category: 'food', buyPrice: 45, sellPrice: 22, hungerRestore: 30, staminaRestore: 20 },
  milk: { id: 'milk', name: 'しぼりたてミルク', emoji: '🥛', category: 'food', buyPrice: 70, sellPrice: 35, hungerRestore: 45, staminaRestore: 40 },
  cheese: { id: 'cheese', name: '牧場チーズ', emoji: '🧀', category: 'food', buyPrice: 130, sellPrice: 70, hungerRestore: 75, staminaRestore: 60 },
  golden_berry: { id: 'golden_berry', name: 'おうごんイチゴ', emoji: '🍓', category: 'food', sellPrice: 110, hungerRestore: 80, staminaRestore: 80 },

  // Materials
  iron_ore: { id: 'iron_ore', name: 'てっこうせき', emoji: '🪨', category: 'material', sellPrice: 40 },
  silver_ore: { id: 'silver_ore', name: 'ぎんこうせき', emoji: '💎', category: 'material', sellPrice: 95 },
  herb: { id: 'herb', name: 'みどりの薬草', emoji: '🌿', category: 'material', sellPrice: 30 },
  slime_gel: { id: 'slime_gel', name: 'ぷるぷるゼリー', emoji: '💧', category: 'material', sellPrice: 35 },

  // Crafted products
  iron_sword: { id: 'iron_sword', name: 'てつの剣', emoji: '🗡️', category: 'product', sellPrice: 140 },
  silver_armor: { id: 'silver_armor', name: 'ぎんの鎧', emoji: '🛡️', category: 'product', sellPrice: 280 },
  heal_potion: { id: 'heal_potion', name: 'かいふく薬', emoji: '🧪', category: 'product', sellPrice: 90, hungerRestore: 20, staminaRestore: 70 },
  rainbow_elixir: { id: 'rainbow_elixir', name: '虹いろポーション', emoji: '🌈', category: 'product', sellPrice: 260, hungerRestore: 60, staminaRestore: 100 },
  blueprint_pack: { id: 'blueprint_pack', name: 'すてきな設計図', emoji: '📐', category: 'product', sellPrice: 160 },
  style_ribbon: { id: 'style_ribbon', name: 'おしゃれコーデ券', emoji: '🎀', category: 'product', sellPrice: 150 },
};

export const SHOP_ITEM_IDS = ['onigiri', 'carrot', 'milk', 'cheese'];

export interface WorkRecipeDef {
  id: string;
  jobId: JobId;
  name: string;
  emoji: string;
  tier: 1 | 2 | 3; // 1: Easy, 2: Medium, 3: Hard
  description: string;
  requiredSkillId?: string;
  hungerCost: number;
  baseGold: number;
  baseXp: number;
  rewardItemId: string;
  rewardItemCount: number;
}

export const WORK_RECIPES: WorkRecipeDef[] = [
  // Adventurer
  {
    id: 'work_adv_1',
    jobId: 'adventurer',
    name: '森のスライム退治',
    emoji: '🟢',
    tier: 1,
    description: 'はじまりの森でスライムを倒して素材を集めよう！',
    hungerCost: 12,
    baseGold: 90,
    baseXp: 40,
    rewardItemId: 'slime_gel',
    rewardItemCount: 2,
  },
  {
    id: 'work_adv_2',
    jobId: 'adventurer',
    name: '鉱石どうくつ探検',
    emoji: '🪨',
    tier: 2,
    description: 'すばやいモンスターをかわして鉄鉱石と宝箱をゲット！',
    hungerCost: 18,
    baseGold: 160,
    baseXp: 70,
    rewardItemId: 'iron_ore',
    rewardItemCount: 2,
  },
  {
    id: 'work_adv_3',
    jobId: 'adventurer',
    name: '深層ダンジョン攻略',
    emoji: '🐉',
    tier: 3,
    description: '手ごわい深層エリアで銀鉱石とお宝をねらおう！',
    requiredSkillId: 'adv_boss_key',
    hungerCost: 24,
    baseGold: 290,
    baseXp: 110,
    rewardItemId: 'silver_ore',
    rewardItemCount: 2,
  },

  // Blacksmith
  {
    id: 'work_blk_1',
    jobId: 'blacksmith',
    name: 'どうのナイフ鍛造',
    emoji: '🔪',
    tier: 1,
    description: 'ゆっくり動くゲージに合わせてカンカン叩こう！',
    hungerCost: 10,
    baseGold: 85,
    baseXp: 40,
    rewardItemId: 'iron_ore',
    rewardItemCount: 1,
  },
  {
    id: 'work_blk_2',
    jobId: 'blacksmith',
    name: 'てつの剣づくり',
    emoji: '🗡️',
    tier: 2,
    description: '少し速い鍛造ゲージ！成功ゾーンを狙って名剣を作ろう。',
    hungerCost: 16,
    baseGold: 155,
    baseXp: 70,
    rewardItemId: 'iron_sword',
    rewardItemCount: 1,
  },
  {
    id: 'work_blk_3',
    jobId: 'blacksmith',
    name: 'ぎんの鎧づくり',
    emoji: '🛡️',
    tier: 3,
    description: '高難度の高速ゲージ！補助スキルがあると安定するよ。',
    requiredSkillId: 'blk_silver_craft',
    hungerCost: 22,
    baseGold: 280,
    baseXp: 110,
    rewardItemId: 'silver_armor',
    rewardItemCount: 1,
  },

  // Apothecary
  {
    id: 'work_alc_1',
    jobId: 'apothecary',
    name: 'かいふく薬の調合',
    emoji: '🧪',
    tier: 1,
    description: '釜の火加減を緑ゾーンにキープしてお薬を作ろう！',
    hungerCost: 10,
    baseGold: 85,
    baseXp: 40,
    rewardItemId: 'heal_potion',
    rewardItemCount: 1,
  },
  {
    id: 'work_alc_2',
    jobId: 'apothecary',
    name: '薬草ブレンド調合',
    emoji: '🌿',
    tier: 2,
    description: 'ゆらゆら揺れる火加減を上手にコントロールしよう！',
    hungerCost: 15,
    baseGold: 150,
    baseXp: 70,
    rewardItemId: 'herb',
    rewardItemCount: 2,
  },
  {
    id: 'work_alc_3',
    jobId: 'apothecary',
    name: '虹いろポーション調合',
    emoji: '🌈',
    tier: 3,
    description: '激しく動く温度計をキープする上級調合！',
    requiredSkillId: 'alc_elixir',
    hungerCost: 22,
    baseGold: 285,
    baseXp: 110,
    rewardItemId: 'rainbow_elixir',
    rewardItemCount: 1,
  },

  // Farmer
  {
    id: 'work_frm_1',
    jobId: 'farmer',
    name: 'にんじん畑のお世話',
    emoji: '🥕',
    tier: 1,
    description: '畑に出てくる水やり・収穫アイコンをリズムよくタップ！',
    hungerCost: 10,
    baseGold: 80,
    baseXp: 40,
    rewardItemId: 'carrot',
    rewardItemCount: 2,
  },
  {
    id: 'work_frm_2',
    jobId: 'farmer',
    name: '牛・豚の牧場お世話',
    emoji: '🐄',
    tier: 2,
    description: 'にぎやかな牧場でエサやり＆ミルクしぼりに挑戦！',
    hungerCost: 15,
    baseGold: 145,
    baseXp: 70,
    rewardItemId: 'milk',
    rewardItemCount: 2,
  },
  {
    id: 'work_frm_3',
    jobId: 'farmer',
    name: 'おうごんイチゴ収穫',
    emoji: '🍓',
    tier: 3,
    description: '素早く消えるレア作物をどんどん収穫しよう！',
    requiredSkillId: 'frm_golden_crop',
    hungerCost: 20,
    baseGold: 270,
    baseXp: 110,
    rewardItemId: 'golden_berry',
    rewardItemCount: 2,
  },

  // Realtor
  {
    id: 'work_rel_1',
    jobId: 'realtor',
    name: '小さな家の間取り相談',
    emoji: '🏠',
    tier: 1,
    description: 'お客さんの希望どおりに3つの部屋を配置しよう！',
    hungerCost: 10,
    baseGold: 95,
    baseXp: 40,
    rewardItemId: 'blueprint_pack',
    rewardItemCount: 1,
  },
  {
    id: 'work_rel_2',
    jobId: 'realtor',
    name: 'ファミリーハウス設計',
    emoji: '🏡',
    tier: 2,
    description: '4つの希望条件にぴったり合う間取りをパズルで完成！',
    hungerCost: 15,
    baseGold: 165,
    baseXp: 70,
    rewardItemId: 'blueprint_pack',
    rewardItemCount: 1,
  },
  {
    id: 'work_rel_3',
    jobId: 'realtor',
    name: 'おしろ風ハウス設計',
    emoji: '🏰',
    tier: 3,
    description: '5つの豪華な部屋を制限時間内に美しくレイアウト！',
    requiredSkillId: 'rel_mansion',
    hungerCost: 20,
    baseGold: 295,
    baseXp: 110,
    rewardItemId: 'blueprint_pack',
    rewardItemCount: 2,
  },

  // Beautician
  {
    id: 'work_bty_1',
    jobId: 'beautician',
    name: 'さらさらカット＆ブロー',
    emoji: '✂️',
    tier: 1,
    description: '流れてくるカットアイコンをタイミングよくタップしよう！',
    hungerCost: 10,
    baseGold: 90,
    baseXp: 40,
    rewardItemId: 'style_ribbon',
    rewardItemCount: 1,
  },
  {
    id: 'work_bty_2',
    jobId: 'beautician',
    name: 'ときめきヘア＆メイク',
    emoji: '💄',
    tier: 2,
    description: 'テンポアップしたおしゃれリズムで素敵に大変身！',
    hungerCost: 15,
    baseGold: 160,
    baseXp: 70,
    rewardItemId: 'style_ribbon',
    rewardItemCount: 1,
  },
  {
    id: 'work_bty_3',
    jobId: 'beautician',
    name: 'お姫さま＆王子コーデ',
    emoji: '👑',
    tier: 3,
    description: 'ハイスピードな特別スタイリング！補助スキルが頼りになるよ。',
    requiredSkillId: 'bty_royal_style',
    hungerCost: 20,
    baseGold: 290,
    baseXp: 110,
    rewardItemId: 'style_ribbon',
    rewardItemCount: 2,
  },
];

export function getRecipesForJob(jobId: JobId): WorkRecipeDef[] {
  return WORK_RECIPES.filter((r) => r.jobId === jobId);
}

export function getRecipeById(recipeId: string): WorkRecipeDef | undefined {
  return WORK_RECIPES.find((r) => r.id === recipeId);
}

export function xpNeededForLevel(level: number): number {
  return 60 + (level - 1) * 45;
}
