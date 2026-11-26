import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  type CharacterData,
  type CharacterSummary,
  type ChatMessage,
  type ChildData,
  type ClientMessage,
  type ErrandPost,
  type LineageEntry,
  type NpcData,
  type OnlinePlayerState,
  type ServerMessage,
  type WorkResultPayload,
  ALL_SKILLS,
  BUILDINGS,
  ITEMS,
  JOBS,
  MAX_PLAYERS,
  STARTING_AGE,
  STARTING_MONEY,
  TILE_SIZE,
  TOWN_SPAWN,
  canUnlockSkill,
  clampAndResolvePosition,
  createInitialJobProgress,
  getRecipeById,
  inheritAppearance,
  xpNeededForLevel,
} from '@familia-town/shared';
import { GameDatabase } from './db.js';
import { NpcSimulator, advanceWorldClock, toPublicClock } from './worldSim.js';

const PORT = Number(process.env.PORT ?? 3001);
const db = new GameDatabase(process.env.DB_PATH);
let worldClock = db.getWorldClock();
const npcs = db.listNpcs();
const npcSim = new NpcSimulator();

interface ClientConn {
  id: string;
  send: (msg: ServerMessage) => void;
  kind: 'ws' | 'http';
}

interface HttpClientBucket {
  conn: ClientConn;
  queue: ServerMessage[];
  lastSeenMs: number;
}

interface ActiveSession {
  conn: ClientConn;
  characterId: string;
  state: OnlinePlayerState;
  data: CharacterData;
}

const httpClients = new Map<string, HttpClientBucket>();
const sessions = new Map<string, ActiveSession>(); // keyed by conn.id
const onlineByCharId = new Map<string, ActiveSession>();

function broadcast(msg: ServerMessage, excludeConnId?: string): void {
  for (const session of sessions.values()) {
    if (session.conn.id !== excludeConnId) {
      session.conn.send(msg);
    }
  }
}

function buildCharacterSummaries(): CharacterSummary[] {
  return db.listCharacters().map((c) => ({
    id: c.id,
    name: c.name,
    gender: c.gender,
    age: c.age,
    generation: c.generation,
    jobId: c.jobId,
    money: c.money,
    appearance: c.appearance,
    online: onlineByCharId.has(c.id),
  }));
}

function toOnlineState(c: CharacterData): OnlinePlayerState {
  return {
    id: c.id,
    name: c.name,
    gender: c.gender,
    age: c.age,
    generation: c.generation,
    jobId: c.jobId,
    appearance: c.appearance,
    x: c.x,
    y: c.y,
    dir: c.dir,
    moving: false,
  };
}

function handleDisconnect(connId: string): void {
  const session = sessions.get(connId);
  if (!session) return;
  session.data.lastSeenAt = Date.now();
  db.saveCharacter(session.data);
  sessions.delete(connId);
  onlineByCharId.delete(session.characterId);

  broadcast({
    type: 'player_left',
    playerId: session.characterId,
    onlineCount: sessions.size,
  });
}

function loginCharacter(conn: ClientConn, characterId: string): void {
  if (sessions.size >= MAX_PLAYERS && !sessions.has(conn.id)) {
    conn.send({
      type: 'error',
      message: `いま満員（${MAX_PLAYERS}/${MAX_PLAYERS}人）だよ！少し待ってから入ってね。`,
    });
    return;
  }
  const existingOnline = onlineByCharId.get(characterId);
  if (existingOnline && existingOnline.conn.id !== conn.id) {
    conn.send({
      type: 'error',
      message: 'そのキャラクターはいま別の端末でログイン中だよ！',
    });
    return;
  }

  const charData = db.getCharacter(characterId);
  if (!charData) {
    conn.send({ type: 'error', message: 'キャラクターが見つかりませんでした' });
    return;
  }

  // Backward-compatible migration for characters created before SP & family systems
  if (typeof charData.skillPoints !== 'number') {
    charData.skillPoints = 2;
  }
  if (!charData.skillRanks) {
    charData.skillRanks = {};
  }
  if (!Array.isArray(charData.children)) {
    charData.children = [];
  }
  if (!Array.isArray(charData.lineageHistory)) {
    charData.lineageHistory = [];
  }
  if (typeof charData.rentDue !== 'number') {
    charData.rentDue = 0;
  }

  const state = toOnlineState(charData);
  const session: ActiveSession = { conn, characterId: charData.id, state, data: charData };
  sessions.set(conn.id, session);
  onlineByCharId.set(charData.id, session);

  const onlinePlayers = Array.from(sessions.values()).map((s) => s.state);
  conn.send({
    type: 'login_success',
    self: charData,
    players: onlinePlayers,
    npcs,
    clock: toPublicClock(worldClock, sessions.size),
    chatHistory: db.getRecentChat(30),
    errands: db.listErrands(),
  });

  broadcast(
    {
      type: 'player_joined',
      player: state,
      onlineCount: sessions.size,
    },
    conn.id
  );
}

