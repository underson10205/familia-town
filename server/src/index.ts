import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  type CharacterData,
  type CharacterSummary,
  type ChatMessage,
  type ClientMessage,
  type OnlinePlayerState,
  type ServerMessage,
  JOBS,
  MAX_PLAYERS,
  STARTING_AGE,
  STARTING_MONEY,
  TOWN_SPAWN,
  clampAndResolvePosition,
  createInitialJobProgress,
} from '@familia-town/shared';
import { GameDatabase } from './db.js';
import { NpcSimulator, advanceWorldClock, toPublicClock } from './worldSim.js';

const PORT = Number(process.env.PORT ?? 3001);
const db = new GameDatabase(process.env.DB_PATH);
let worldClock = db.getWorldClock();
const npcs = db.listNpcs();
const npcSim = new NpcSimulator();

interface ActiveSession {
  ws: WebSocket;
  characterId: string;
  state: OnlinePlayerState;
  data: CharacterData;
}

const sessions = new Map<WebSocket, ActiveSession>();
const onlineByCharId = new Map<string, ActiveSession>();

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(msg: ServerMessage, excludeWs?: WebSocket): void {
  const payload = JSON.stringify(msg);
  for (const session of sessions.values()) {
    if (session.ws !== excludeWs && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(payload);
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

const server = http.createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0];
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
  res.end('Familia Town Game Server is running! Connect via WebSocket at /ws');
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  // Send character list immediately on connect
  send(ws, {
    type: 'character_list',
    characters: buildCharacterSummaries(),
    clock: toPublicClock(worldClock, sessions.size),
  });

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      send(ws, { type: 'error', message: '不正なメッセージ形式です' });
      return;
    }

    switch (msg.type) {
      case 'list_characters': {
        send(ws, {
          type: 'character_list',
          characters: buildCharacterSummaries(),
          clock: toPublicClock(worldClock, sessions.size),
        });
        break;
      }

      case 'create_character': {
        const trimmedName = msg.name.trim().slice(0, 12);
        if (!trimmedName) {
          send(ws, { type: 'error', message: 'おなまえを入力してね！' });
          return;
        }
        if (!JOBS[msg.jobId]) {
          send(ws, { type: 'error', message: '職業が正しくありません' });
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
          spouseNpcId: null,
          parentNames: null,
          inventory: [
            { itemId: 'onigiri', name: 'ほかほかおにぎり', emoji: '🍙', count: 3 },
          ],
          lastSeenAt: Date.now(),
        };

        db.saveCharacter(newChar);
        loginCharacter(ws, newChar.id);
        break;
      }

      case 'login_character': {
        loginCharacter(ws, msg.characterId);
        break;
      }

      case 'move': {
        const session = sessions.get(ws);
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
          ws
        );
        break;
      }

      case 'chat': {
        const session = sessions.get(ws);
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
        const session = sessions.get(ws);
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
        const session = sessions.get(ws);
        if (!session || !JOBS[msg.jobId]) return;
        session.data.jobId = msg.jobId;
        if (msg.jobId !== 'adventurer' && session.data.shopLevel === 0) {
          session.data.shopLevel = 1;
        }
        session.state.jobId = msg.jobId;
        db.saveCharacter(session.data);

        send(ws, { type: 'self_updated', self: session.data });
        broadcast({ type: 'player_updated', player: session.state }, ws);
        break;
      }

      case 'interact_npc': {
        const session = sessions.get(ws);
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
        const lineIdx = Math.min(
          npc.dialogue.length - 1,
          Math.floor(nextAffinity / 30)
        );
        const line = npc.dialogue[lineIdx] ?? npc.dialogue[0];

        send(ws, {
          type: 'npc_dialog',
          npc,
          line,
          affinity: nextAffinity,
          canRomance,
        });
        break;
      }

      case 'eat_snack': {
        const session = sessions.get(ws);
        if (!session) return;
        const snack = session.data.inventory.find((i) => i.itemId === 'onigiri' && i.count > 0);
        if (!snack) {
          send(ws, { type: 'error', message: 'おにぎりを持っていないよ！' });
          return;
        }
        snack.count -= 1;
        session.data.hunger = Math.min(session.data.maxHunger, session.data.hunger + 35);
        session.data.stamina = Math.min(session.data.maxStamina, session.data.stamina + 25);
        db.saveCharacter(session.data);
        send(ws, { type: 'self_updated', self: session.data });
        break;
      }
    }
  });

  ws.on('close', () => {
    const session = sessions.get(ws);
    if (!session) return;
    session.data.lastSeenAt = Date.now();
    db.saveCharacter(session.data);
    sessions.delete(ws);
    onlineByCharId.delete(session.characterId);

    broadcast({
      type: 'player_left',
      playerId: session.characterId,
      onlineCount: sessions.size,
    });
  });
});

function loginCharacter(ws: WebSocket, characterId: string): void {
  if (sessions.size >= MAX_PLAYERS && !sessions.has(ws)) {
    send(ws, {
      type: 'error',
      message: `いま満員（${MAX_PLAYERS}/${MAX_PLAYERS}人）だよ！少し待ってから入ってね。`,
    });
    return;
  }
  if (onlineByCharId.has(characterId)) {
    send(ws, {
      type: 'error',
      message: 'そのキャラクターはいま別の端末でログイン中だよ！',
    });
    return;
  }

  const charData = db.getCharacter(characterId);
  if (!charData) {
    send(ws, { type: 'error', message: 'キャラクターが見つかりませんでした' });
    return;
  }

  const state = toOnlineState(charData);
  const session: ActiveSession = { ws, characterId: charData.id, state, data: charData };
  sessions.set(ws, session);
  onlineByCharId.set(charData.id, session);

  const onlinePlayers = Array.from(sessions.values()).map((s) => s.state);
  send(ws, {
    type: 'login_success',
    self: charData,
    players: onlinePlayers,
    npcs,
    clock: toPublicClock(worldClock, sessions.size),
    chatHistory: db.getRecentChat(30),
  });

  broadcast(
    {
      type: 'player_joined',
      player: state,
      onlineCount: sessions.size,
    },
    ws
  );
}

// World simulation loop (5Hz for smooth NPC stroll & shared clock)
let lastTickMs = Date.now();
let saveCounter = 0;

setInterval(() => {
  const now = Date.now();
  const dtSeconds = Math.min(1, (now - lastTickMs) / 1000);
  lastTickMs = now;

  if (sessions.size > 0) {
    const { clock, newYear } = advanceWorldClock(worldClock, dtSeconds, sessions.size);
    worldClock = clock;
    npcSim.step(npcs, dtSeconds, now);

    // Gentle hunger drain while active
    for (const s of sessions.values()) {
      s.data.hunger = Math.max(0, s.data.hunger - dtSeconds * 0.08);
    }

    // Age everyone by +1 when a new year arrives in the shared world
    if (newYear) {
      for (const c of db.listCharacters()) {
        c.age += 1;
        db.saveCharacter(c);
        const online = onlineByCharId.get(c.id);
        if (online) {
          online.data.age = c.age;
          online.state.age = c.age;
          send(online.ws, { type: 'self_updated', self: online.data });
          broadcast({ type: 'player_updated', player: online.state }, online.ws);
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
  console.log(`🏡 Familia Town server running on http://localhost:${PORT} (WS: /ws)`);
});
