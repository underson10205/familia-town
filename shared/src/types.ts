export type Gender = 'male' | 'female';

export type JobId =
  | 'adventurer'
  | 'blacksmith'
  | 'apothecary'
  | 'farmer'
  | 'realtor'
  | 'beautician';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type Direction = 'down' | 'up' | 'left' | 'right';

export interface Appearance {
  skinColor: string;
  hairStyle: number; // 0..7
  hairColor: string;
  eyeShape: number; // 0..4
  eyeColor: string;
  browStyle: number; // 0..2
  cheekStyle: number; // 0..2 (0: soft pink, 1: warm peach, 2: freckles)
  outfitId: number; // 0..5
  outfitColor: string;
  accessoryId: number; // 0: none, 1: ribbon, 2: straw hat, 3: glasses, 4: flower, 5: beret
}

export interface JobProgress {
  level: number;
  xp: number;
}

export interface InventoryItem {
  itemId: string;
  name: string;
  emoji: string;
  count: number;
}

export interface CharacterData {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  generation: number;
  appearance: Appearance;
  jobId: JobId;
  jobProgress: Record<JobId, JobProgress>;
  unlockedSkills: string[];
  money: number;
  stamina: number;
  maxStamina: number;
  hunger: number;
  maxHunger: number;
  x: number;
  y: number;
  dir: Direction;
  homePlotIndex: number; // 0..3
  homeLevel: number;
  shopLevel: number;
  spouseNpcId: string | null;
  parentNames: [string, string] | null;
  inventory: InventoryItem[];
  lastSeenAt: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  generation: number;
  jobId: JobId;
  money: number;
  appearance: Appearance;
  online: boolean;
}

export interface OnlinePlayerState {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  generation: number;
  jobId: JobId;
  appearance: Appearance;
  x: number;
  y: number;
  dir: Direction;
  moving: boolean;
  bubbleText?: string;
  bubbleStamp?: StampId;
  bubbleExpiresAt?: number;
}

export interface NpcData {
  id: string;
  name: string;
  gender: Gender;
  roleTitle: string;
  jobId: JobId | null;
  age: number;
  appearance: Appearance;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  dir: Direction;
  moving: boolean;
  dialogue: string[];
  canMarry: boolean;
  isRetiredPlayer: boolean;
  affinityByCharacter?: Record<string, number>;
}

export interface WorldClock {
  year: number;
  season: Season;
  day: number; // 1..7 per season
  minuteOfDay: number; // 0..1439
  paused: boolean;
  onlineCount: number;
  maxPlayers: number;
}

export type StampId =
  | 'wave'
  | 'thanks'
  | 'party'
  | 'shop_open'
  | 'hungry'
  | 'heart'
  | 'sparkle'
  | 'help';

export interface StampDef {
  id: StampId;
  emoji: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  stamp?: StampId;
  createdAt: number;
}

// Client -> Server WebSocket messages
export type ClientMessage =
  | { type: 'list_characters' }
  | {
      type: 'create_character';
      name: string;
      gender: Gender;
      jobId: JobId;
      appearance: Appearance;
    }
  | { type: 'login_character'; characterId: string }
  | { type: 'move'; x: number; y: number; dir: Direction; moving: boolean }
  | { type: 'chat'; text: string }
  | { type: 'stamp'; stamp: StampId }
  | { type: 'change_job'; jobId: JobId }
  | { type: 'interact_npc'; npcId: string }
  | { type: 'eat_snack' };

// Server -> Client WebSocket messages
export type ServerMessage =
  | {
      type: 'character_list';
      characters: CharacterSummary[];
      clock: WorldClock;
    }
  | {
      type: 'login_success';
      self: CharacterData;
      players: OnlinePlayerState[];
      npcs: NpcData[];
      clock: WorldClock;
      chatHistory: ChatMessage[];
    }
  | { type: 'error'; message: string }
  | { type: 'world_tick'; clock: WorldClock; npcs: Pick<NpcData, 'id' | 'x' | 'y' | 'dir' | 'moving'>[] }
  | { type: 'player_joined'; player: OnlinePlayerState; onlineCount: number }
  | { type: 'player_left'; playerId: string; onlineCount: number }
  | { type: 'player_moved'; playerId: string; x: number; y: number; dir: Direction; moving: boolean }
  | { type: 'player_updated'; player: OnlinePlayerState }
  | { type: 'self_updated'; self: CharacterData }
  | { type: 'chat_broadcast'; message: ChatMessage }
  | {
      type: 'npc_dialog';
      npc: NpcData;
      line: string;
      affinity: number;
      canRomance: boolean;
    };

export const STAMPS: StampDef[] = [
  { id: 'wave', emoji: '👋', label: 'やっほー！' },
  { id: 'thanks', emoji: '🙏', label: 'ありがとう！' },
  { id: 'party', emoji: '⚔️', label: 'いっしょに行こう！' },
  { id: 'shop_open', emoji: '🏪', label: 'お店あけたよ！' },
  { id: 'hungry', emoji: '🍙', label: 'おなかすいた〜' },
  { id: 'heart', emoji: '💖', label: 'だいすき！' },
  { id: 'sparkle', emoji: '✨', label: 'すごいね！' },
  { id: 'help', emoji: '🆘', label: 'たすけて〜！' },
];

export const MAX_PLAYERS = 4;
export const STARTING_AGE = 18;
export const STARTING_MONEY = 500;