function handleClientMessage(conn: ClientConn, msg: ClientMessage): void {
  switch (msg.type) {
    case 'list_characters': {
      conn.send({
        type: 'character_list',
        characters: buildCharacterSummaries(),
        clock: toPublicClock(worldClock, sessions.size),
      });
      break;
    }

    case 'create_character': {
      const trimmedName = msg.name.trim().slice(0, 12);
      if (!trimmedName) {
        conn.send({ type: 'error', message: 'おなまえを入力してね！' });
        return;
      }
      if (!JOBS[msg.jobId]) {
        conn.send({ type: 'error', message: '職業が正しくありません' });
        return;
      }

      const plotIndex = db.getNextAvailableHomePlot();
      const newChar: CharacterData = {
        id: `char_${crypto.randomUUID().slice(0, 8)}`,
        name: trimmedName,
        gender: msg.gender === 'female' ? 'female' : 'male',
        age: STARTING_AGE,
        generation: 1,
        appearance: msg.appearance,
        jobId: msg.jobId,
        jobProgress: createInitialJobProgress(),
        skillPoints: 2,
        skillRanks: {},
        unlockedSkills: [],
        money: STARTING_MONEY,
        stamina: 100,
        maxStamina: 100,
        hunger: 100,
        maxHunger: 100,
        x: TOWN_SPAWN.x + (Math.random() - 0.5) * 80,
        y: TOWN_SPAWN.y + (Math.random() - 0.5) * 40,
        dir: 'down',
        homePlotIndex: plotIndex,
        homeLevel: 1,
        shopLevel: msg.jobId === 'adventurer' ? 0 : 1,
        rentDue: 0,
        spouseNpcId: null,
        children: [],
        lineageHistory: [],
        parentNames: null,
        inventory: [{ itemId: 'onigiri', name: 'ほかほかおにぎり', emoji: '🍙', count: 3 }],
        lastSeenAt: Date.now(),
      };

      db.saveCharacter(newChar);
      loginCharacter(conn, newChar.id);
      break;
    }

    case 'login_character': {
      loginCharacter(conn, msg.characterId);
      break;
    }

    case 'move': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const resolved = clampAndResolvePosition(msg.x, msg.y);
      session.state.x = resolved.x;
      session.state.y = resolved.y;
      session.state.dir = msg.dir;
      session.state.moving = msg.moving;
      session.data.x = resolved.x;
      session.data.y = resolved.y;
      session.data.dir = msg.dir;

      broadcast(
        {
          type: 'player_moved',
          playerId: session.characterId,
          x: resolved.x,
          y: resolved.y,
          dir: msg.dir,
          moving: msg.moving,
        },
        conn.id
      );
      break;
    }

    case 'chat': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const text = msg.text.trim().slice(0, 80);
      if (!text) return;

      const chatMsg: ChatMessage = {
        id: `msg_${crypto.randomUUID().slice(0, 8)}`,
        senderId: session.characterId,
        senderName: session.data.name,
        text,
        createdAt: Date.now(),
      };
      db.addChatMessage(chatMsg);
      session.state.bubbleText = text;
      session.state.bubbleStamp = undefined;
      session.state.bubbleExpiresAt = Date.now() + 5000;
      broadcast({ type: 'chat_broadcast', message: chatMsg });
      break;
    }

    case 'stamp': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const chatMsg: ChatMessage = {
        id: `msg_${crypto.randomUUID().slice(0, 8)}`,
        senderId: session.characterId,
        senderName: session.data.name,
        stamp: msg.stamp,
        createdAt: Date.now(),
      };
      db.addChatMessage(chatMsg);
      session.state.bubbleStamp = msg.stamp;
      session.state.bubbleText = undefined;
      session.state.bubbleExpiresAt = Date.now() + 4500;
      broadcast({ type: 'chat_broadcast', message: chatMsg });
      break;
    }

    case 'change_job': {
      const session = sessions.get(conn.id);
      if (!session || !JOBS[msg.jobId]) return;
      session.data.jobId = msg.jobId;
      if (msg.jobId !== 'adventurer' && session.data.shopLevel === 0) {
        session.data.shopLevel = 1;
      }
      session.state.jobId = msg.jobId;
      db.saveCharacter(session.data);

      conn.send({ type: 'self_updated', self: session.data });
      broadcast({ type: 'player_updated', player: session.state }, conn.id);
      break;
    }

    case 'unlock_skill': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const check = canUnlockSkill(msg.skillId, session.data.skillRanks, session.data.skillPoints);
      if (!check.ok) {
        conn.send({ type: 'error', message: check.reason ?? 'スキルを習得できません' });
        return;
      }
      const node = ALL_SKILLS[msg.skillId];
      session.data.skillPoints -= node.cost;
      session.data.skillRanks[msg.skillId] = (session.data.skillRanks[msg.skillId] ?? 0) + 1;
      if (!session.data.unlockedSkills.includes(msg.skillId)) {
        session.data.unlockedSkills.push(msg.skillId);
      }
      db.saveCharacter(session.data);
      conn.send({ type: 'self_updated', self: session.data });
      break;
    }

    case 'interact_npc': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const npc = npcs.find((n) => n.id === msg.npcId);
      if (!npc) return;

      if (!npc.affinityByCharacter) npc.affinityByCharacter = {};
      const currentAffinity = npc.affinityByCharacter[session.characterId] ?? 0;
      const nextAffinity = Math.min(100, currentAffinity + 5);
      npc.affinityByCharacter[session.characterId] = nextAffinity;
      db.saveNpc(npc);

      // Opposite-gender NPC marriage rule
      const canRomance = npc.canMarry && npc.gender !== session.data.gender;
      const lineIdx = Math.min(npc.dialogue.length - 1, Math.floor(nextAffinity / 30));
      const line = npc.dialogue[lineIdx] ?? npc.dialogue[0];

      conn.send({
        type: 'npc_dialog',
        npc,
        line,
        affinity: nextAffinity,
        canRomance,
      });
      break;
    }

    case 'eat_snack': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const targetId = msg.itemId ?? 'onigiri';
      const itemDef = ITEMS[targetId];
      if (!itemDef || (!itemDef.hungerRestore && !itemDef.staminaRestore)) {
        conn.send({ type: 'error', message: 'それは食べられないよ！' });
        return;
      }
      if (!removeInventoryItem(session.data, targetId, 1)) {
        conn.send({ type: 'error', message: `${itemDef.name}を持っていないよ！` });
        return;
      }
      session.data.hunger = Math.min(session.data.maxHunger, session.data.hunger + (itemDef.hungerRestore ?? 0));
      session.data.stamina = Math.min(session.data.maxStamina, session.data.stamina + (itemDef.staminaRestore ?? 0));
      db.saveCharacter(session.data);
      conn.send({ type: 'self_updated', self: session.data });
      break;
    }

    case 'complete_work': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const recipe = getRecipeById(msg.recipeId);
      if (!recipe) {
        conn.send({ type: 'error', message: 'お仕事が見つかりませんでした' });
        return;
      }
      if (recipe.jobId !== session.data.jobId) {
        conn.send({ type: 'error', message: 'いまの職業のお仕事じゃないよ！' });
        return;
      }
      if (recipe.requiredSkillId && (session.data.skillRanks[recipe.requiredSkillId] ?? 0) < 1) {
        conn.send({ type: 'error', message: '先にスキルツリーでレシピを解放してね！' });
        return;
      }

      const clampedScore = Math.max(0, Math.min(100, Math.round(msg.score)));
      const rank: 1 | 2 | 3 = clampedScore >= 85 ? 3 : clampedScore >= 55 ? 2 : 1;
      const rankMult = rank === 3 ? 1.5 : rank === 2 ? 1.15 : 0.85;

      // Apply skill tree bonuses
      const ranks = session.data.skillRanks ?? {};
      const rootSkillId = `${recipe.jobId === 'adventurer' ? 'adv' : recipe.jobId === 'blacksmith' ? 'blk' : recipe.jobId === 'apothecary' ? 'alc' : recipe.jobId === 'farmer' ? 'frm' : recipe.jobId === 'realtor' ? 'rel' : 'bty'}_root`;
      const coreBonus = 1 + (ranks[rootSkillId] ?? 0) * 0.15;
      const extraGoldBonus =
        1 +
        (ranks['adv_lucky_bag'] ?? 0) * 0.15 +
        (ranks['rel_rent_cut'] ?? 0) * 0.12 +
        (ranks['bty_charm_aura'] ?? 0) * 0.12;

      const goldEarned = Math.round(recipe.baseGold * rankMult * coreBonus * extraGoldBonus);
      const xpEarned = Math.round(recipe.baseXp * rankMult);

      let itemCount = recipe.rewardItemCount;
      if (rank === 3 && (ranks['alc_double_brew'] ?? 0) > 0 && recipe.jobId === 'apothecary') {
        itemCount *= 2;
      } else if (rank === 3 && Math.random() < 0.35) {
        itemCount += 1;
      }

      session.data.money += goldEarned;
      session.data.hunger = Math.max(0, session.data.hunger - recipe.hungerCost);

      // XP & Level-up -> earns Skill Points (SP)!
      const prog = session.data.jobProgress[recipe.jobId];
      prog.xp += xpEarned;
      let leveledUp = false;
      let spEarned = rank === 3 && recipe.tier >= 2 ? 1 : 0; // Bonus SP on high-tier perfect clear!

      while (prog.xp >= xpNeededForLevel(prog.level)) {
        prog.xp -= xpNeededForLevel(prog.level);
        prog.level += 1;
        leveledUp = true;
        spEarned += 1;
      }
      session.data.skillPoints = (session.data.skillPoints ?? 0) + spEarned;

      const rewardDef = ITEMS[recipe.rewardItemId];
      if (rewardDef) {
        addInventoryItem(session.data, rewardDef.id, itemCount);
      }

      db.saveCharacter(session.data);

      const result: WorkResultPayload = {
        recipeId: recipe.id,
        recipeName: recipe.name,
        rank,
        goldEarned,
        xpEarned,
        leveledUp,
        newLevel: prog.level,
        spEarned,
        itemName: rewardDef?.name ?? recipe.rewardItemId,
        itemEmoji: rewardDef?.emoji ?? '🎁',
        itemCount,
      };
      conn.send({ type: 'work_result', result, self: session.data });
      break;
    }

    case 'buy_item': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const itemDef = ITEMS[msg.itemId];
      const qty = Math.max(1, Math.min(20, Math.floor(msg.count)));
      if (!itemDef || !itemDef.buyPrice) {
        conn.send({ type: 'error', message: 'そのアイテムは買えないよ！' });
        return;
      }
      const total = itemDef.buyPrice * qty;
      if (session.data.money < total) {
        conn.send({ type: 'error', message: `お金がたりないよ！（${total}G 必要）` });
        return;
      }
      session.data.money -= total;
      addInventoryItem(session.data, itemDef.id, qty);
      db.saveCharacter(session.data);
      conn.send({ type: 'self_updated', self: session.data });
      break;
    }

    case 'sell_item': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const itemDef = ITEMS[msg.itemId];
      const qty = Math.max(1, Math.min(99, Math.floor(msg.count)));
      if (!itemDef) return;
      if (!removeInventoryItem(session.data, itemDef.id, qty)) {
        conn.send({ type: 'error', message: 'アイテムの数がたりないよ！' });
        return;
      }
      session.data.money += itemDef.sellPrice * qty;
      db.saveCharacter(session.data);
      conn.send({ type: 'self_updated', self: session.data });
      break;
    }

    case 'list_errands': {
      conn.send({ type: 'errands_updated', errands: db.listErrands() });
      break;
    }

    case 'post_errand': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const itemDef = ITEMS[msg.itemId];
      const count = Math.max(1, Math.min(10, Math.floor(msg.count)));
      const rewardGold = Math.max(30, Math.min(2000, Math.floor(msg.rewardGold)));
      if (!itemDef) return;
      if (session.data.money < rewardGold) {
        conn.send({ type: 'error', message: '報酬のお金がたりないよ！' });
        return;
      }
      session.data.money -= rewardGold;
      db.saveCharacter(session.data);

      const errand: ErrandPost = {
        id: `err_${crypto.randomUUID().slice(0, 8)}`,
        posterId: session.characterId,
        posterName: session.data.name,
        isNpc: false,
        itemId: itemDef.id,
        count,
        rewardGold,
        note: msg.note.trim().slice(0, 40) || `${itemDef.name}を集めてほしいな！`,
        createdAt: Date.now(),
      };
      db.saveErrand(errand);
      conn.send({ type: 'self_updated', self: session.data });
      broadcast({ type: 'errands_updated', errands: db.listErrands() });
      break;
    }

    case 'fulfill_errand': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const errands = db.listErrands();
      const errand = errands.find((e) => e.id === msg.errandId);
      if (!errand) {
        conn.send({ type: 'error', message: 'そのおつかいはもう終わっているよ！' });
        return;
      }
      if (errand.posterId === session.characterId) {
        conn.send({ type: 'error', message: '自分のおつかいには納品できないよ！' });
        return;
      }
      if (!removeInventoryItem(session.data, errand.itemId, errand.count)) {
        const itemName = ITEMS[errand.itemId]?.name ?? errand.itemId;
        conn.send({ type: 'error', message: `${itemName} が ${errand.count}個 必要だよ！` });
        return;
      }

      session.data.money += errand.rewardGold;
      session.data.skillPoints = (session.data.skillPoints ?? 0) + 1; // Helping others earns +1 SP!
      db.saveCharacter(session.data);

      // Deliver items to poster if poster is a player
      if (!errand.isNpc) {
        const posterOnline = onlineByCharId.get(errand.posterId);
        if (posterOnline) {
          addInventoryItem(posterOnline.data, errand.itemId, errand.count);
          db.saveCharacter(posterOnline.data);
          posterOnline.conn.send({ type: 'self_updated', self: posterOnline.data });
        } else {
          const posterOffline = db.getCharacter(errand.posterId);
          if (posterOffline) {
            addInventoryItem(posterOffline, errand.itemId, errand.count);
            db.saveCharacter(posterOffline);
          }
        }
        db.deleteErrand(errand.id);
      }

      conn.send({ type: 'self_updated', self: session.data });
      broadcast({ type: 'errands_updated', errands: db.listErrands() });
      break;
    }

    case 'gift_npc': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const npc = npcs.find((n) => n.id === msg.npcId);
      if (!npc) return;
      const giftCost = 50;
      if (session.data.money < giftCost) {
        conn.send({ type: 'error', message: 'お花代（50G）がたりないよ！' });
        return;
      }
      session.data.money -= giftCost;
      if (!npc.affinityByCharacter) npc.affinityByCharacter = {};
      const charmRank = session.data.skillRanks?.['bty_charm_aura'] ?? 0;
      const gain = 20 + charmRank * 5;
      const nextAffinity = Math.min(100, (npc.affinityByCharacter[session.characterId] ?? 0) + gain);
      npc.affinityByCharacter[session.characterId] = nextAffinity;
      db.saveNpc(npc);
      db.saveCharacter(session.data);

      const canRomance = npc.canMarry && npc.gender !== session.data.gender;
      conn.send({ type: 'self_updated', self: session.data });
      conn.send({
        type: 'npc_dialog',
        npc,
        line: `わあ、きれいなお花ありがとう！！${session.data.name}のこと、もっと好きになっちゃった♪`,
        affinity: nextAffinity,
        canRomance,
      });
      break;
    }

    case 'propose_npc': {
      const session = sessions.get(conn.id);
      if (!session) return;
      if (session.data.spouseNpcId) {
        conn.send({ type: 'error', message: 'もうすてきなパートナーがいるよ！' });
        return;
      }
      const npc = npcs.find((n) => n.id === msg.npcId);
      if (!npc || !npc.canMarry) {
        conn.send({ type: 'error', message: 'その相手にはプロポーズできません' });
        return;
      }
      if (npc.gender === session.data.gender) {
        conn.send({ type: 'error', message: '異性のNPCと結婚できるよ！' });
        return;
      }
      const affinity = npc.affinityByCharacter?.[session.characterId] ?? 0;
      if (affinity < 60) {
        conn.send({ type: 'error', message: `なかよし度が 60 以上必要だよ！（いま ${affinity}）` });
        return;
      }

      session.data.spouseNpcId = npc.id;
      db.saveCharacter(session.data);
      conn.send({ type: 'self_updated', self: session.data });
      conn.send({
        type: 'family_event',
        emoji: '💍',
        title: 'ご結婚おめでとうございます！',
        message: `${session.data.name} と ${npc.name} が結婚しました！「家族・マイホーム」から子供をむかえられるよ♪`,
      });
      break;
    }

    case 'have_child': {
      const session = sessions.get(conn.id);
      if (!session) return;
      if (!session.data.spouseNpcId) {
        conn.send({ type: 'error', message: '先に町のNPCと結婚してね！' });
        return;
      }
      if (session.data.children.length >= 3) {
        conn.send({ type: 'error', message: '子供は3人までむかえられるよ！' });
        return;
      }
      const childName = msg.name.trim().slice(0, 12);
      if (!childName) {
        conn.send({ type: 'error', message: '子供のおなまえを入力してね！' });
        return;
      }
      const spouse = npcs.find((n) => n.id === session.data.spouseNpcId);
      if (!spouse) return;

      const childGender = msg.gender === 'female' ? 'female' : 'male';
      const childAppearance = inheritAppearance(session.data.appearance, spouse.appearance, childGender);
      const child: ChildData = {
        id: `child_${crypto.randomUUID().slice(0, 8)}`,
        name: childName,
        gender: childGender,
        age: 1,
        appearance: childAppearance,
        parentNames: [session.data.name, spouse.name],
      };

      session.data.children.push(child);
      db.saveCharacter(session.data);
      conn.send({ type: 'self_updated', self: session.data });
      conn.send({
        type: 'family_event',
        emoji: '👶',
        title: `あたらしい家族「${child.name}」が誕生！`,
        message: `${session.data.name} と ${spouse.name} の容姿の特徴を受け継いだかわいい子供だよ！`,
      });
      break;
    }

    case 'pass_generation': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const child = session.data.children.find((c) => c.id === msg.childId);
      if (!child) {
        conn.send({ type: 'error', message: '引き継ぐ子供が見つかりません' });
        return;
      }

      const oldName = session.data.name;
      const oldGen = session.data.generation;
      const spouse = session.data.spouseNpcId ? npcs.find((n) => n.id === session.data.spouseNpcId) : null;

      // 1. Record retired parent into Lineage Album
      const entry: LineageEntry = {
        generation: oldGen,
        name: oldName,
        gender: session.data.gender,
        jobId: session.data.jobId,
        retiredAge: session.data.age,
        spouseName: spouse?.name ?? null,
        appearance: session.data.appearance,
      };
      session.data.lineageHistory.push(entry);

      // 2. Spawn retired parent as a friendly Elder NPC strolling near their house!
      const house = BUILDINGS.find((b) => b.plotIndex === session.data.homePlotIndex);
      const elderX = house ? house.doorTileX * TILE_SIZE : TOWN_SPAWN.x;
      const elderY = house ? (house.doorTileY + 0.6) * TILE_SIZE : TOWN_SPAWN.y;
      const elderNpc: NpcData = {
        id: `npc_elder_${crypto.randomUUID().slice(0, 6)}`,
        name: `${oldName}`,
        gender: session.data.gender,
        roleTitle: `${oldGen}代目・ご隠居`,
        jobId: session.data.jobId,
        age: Math.max(60, session.data.age),
        appearance: session.data.appearance,
        x: elderX,
        y: elderY,
        homeX: elderX,
        homeY: elderY,
        dir: 'down',
        moving: false,
        dialogue: [
          `おお、${child.name}！元気にやっとるか？引き継いだスキルを役立ててくれよな！`,
          `わしが${oldGen}代目として過ごしたこの町を、これからも大切にしておくれ。`,
          `たまには顔を見せにきてくれるとうれしいぞ♪`,
        ],
        canMarry: false,
        isRetiredPlayer: true,
        affinityByCharacter: {},
      };
      npcs.push(elderNpc);
      db.saveNpc(elderNpc);

      // 3. Promote child to active playable character (inheriting ALL skills, money, home, items + 2 bonus SP!)
      session.data.name = child.name;
      session.data.gender = child.gender;
      session.data.age = STARTING_AGE;
      session.data.generation = oldGen + 1;
      session.data.appearance = child.appearance;
      session.data.parentNames = child.parentNames;
      session.data.spouseNpcId = null;
      session.data.children = [];
      session.data.skillPoints = (session.data.skillPoints ?? 0) + 2;
      session.data.hunger = session.data.maxHunger;
      session.data.stamina = session.data.maxStamina;

      // Update live online state
      session.state.name = session.data.name;
      session.state.gender = session.data.gender;
      session.state.age = session.data.age;
      session.state.generation = session.data.generation;
      session.state.appearance = session.data.appearance;

      db.saveCharacter(session.data);
      conn.send({ type: 'self_updated', self: session.data });
      broadcast({ type: 'player_updated', player: session.state }, conn.id);
      broadcast({ type: 'npcs_updated', npcs });
      conn.send({
        type: 'family_event',
        emoji: '🌸',
        title: `${session.data.generation}代目「${child.name}」の物語がはじまる！`,
        message: `${oldName} のスキル・お金・おうちをすべて引き継ぎ、ボーナス +2 SP を獲得！${oldName} はご隠居として町にいるよ！`,
      });
      break;
    }

    case 'upgrade_home': {
      const session = sessions.get(conn.id);
      if (!session) return;
      const costs: Record<number, number> = { 1: 600, 2: 1500, 3: 3000 };
      const cost = costs[session.data.homeLevel];
      if (!cost) {
        conn.send({ type: 'error', message: 'すでに最高ランクの豪華なお城ハウスだよ！' });
        return;
      }
      if (session.data.money < cost) {
        conn.send({ type: 'error', message: `リフォーム費用（${cost}G）がたりないよ！` });
        return;
      }
      session.data.money -= cost;
      session.data.homeLevel += 1;
      db.saveCharacter(session.data);
      conn.send({ type: 'self_updated', self: session.data });
      conn.send({
        type: 'family_event',
        emoji: '🏡',
        title: `マイホームが Lv.${session.data.homeLevel} に増築されました！`,
        message: '町にあるあなたのおうちもグレードアップしたよ！',
      });
      break;
    }

    case 'pay_rent': {
      const session = sessions.get(conn.id);
      if (!session) return;
      if (session.data.rentDue <= 0) return;
      const pay = Math.min(session.data.money, session.data.rentDue);
      if (pay <= 0) {
        conn.send({ type: 'error', message: 'お金を稼いでから少しずつ返せば大丈夫だよ！' });
        return;
      }
      session.data.money -= pay;
      session.data.rentDue -= pay;
      db.saveCharacter(session.data);
      conn.send({ type: 'self_updated', self: session.data });
      break;
    }
  }
}

