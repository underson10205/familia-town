import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import {
  type CharacterData,
  type ChatMessage,
  type ErrandPost,
  type NpcData,
  type WorldClock,
  MAX_PLAYERS,
  TILE_SIZE,
} from '@familia-town/shared';

export interface StoredWorldClock {
  year: number;
  season: WorldClock['season'];
  day: number;
  minuteOfDay: number;
}

const DEFAULT_NPCS: NpcData[] = [
  {
    id: 'npc_leo',
    name: 'レオ',
    gender: 'male',
    roleTitle: '冒険者ギルドの先輩',
    jobId: 'adventurer',
    age: 22,
    appearance: {
      skinColor: '#FAD2B0',
      hairStyle: 3,
      hairColor: '#C95B5B',
      eyeShape: 3,
      eyeColor: '#C47D2C',
      browStyle: 1,
      cheekStyle: 1,
      outfitId: 3,
      outfitColor: '#E06B6B',
      accessoryId: 0,
    },
    x: 7.5 * TILE_SIZE,
    y: 8.2 * TILE_SIZE,
    homeX: 7.5 * TILE_SIZE,
    homeY: 8.2 * TILE_SIZE,
    dir: 'down',
    moving: false,
    dialogue: [
      'やあ！北の「はじまりの森ダンジョン」にはお宝がいっぱい眠ってるぞ！',
      '強くなりたいなら、鍛冶屋で武器を作ってもらうのもおすすめだぜ。',
      'いっしょに冒険できる仲間が増えてうれしいな！',
    ],
    canMarry: true,
    isRetiredPlayer: false,
    affinityByCharacter: {},
  },
  {
    id: 'npc_tetsu',
    name: 'テツ',
    gender: 'male',
    roleTitle: 'ほのおの鍛冶屋',
    jobId: 'blacksmith',
    age: 26,
    appearance: {
      skinColor: '#F2BC94',
      hairStyle: 0,
      hairColor: '#4A3728',
      eyeShape: 3,
      eyeColor: '#3A2E2A',
      browStyle: 2,
      cheekStyle: 1,
      outfitId: 1,
      outfitColor: '#D98B5F',
      accessoryId: 0,
    },
    x: 5.5 * TILE_SIZE,
    y: 15.2 * TILE_SIZE,
    homeX: 5.5 * TILE_SIZE,
    homeY: 15.2 * TILE_SIZE,
    dir: 'down',
    moving: false,
    dialogue: [
      'カンカンッ！いい鉄鉱石が手に入ったら、いつでも持ってきてくれ！',
      'きみが鍛冶屋になるなら、この町の道具づくりを一緒に盛り上げようぜ！',
      'タイミングよくハンマーを振るコツ、いつか教えてやるよ。',
    ],
    canMarry: true,
    isRetiredPlayer: false,
    affinityByCharacter: {},
  },
  {
    id: 'npc_mina',
    name: 'ミナ',
    gender: 'female',
    roleTitle: '森の調合堂（薬剤師）',
    jobId: 'apothecary',
    age: 21,
    appearance: {
      skinColor: '#FFE3C8',
      hairStyle: 4,
      hairColor: '#B784C9',
      eyeShape: 2,
      eyeColor: '#8C4FA8',
      browStyle: 0,
      cheekStyle: 0,
      outfitId: 2,
      outfitColor: '#A57BC9',
      accessoryId: 3,
    },
    x: 5.5 * TILE_SIZE,
    y: 22.2 * TILE_SIZE,
    homeX: 5.5 * TILE_SIZE,
    homeY: 22.2 * TILE_SIZE,
    dir: 'down',
    moving: false,
    dialogue: [
      'ふふっ、薬草のいい香りでしょう？お薬や元気ドリンクを作っているの。',
      '冒険の前に回復ポーションを持っていくと安心だよ♪',
      '今度いっしょに珍しいお花を探しに行かない？',
    ],
    canMarry: true,
    isRetiredPlayer: false,
    affinityByCharacter: {},
  },
  {
    id: 'npc_haru',
    name: 'ハル',
    gender: 'male',
    roleTitle: 'ひだまり農園の農家',
    jobId: 'farmer',
    age: 23,
    appearance: {
      skinColor: '#FAD2B0',
      hairStyle: 7,
      hairColor: '#D98A3C',
      eyeShape: 1,
      eyeColor: '#3B8C57',
      browStyle: 0,
      cheekStyle: 2,
      outfitId: 1,
      outfitColor: '#6BB377',
      accessoryId: 2,
    },
    x: 16.5 * TILE_SIZE,
    y: 16.2 * TILE_SIZE,
    homeX: 16.5 * TILE_SIZE,
    homeY: 16.2 * TILE_SIZE,
    dir: 'down',
    moving: false,
    dialogue: [
      '今日も野菜がすくすく育ってるよ！牛さんや豚さんも元気いっぱい！',
      'おなかがすいたら、いつでも採れたてのおにぎりや野菜を食べてね。',
      'きみと一緒にお弁当を食べたら、もっと美味しいだろうな〜。',
    ],
    canMarry: true,
    isRetiredPlayer: false,
    affinityByCharacter: {},
  },
  {
    id: 'npc_sora',
    name: 'ソラ',
    gender: 'male',
    roleTitle: 'くらし不動産の案内人',
    jobId: 'realtor',
    age: 24,
    appearance: {
      skinColor: '#FFE3C8',
      hairStyle: 0,
      hairColor: '#6E8EC9',
      eyeShape: 1,
      eyeColor: '#2E6DA4',
      browStyle: 0,
      cheekStyle: 0,
      outfitId: 0,
      outfitColor: '#5A9BD5',
      accessoryId: 3,
    },
    x: 29.5 * TILE_SIZE,
    y: 15.2 * TILE_SIZE,
    homeX: 29.5 * TILE_SIZE,
    homeY: 15.2 * TILE_SIZE,
    dir: 'down',
    moving: false,
    dialogue: [
      'ようこそファミリアタウンへ！最初は小さな家からだけど、お金を貯めて大きくしよう！',
      '将来家族ができたら、広いお庭つきのマイホームもおすすめだよ。',
      'きみの理想のおうち、よかったら僕に聞かせてくれないかな？',
    ],
    canMarry: true,
    isRetiredPlayer: false,
    affinityByCharacter: {},
  },
  {
    id: 'npc_hana',
    name: 'ハナ',
    gender: 'female',
    roleTitle: 'パステル美容サロン店主',
    jobId: 'beautician',
    age: 20,
    appearance: {
      skinColor: '#FFE3C8',
      hairStyle: 2,
      hairColor: '#E598B2',
      eyeShape: 0,
      eyeColor: '#C44B6C',
      browStyle: 0,
      cheekStyle: 0,
      outfitId: 4,
      outfitColor: '#E88FA8',
      accessoryId: 1,
    },
    x: 29.5 * TILE_SIZE,
    y: 22.2 * TILE_SIZE,
    homeX: 29.5 * TILE_SIZE,
    homeY: 22.2 * TILE_SIZE,
    dir: 'down',
    moving: false,
    dialogue: [
      'わあ、すてきなファッションね！髪型やメイクを変えたくなったら声をかけてね♪',
      'おしゃれをすると町の住人ともっと仲良くなれちゃうかも！',
      '今度、きみにぴったりのスペシャルコーデを考えてあげるね♡',
    ],
    canMarry: true,
    isRetiredPlayer: false,
    affinityByCharacter: {},
  },
  {
    id: 'npc_mei',
    name: 'メイ',
    gender: 'female',
    roleTitle: 'ファミリア役場の案内係',
    jobId: null,
    age: 22,
    appearance: {
      skinColor: '#FAD2B0',
      hairStyle: 5,
      hairColor: '#E8C563',
      eyeShape: 0,
      eyeColor: '#2E6DA4',
      browStyle: 0,
      cheekStyle: 0,
      outfitId: 2,
      outfitColor: '#5A9BD5',
      accessoryId: 4,
    },
    x: 27.5 * TILE_SIZE,
    y: 8.2 * TILE_SIZE,
    homeX: 27.5 * TILE_SIZE,
    homeY: 8.2 * TILE_SIZE,
    dir: 'down',
    moving: false,
    dialogue: [
      'ファミリア役場へようこそ！ここではいつでも好きな職業に転職できますよ。',
      'この町は、みんながログインしている時だけ時間が進むから安心してくださいね。',
      '毎日少しずつお話できるの、すごく楽しみにしているんですよ♪',
    ],
    canMarry: true,
    isRetiredPlayer: false,
    affinityByCharacter: {},
  },
  {
    id: 'npc_yuzu',
    name: 'ユズ',
    gender: 'female',
    roleTitle: 'パン好きの町娘',
    jobId: null,
    age: 19,
    appearance: {
      skinColor: '#FFE3C8',
      hairStyle: 6,
      hairColor: '#D98A3C',
      eyeShape: 4,
      eyeColor: '#3B8C57',
      browStyle: 0,
      cheekStyle: 2,
      outfitId: 5,
      outfitColor: '#E6B44C',
      accessoryId: 5,
    },
    x: 18 * TILE_SIZE,
    y: 9.2 * TILE_SIZE,
    homeX: 18 * TILE_SIZE,
    homeY: 9.2 * TILE_SIZE,
    dir: 'down',
    moving: false,
    dialogue: [
      '噴水広場って気持ちいいね〜！風がとってもやさしいよ。',
      '家族やお友達みんなで一緒に暮らせる町ってすてきだよね！',
      'また明日もここでおしゃべりしようね！',
    ],
    canMarry: true,
    isRetiredPlayer: false,
    affinityByCharacter: {},
  },
];

