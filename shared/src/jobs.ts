import type { JobId, JobProgress } from './types.js';

export interface SkillNodeDef {
  id: string;
  jobId: JobId;
  name: string;
  description: string;
  icon: string;
  category: 'core' | 'assist' | 'recipe' | 'passive';
  cost: number; // SP per rank
  maxRank: number;
  requires: string[]; // Parent node IDs (at least rank 1 needed)
  // Visual tree coordinates (0..100 percent space)
  x: number;
  y: number;
}

export interface JobDef {
  id: JobId;
  name: string;
  emoji: string;
  color: string;
  accentColor: string;
  shortDesc: string;
  starterFacility: string;
  minigameSummary: string;
  skills: SkillNodeDef[];
}

export const JOBS: Record<JobId, JobDef> = {
  adventurer: {
    id: 'adventurer',
    name: '冒険家',
    emoji: '⚔️',
    color: '#D9534F',
    accentColor: '#FDE8E8',
    shortDesc: 'ギルドの依頼を受けてダンジョンを探検！モンスター討伐や素材・宝箱で稼ぐよ。',
    starterFacility: '冒険者ギルド証＆木の剣',
    minigameSummary: 'リアルタイム移動＆ワンボタン攻撃・採取アクション',
    skills: [
      { id: 'adv_root', jobId: 'adventurer', name: 'ぼうけんの基礎', description: 'ダンジョンでの攻撃力・採取スピードがアップ', icon: '⚔️', category: 'core', cost: 1, maxRank: 3, requires: [], x: 50, y: 16 },
      { id: 'adv_slash_wide', jobId: 'adventurer', name: 'ひろびろ斬り', description: '攻撃の範囲が広がってモンスターに当てやすくなる', icon: '🗡️', category: 'assist', cost: 1, maxRank: 3, requires: ['adv_root'], x: 24, y: 48 },
      { id: 'adv_treasure_eye', jobId: 'adventurer', name: 'おたから発見', description: '宝箱やレア素材が見つかりやすくなる', icon: '💎', category: 'passive', cost: 1, maxRank: 3, requires: ['adv_root'], x: 76, y: 48 },
      { id: 'adv_dash', jobId: 'adventurer', name: 'はやてステップ', description: 'すばやく回避ダッシュができるようになる', icon: '💨', category: 'assist', cost: 2, maxRank: 1, requires: ['adv_slash_wide'], x: 18, y: 82 },
      { id: 'adv_boss_key', jobId: 'adventurer', name: '深層ダンジョン解放', description: 'レア鉱石やボスが眠る奥のエリアへ進める', icon: '🗝️', category: 'recipe', cost: 2, maxRank: 1, requires: ['adv_slash_wide', 'adv_treasure_eye'], x: 50, y: 82 },
      { id: 'adv_lucky_bag', jobId: 'adventurer', name: 'たくさんリュック', description: 'ダンジョンから持ち帰れる報酬ゴールドがアップ', icon: '🎒', category: 'passive', cost: 2, maxRank: 2, requires: ['adv_treasure_eye'], x: 82, y: 82 },
    ],
  },
  blacksmith: {
    id: 'blacksmith',
    name: '鍛冶屋',
    emoji: '🔨',
    color: '#D9822B',
    accentColor: '#FEF2E4',
    shortDesc: '鉱石や魔物素材を叩いて、強い武器・防具・農具を作る職人！',
    starterFacility: '小さな鍛冶場（お店つき）',
    minigameSummary: 'タイミングよくハンマーで叩く鍛造ゲージゲーム',
    skills: [
      { id: 'blk_root', jobId: 'blacksmith', name: 'はじめての金床', description: '鍛造で作った装備の基本品質と売値がアップ', icon: '🔨', category: 'core', cost: 1, maxRank: 3, requires: [], x: 50, y: 16 },
      { id: 'blk_wide_zone', jobId: 'blacksmith', name: '安定ハンマー', description: '鍛造ミニゲームの成功ゾーンが広がる', icon: '🎯', category: 'assist', cost: 1, maxRank: 3, requires: ['blk_root'], x: 24, y: 48 },
      { id: 'blk_slow_bar', jobId: 'blacksmith', name: '職人の見切り', description: '高難度レシピでもゲージの動きがゆっくりになる', icon: '⏱️', category: 'assist', cost: 1, maxRank: 3, requires: ['blk_root'], x: 76, y: 48 },
      { id: 'blk_iron_tools', jobId: 'blacksmith', name: '上質な農具づくり', description: '農家さんに大人気の鉄ジョウロ・クワを解放', icon: '⛏️', category: 'recipe', cost: 2, maxRank: 1, requires: ['blk_wide_zone'], x: 20, y: 82 },
      { id: 'blk_silver_craft', jobId: 'blacksmith', name: 'ぎんの鍛造術', description: 'キラキラの銀装備レシピを解放', icon: '⚔️', category: 'recipe', cost: 2, maxRank: 1, requires: ['blk_wide_zone', 'blk_slow_bar'], x: 50, y: 82 },
      { id: 'blk_master_spark', jobId: 'blacksmith', name: '大成功の火花', description: '★3の最高品質ができやすくなる', icon: '✨', category: 'passive', cost: 2, maxRank: 2, requires: ['blk_slow_bar'], x: 80, y: 82 },
    ],
  },
  apothecary: {
    id: 'apothecary',
    name: '薬剤師',
    emoji: '⚗️',
    color: '#7E57C2',
    accentColor: '#F3ECFA',
    shortDesc: '薬草や花を調合して、回復薬・元気ドリンク・美容エッセンスを作るよ。',
    starterFacility: '小さな調合台（お店つき）',
    minigameSummary: '釜の火加減を緑ゾーンに保つバランス調合ゲーム',
    skills: [
      { id: 'alc_root', jobId: 'apothecary', name: '薬草の知恵', description: '調合アイテムの回復量と売値がアップ', icon: '🌿', category: 'core', cost: 1, maxRank: 3, requires: [], x: 50, y: 16 },
      { id: 'alc_steady_fire', jobId: 'apothecary', name: 'おだやか火加減', description: '調合釜の針のブレが小さくなり安定する', icon: '🔥', category: 'assist', cost: 1, maxRank: 3, requires: ['alc_root'], x: 24, y: 48 },
      { id: 'alc_double_brew', jobId: 'apothecary', name: 'お得に二倍調合', description: 'ときどき一度に2個できあがる', icon: '✨', category: 'passive', cost: 1, maxRank: 3, requires: ['alc_root'], x: 76, y: 48 },
      { id: 'alc_beauty_essence', jobId: 'apothecary', name: '美容エッセンス', description: '美容師向けのレア染料・コスメ素材を解放', icon: '💐', category: 'recipe', cost: 2, maxRank: 1, requires: ['alc_steady_fire'], x: 20, y: 82 },
      { id: 'alc_elixir', jobId: 'apothecary', name: '虹いろポーション', description: '冒険者に大人気の特効薬レシピを解放', icon: '🧪', category: 'recipe', cost: 2, maxRank: 1, requires: ['alc_steady_fire', 'alc_double_brew'], x: 50, y: 82 },
      { id: 'alc_herb_saver', jobId: 'apothecary', name: 'もったいない精神', description: '調合時にたまに素材を消費しない', icon: '🍀', category: 'passive', cost: 2, maxRank: 2, requires: ['alc_double_brew'], x: 80, y: 82 },
    ],
  },
  farmer: {
    id: 'farmer',
    name: '農家',
    emoji: '🌾',
    color: '#4CAF50',
    accentColor: '#E9F7EB',
    shortDesc: 'おいしい野菜や果物を育てて、牛や豚も飼育！みんなの食卓を支えるよ。',
    starterFacility: '小さな畑＆ミニ牧場',
    minigameSummary: '水やり・収穫・動物お世話のリズムミニゲーム',
    skills: [
      { id: 'frm_root', jobId: 'farmer', name: 'ふかふかの土', description: '作物の収穫量と売値がアップ', icon: '🌱', category: 'core', cost: 1, maxRank: 3, requires: [], x: 50, y: 16 },
      { id: 'frm_green_thumb', jobId: 'farmer', name: 'すくすく育ち', description: '作物の成長が速くなり、水管理ミニゲームもやさしくなる', icon: '🚿', category: 'assist', cost: 1, maxRank: 3, requires: ['frm_root'], x: 24, y: 48 },
      { id: 'frm_happy_livestock', jobId: 'farmer', name: 'なかよし牧場', description: '牛や豚から上質なミルク・食材が採れる', icon: '🐄', category: 'passive', cost: 1, maxRank: 3, requires: ['frm_root'], x: 76, y: 48 },
      { id: 'frm_sprinkler', jobId: 'farmer', name: '自動スプリンクラー', description: '毎朝自動で畑に水やりをしてくれる便利道具を解放', icon: '💧', category: 'recipe', cost: 2, maxRank: 1, requires: ['frm_green_thumb'], x: 22, y: 82 },
      { id: 'frm_golden_crop', jobId: 'farmer', name: 'おうごん野菜', description: '高値で売れるレア野菜・フルーツの種を解放', icon: '🍓', category: 'recipe', cost: 2, maxRank: 1, requires: ['frm_green_thumb', 'frm_happy_livestock'], x: 55, y: 82 },
      { id: 'frm_artisan_cheese', jobId: 'farmer', name: '牧場チーズ作り', description: 'ミルクから高級チーズを作れるようになる', icon: '🧀', category: 'recipe', cost: 2, maxRank: 1, requires: ['frm_happy_livestock'], x: 84, y: 82 },
    ],
  },
  realtor: {
    id: 'realtor',
    name: '不動産屋',
    emoji: '🏡',
    color: '#2E86AB',
    accentColor: '#E6F4FA',
    shortDesc: 'すてきな家や大きなお店を設計＆販売！町をもっとにぎやかにしよう。',
    starterFacility: '小さな不動産案内所',
    minigameSummary: 'お客さんの希望に合う間取りパズル＆見積もり',
    skills: [
      { id: 'rel_root', jobId: 'realtor', name: 'すまいの案内人', description: '不動産の仲介報酬と経験値がアップ', icon: '🏡', category: 'core', cost: 1, maxRank: 3, requires: [], x: 50, y: 16 },
      { id: 'rel_blueprint_hint', jobId: 'realtor', name: 'ひらめき間取り', description: '間取りパズル中にベストな配置のヒントが出る', icon: '📐', category: 'assist', cost: 1, maxRank: 3, requires: ['rel_root'], x: 24, y: 48 },
      { id: 'rel_rent_cut', jobId: 'realtor', name: 'やり手交渉術', description: '仲介報酬アップ＆自宅の家賃が少し安くなる', icon: '💰', category: 'passive', cost: 1, maxRank: 3, requires: ['rel_root'], x: 76, y: 48 },
      { id: 'rel_shop_expand', jobId: 'realtor', name: '大型ショップ設計', description: 'お店の棚を増やせる増築プランを解放', icon: '🏪', category: 'recipe', cost: 2, maxRank: 1, requires: ['rel_blueprint_hint'], x: 24, y: 82 },
      { id: 'rel_mansion', jobId: 'realtor', name: 'おしろ風ハウス設計', description: '憧れの大きな家・お庭付き豪邸の設計図を解放', icon: '🏰', category: 'recipe', cost: 2, maxRank: 1, requires: ['rel_blueprint_hint', 'rel_rent_cut'], x: 64, y: 82 },
    ],
  },
  beautician: {
    id: 'beautician',
    name: '美容師',
    emoji: '✂️',
    color: '#EC6B99',
    accentColor: '#FDECF2',
    shortDesc: '髪型・ヘアカラー・洋服・メイクで町の住人をおしゃれに大変身！',
    starterFacility: '小さな鏡台サロン',
    minigameSummary: 'お手本に合わせてカット＆スタイリングミニゲーム',
    skills: [
      { id: 'bty_root', jobId: 'beautician', name: 'おしゃれセンス', description: 'スタイリングの評価とサロン売上がアップ', icon: '✂️', category: 'core', cost: 1, maxRank: 3, requires: [], x: 50, y: 16 },
      { id: 'bty_guide_line', jobId: 'beautician', name: 'ぴかぴかガイド', description: 'カットのなぞりガイドが見やすくなり判定もやさしくなる', icon: '✨', category: 'assist', cost: 1, maxRank: 3, requires: ['bty_root'], x: 24, y: 48 },
      { id: 'bty_charm_aura', jobId: 'beautician', name: 'ときめきコーデ', description: 'おしゃれ後、NPCとの仲良し度が上がりやすくなる', icon: '💖', category: 'passive', cost: 1, maxRank: 3, requires: ['bty_root'], x: 76, y: 48 },
      { id: 'bty_pastel_dye', jobId: 'beautician', name: 'きらめきカラー', description: 'レアなパステル髪色＆メイクを解放', icon: '🎨', category: 'recipe', cost: 2, maxRank: 1, requires: ['bty_guide_line'], x: 24, y: 82 },
      { id: 'bty_royal_style', jobId: 'beautician', name: 'お姫さま＆王子スタイル', description: '特別な髪型とドレス・マントを解放', icon: '👑', category: 'recipe', cost: 2, maxRank: 1, requires: ['bty_guide_line', 'bty_charm_aura'], x: 64, y: 82 },
    ],
  },
};