function addInventoryItem(char: CharacterData, itemId: string, count: number): void {
  const def = ITEMS[itemId];
  if (!def || count <= 0) return;
  const existing = char.inventory.find((i) => i.itemId === itemId);
  if (existing) {
    existing.count += count;
  } else {
    char.inventory.push({ itemId: def.id, name: def.name, emoji: def.emoji, count });
  }
}

function removeInventoryItem(char: CharacterData, itemId: string, count: number): boolean {
  const existing = char.inventory.find((i) => i.itemId === itemId);
  if (!existing || existing.count < count) return false;
  existing.count -= count;
  if (existing.count <= 0) {
    char.inventory = char.inventory.filter((i) => i.itemId !== itemId);
  }
  return true;
}

function getOrCreateHttpClient(clientId: string): HttpClientBucket {
  let bucket = httpClients.get(clientId);
  if (!bucket) {
    const queue: ServerMessage[] = [];
    const conn: ClientConn = {
      id: clientId,
      kind: 'http',
      send: (msg) => {
        // Keep queue bounded so slow clients don't accumulate stale world ticks
        if (msg.type === 'world_tick') {
          const idx = queue.findIndex((m) => m.type === 'world_tick');
          if (idx >= 0) queue.splice(idx, 1);
        }
        queue.push(msg);
        if (queue.length > 80) queue.shift();
      },
    };
    bucket = { conn, queue, lastSeenMs: Date.now() };
    httpClients.set(clientId, bucket);
  }
  bucket.lastSeenMs = Date.now();
  return bucket;
}

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Serve static client/dist in production
const CLIENT_DIST = path.resolve(process.cwd(), '../client/dist');
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const fullUrl = new URL(req.url ?? '/', 'http://localhost');
  const urlPath = fullUrl.pathname;

  if (urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        online: sessions.size,
        maxPlayers: MAX_PLAYERS,
        clock: toPublicClock(worldClock, sessions.size),
      })
    );
    return;
  }

  // HTTP Fallback Transport: POST /api/send
  if (urlPath === '/api/send' && req.method === 'POST') {
    try {
      const body = (await readJsonBody(req)) as { clientId?: string; message?: ClientMessage };
      if (!body.clientId || !body.message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing clientId or message' }));
        return;
      }
      const bucket = getOrCreateHttpClient(body.clientId);
      handleClientMessage(bucket.conn, body.message);
      const messages = bucket.queue.splice(0, bucket.queue.length);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ messages }));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
    return;
  }

  // HTTP Fallback Transport: GET /api/poll?clientId=...
  if (urlPath === '/api/poll' && req.method === 'GET') {
    const clientId = fullUrl.searchParams.get('clientId');
    if (!clientId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing clientId' }));
      return;
    }
    const bucket = getOrCreateHttpClient(clientId);
    const messages = bucket.queue.splice(0, bucket.queue.length);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messages }));
    return;
  }

  if (fs.existsSync(CLIENT_DIST)) {
    const safePath = path.normalize(urlPath === '/' ? '/index.html' : urlPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(CLIENT_DIST, safePath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(CLIENT_DIST, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Familia Town Game Server is running! Connect via WebSocket at /ws or HTTP at /api/*');
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  const conn: ClientConn = {
    id: `ws_${crypto.randomUUID().slice(0, 8)}`,
    kind: 'ws',
    send: (msg) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
  };

  handleClientMessage(conn, { type: 'list_characters' });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientMessage;
      handleClientMessage(conn, msg);
    } catch {
      conn.send({ type: 'error', message: '不正なメッセージ形式です' });
    }
  });

  ws.on('close', () => {
    handleDisconnect(conn.id);
  });
});

// World simulation loop (5Hz for smooth NPC stroll & shared clock)
let lastTickMs = Date.now();
let saveCounter = 0;

setInterval(() => {
  const now = Date.now();
  const dtSeconds = Math.min(1, (now - lastTickMs) / 1000);
  lastTickMs = now;

  // Clean up timed-out HTTP polling clients (15s without poll)
  for (const [cid, bucket] of httpClients.entries()) {
    if (now - bucket.lastSeenMs > 15000) {
      httpClients.delete(cid);
      handleDisconnect(cid);
    }
  }

  if (sessions.size > 0) {
    const { clock, newDay, newYear } = advanceWorldClock(worldClock, dtSeconds, sessions.size);
    worldClock = clock;
    npcSim.step(npcs, dtSeconds, now);

    // Gentle hunger drain while active
    for (const s of sessions.values()) {
      s.data.hunger = Math.max(0, s.data.hunger - dtSeconds * 0.08);
    }

    // Weekly rent on day 1 of each new season (gentle: auto-pays if affordable, else adds to rentDue)
    if (newDay && clock.day === 1) {
      for (const s of sessions.values()) {
        const rentCutRank = s.data.skillRanks?.['rel_rent_cut'] ?? 0;
        const baseRent = s.data.homeLevel * 40;
        const rent = Math.max(15, Math.round(baseRent * (1 - rentCutRank * 0.12)));
        if (s.data.money >= rent) {
          s.data.money -= rent;
        } else {
          s.data.rentDue = (s.data.rentDue ?? 0) + rent;
        }
        db.saveCharacter(s.data);
        s.conn.send({ type: 'self_updated', self: s.data });
      }
    }

    // Age everyone (and children) by +1 when a new year arrives in the shared world
    if (newYear) {
      for (const c of db.listCharacters()) {
        c.age += 1;
        if (Array.isArray(c.children)) {
          for (const ch of c.children) ch.age += 1;
        }
        db.saveCharacter(c);
        const online = onlineByCharId.get(c.id);
        if (online) {
          online.data.age = c.age;
          online.data.children = c.children;
          online.state.age = c.age;
          online.conn.send({ type: 'self_updated', self: online.data });
          broadcast({ type: 'player_updated', player: online.state }, online.conn.id);
        }
      }
      for (const npc of npcs) {
        npc.age += 1;
        db.saveNpc(npc);
      }
    }

    broadcast({
      type: 'world_tick',
      clock: toPublicClock(worldClock, sessions.size),
      npcs: npcs.map((n) => ({
        id: n.id,
        x: Math.round(n.x),
        y: Math.round(n.y),
        dir: n.dir,
        moving: n.moving,
      })),
    });

    // Persist clock & online players every ~5 seconds
    saveCounter += 1;
    if (saveCounter >= 25) {
      saveCounter = 0;
      db.saveWorldClock(worldClock);
      for (const s of sessions.values()) {
        db.saveCharacter(s.data);
      }
    }
  }
}, 200);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏡 Familia Town server running on http://localhost:${PORT} (WS: /ws, HTTP fallback: /api/*)`);
});