export class GameDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? path.resolve(process.cwd(), 'data', 'familia-town.db');
    if (resolvedPath !== ':memory:') {
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    }
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS world_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        year INTEGER NOT NULL,
        season TEXT NOT NULL,
        day INTEGER NOT NULL,
        minute_of_day REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS npcs (
        id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        text TEXT,
        stamp TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS errands (
        id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    const worldRow = this.db.prepare('SELECT id FROM world_state WHERE id = 1').get();
    if (!worldRow) {
      this.db
        .prepare('INSERT INTO world_state (id, year, season, day, minute_of_day) VALUES (1, 1, ?, 1, 540)')
        .run('spring'); // Start Year 1, Spring Day 1, 09:00 AM
    }

    const npcCount = this.db.prepare('SELECT COUNT(*) as c FROM npcs').get() as { c: number };
    if (npcCount.c === 0) {
      const insertNpc = this.db.prepare('INSERT INTO npcs (id, data_json) VALUES (?, ?)');
      for (const npc of DEFAULT_NPCS) {
        insertNpc.run(npc.id, JSON.stringify(npc));
      }
    }

    const errandCount = this.db.prepare('SELECT COUNT(*) as c FROM errands').get() as { c: number };
    if (errandCount.c === 0) {
      const starterErrands: ErrandPost[] = [
        {
          id: 'errand_npc_1',
          posterId: 'npc_tetsu',
          posterName: '鍛冶屋テツ',
          isNpc: true,
          itemId: 'iron_ore',
          count: 2,
          rewardGold: 160,
          note: '新しい剣を作るのに鉄鉱石がほしいんだ！',
          createdAt: Date.now() - 3000,
        },
        {
          id: 'errand_npc_2',
          posterId: 'npc_mina',
          posterName: '薬剤師ミナ',
          isNpc: true,
          itemId: 'slime_gel',
          count: 2,
          rewardGold: 140,
          note: 'ぷるぷるゼリーでお肌つるつる薬を作りたいの♪',
          createdAt: Date.now() - 2000,
        },
        {
          id: 'errand_npc_3',
          posterId: 'npc_yuzu',
          posterName: '町娘ユズ',
          isNpc: true,
          itemId: 'carrot',
          count: 2,
          rewardGold: 120,
          note: 'あまいにんじんシチューを作りたいな〜！',
          createdAt: Date.now() - 1000,
        },
      ];
      for (const e of starterErrands) {
        this.saveErrand(e);
      }
    }
  }

  getWorldClock(): StoredWorldClock {
    const row = this.db
      .prepare('SELECT year, season, day, minute_of_day FROM world_state WHERE id = 1')
      .get() as { year: number; season: WorldClock['season']; day: number; minute_of_day: number };
    return {
      year: row.year,
      season: row.season,
      day: row.day,
      minuteOfDay: row.minute_of_day,
    };
  }

  saveWorldClock(clock: StoredWorldClock): void {
    this.db
      .prepare('UPDATE world_state SET year = ?, season = ?, day = ?, minute_of_day = ? WHERE id = 1')
      .run(clock.year, clock.season, clock.day, clock.minuteOfDay);
  }

  listCharacters(): CharacterData[] {
    const rows = this.db
      .prepare('SELECT data_json FROM characters ORDER BY updated_at DESC')
      .all() as { data_json: string }[];
    return rows.map((r) => JSON.parse(r.data_json) as CharacterData);
  }

  getCharacter(id: string): CharacterData | null {
    const row = this.db.prepare('SELECT data_json FROM characters WHERE id = ?').get(id) as
      | { data_json: string }
      | undefined;
    return row ? (JSON.parse(row.data_json) as CharacterData) : null;
  }

  saveCharacter(char: CharacterData): void {
    this.db
      .prepare(
        `INSERT INTO characters (id, name, data_json, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, data_json = excluded.data_json, updated_at = excluded.updated_at`
      )
      .run(char.id, char.name, JSON.stringify(char), Date.now());
  }

  getNextAvailableHomePlot(): number {
    const chars = this.listCharacters();
    const used = new Set(chars.map((c) => c.homePlotIndex));
    for (let i = 0; i < MAX_PLAYERS; i++) {
      if (!used.has(i)) return i;
    }
    return chars.length % MAX_PLAYERS;
  }

  listNpcs(): NpcData[] {
    const rows = this.db.prepare('SELECT data_json FROM npcs').all() as { data_json: string }[];
    return rows.map((r) => JSON.parse(r.data_json) as NpcData);
  }

  saveNpc(npc: NpcData): void {
    this.db
      .prepare(
        `INSERT INTO npcs (id, data_json) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json`
      )
      .run(npc.id, JSON.stringify(npc));
  }

  addChatMessage(msg: ChatMessage): void {
    this.db
      .prepare(
        'INSERT INTO chat_history (id, sender_id, sender_name, text, stamp, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(msg.id, msg.senderId, msg.senderName, msg.text ?? null, msg.stamp ?? null, msg.createdAt);
  }

  getRecentChat(limit = 30): ChatMessage[] {
    const rows = this.db
      .prepare('SELECT id, sender_id, sender_name, text, stamp, created_at FROM chat_history ORDER BY created_at DESC LIMIT ?')
      .all(limit) as {
      id: string;
      sender_id: string;
      sender_name: string;
      text: string | null;
      stamp: ChatMessage['stamp'] | null;
      created_at: number;
    }[];
    return rows
      .reverse()
      .map((r) => ({
        id: r.id,
        senderId: r.sender_id,
        senderName: r.sender_name,
        text: r.text ?? undefined,
        stamp: r.stamp ?? undefined,
        createdAt: r.created_at,
      }));
  }

  listErrands(): ErrandPost[] {
    const rows = this.db
      .prepare('SELECT data_json FROM errands ORDER BY created_at DESC LIMIT 30')
      .all() as { data_json: string }[];
    return rows.map((r) => JSON.parse(r.data_json) as ErrandPost);
  }

  saveErrand(errand: ErrandPost): void {
    this.db
      .prepare(
        `INSERT INTO errands (id, data_json, created_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json`
      )
      .run(errand.id, JSON.stringify(errand), errand.createdAt);
  }

  deleteErrand(errandId: string): void {
    this.db.prepare('DELETE FROM errands WHERE id = ?').run(errandId);
  }

  close(): void {
    this.db.close();
  }
}