export const JOB_LIST: JobDef[] = Object.values(JOBS);

export const ALL_SKILLS: Record<string, SkillNodeDef> = {};
for (const job of JOB_LIST) {
  for (const sk of job.skills) {
    ALL_SKILLS[sk.id] = sk;
  }
}

export function canUnlockSkill(
  skillId: string,
  skillRanks: Record<string, number>,
  skillPoints: number
): { ok: boolean; reason?: string } {
  const node = ALL_SKILLS[skillId];
  if (!node) return { ok: false, reason: 'スキルが見つかりません' };

  const currentRank = skillRanks[skillId] ?? 0;
  if (currentRank >= node.maxRank) {
    return { ok: false, reason: 'すでに最大ランクだよ！' };
  }
  for (const reqId of node.requires) {
    if ((skillRanks[reqId] ?? 0) < 1) {
      const parentName = ALL_SKILLS[reqId]?.name ?? reqId;
      return { ok: false, reason: `先に「${parentName}」を習得してね` };
    }
  }
  if (skillPoints < node.cost) {
    return { ok: false, reason: `スキルポイントが ${node.cost} 必要だよ` };
  }
  return { ok: true };
}

export function createInitialJobProgress(): Record<JobId, JobProgress> {
  return {
    adventurer: { level: 1, xp: 0 },
    blacksmith: { level: 1, xp: 0 },
    apothecary: { level: 1, xp: 0 },
    farmer: { level: 1, xp: 0 },
    realtor: { level: 1, xp: 0 },
    beautician: { level: 1, xp: 0 },
  };
}
