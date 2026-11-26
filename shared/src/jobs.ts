import type { JobId, JobProgress } from './types.js';

export interface SkillNodeDef {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  icon: string;
  category: 'assist' | 'recipe' | 'passive';
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
      { id: 'adv_slash_wide', name: 'ひろびろ斬り', description: '攻撃の範囲が広がってモンスターに当てやすくなる', requiredLevel: 2, icon: '🗡️', category: 'assist' },
      { id: 'adv_treasure_eye', name: 'おたから発見', description: '宝箱やレア素材が見つかりやすくなる', requiredLevel: 4, icon: '💎', category: 'passive' },
      { id: 'adv_dash', name: 'はやてステップ', description: 'すばやく回避ダッシュができるようになる', requiredLevel: 6, icon: '💨', category: 'assist' },
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
      { id: 'blk_wide_zone', name: '安定ハンマー', description: '鍛造ミニゲームの成功ゾーンが広がる', requiredLevel: 2, icon: '🎯', category: 'assist' },
      { id: 'blk_slow_bar', name: '職人の見切り', description: '高難度レシピでもゲージの動きがゆっくりになる', requiredLevel: 4, icon: '⏱️', category: 'assist' },
      { id: 'blk_silver_craft', name: 'ぎんの鍛造術', description: 'キラキラの銀装備レシピを解放', requiredLevel: 6, icon: '⚔️', category: 'recipe' },
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
      { id: 'alc_steady_fire', name: 'おだやか火加減', description: '調合釜の針のブレが小さくなり安定する', requiredLevel: 2, icon: '🔥', category: 'assist' },
      { id: 'alc_double_brew', name: 'お得に二倍調合', description: 'ときどき一度に2個できあがる', requiredLevel: 4, icon: '✨', category: 'passive' },
      { id: 'alc_elixir', name: '虹いろポーション', description: '冒険者に大人気の特効薬レシピを解放', requiredLevel: 6, icon: '🧪', category: 'recipe' },
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
      { id: 'frm_green_thumb', name: 'すくすく育ち', description: '作物の成長が速くなり、水管理もやさしくなる', requiredLevel: 2, icon: '🌱', category: 'assist' },
      { id: 'frm_happy_livestock', name: 'なかよし牧場', description: '牛や豚から上質なミルク・食材が採れる', requiredLevel: 4, icon: '🐄', category: 'passive' },
      { id: 'frm_sprinkler', name: '自動スプリンクラー', description: '毎朝自動で畑に水やりをしてくれる便利道具を解放', requiredLevel: 6, icon: '💧', category: 'recipe' },
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
      { id: 'rel_blueprint_hint', name: 'ひらめき間取り', description: 'パズル中にベストな配置のヒントが出る', requiredLevel: 2, icon: '📐', category: 'assist' },
      { id: 'rel_rent_cut', name: 'やり手交渉術', description: '仲介報酬アップ＆自宅の家賃が少し安くなる', requiredLevel: 4, icon: '💰', category: 'passive' },
      { id: 'rel_mansion', name: 'おしろ風ハウス設計', description: '憧れの大きな家・大型店舗の設計図を解放', requiredLevel: 6, icon: '🏰', category: 'recipe' },
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
      { id: 'bty_guide_line', name: 'ぴかぴかガイド', description: 'カットのなぞりガイドが分かりやすく判定もやさしくなる', requiredLevel: 2, icon: '✨', category: 'assist' },
      { id: 'bty_charm_aura', name: 'ときめきコーデ', description: 'おしゃれ後、NPCとの仲良し度が上がりやすくなる', requiredLevel: 4, icon: '💖', category: 'passive' },
      { id: 'bty_royal_style', name: 'お姫さま＆王子スタイル', description: '特別な髪型とドレス・マントを解放', requiredLevel: 6, icon: '👑', category: 'recipe' },
    ],
  },
};

export const JOB_LIST: JobDef[] = Object.values(JOBS);

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
