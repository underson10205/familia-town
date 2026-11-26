import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Appearance,
  CharacterData,
  CharacterSummary,
  ChatMessage,
  ClientMessage,
  Direction,
  Gender,
  JobId,
  NpcData,
  OnlinePlayerState,
  ServerMessage,
  StampId,
  WorldClock,
} from '@familia-town/shared';
import { soundManager } from '../game/audio';

export interface NpcDialogState {
  npc: NpcData;
  line: string;
  affinity: number;
  canRomance: boolean;
}

export function useGameSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [clock, setClock] = useState<WorldClock | null>(null);
  const [self, setSelf] = useState<CharacterData | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [npcDialog, setNpcDialog] = useState<NpcDialogState | null>(null);

  // Use refs for high-frequency 60fps canvas rendering without re-rendering React every frame
  const playersRef = useRef<Map<string, OnlinePlayerState>>(new Map());
  const npcsRef = useRef<Map<string, NpcData>>(new Map());

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    let closed = false;
    let reconnectTimer: number | undefined;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, 2000);
        }
      };

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as ServerMessage;
        switch (msg.type) {
          case 'character_list':
            setCharacters(msg.characters);
            setClock(msg.clock);
            break;

          case 'login_success': {
            setSelf(msg.self);
            setClock(msg.clock);
            setChatHistory(msg.chatHistory);
            const pMap = new Map<string, OnlinePlayerState>();
            for (const p of msg.players) pMap.set(p.id, p);
            playersRef.current = pMap;
            const nMap = new Map<string, NpcData>();
            for (const n of msg.npcs) nMap.set(n.id, n);
            npcsRef.current = nMap;
            soundManager.playChime();
            soundManager.playBgm('town');
            break;
          }

          case 'error':
            setError(msg.message);
            window.setTimeout(() => setError(null), 4000);
            break;

          case 'world_tick':
            setClock(msg.clock);
            for (const u of msg.npcs) {
              const existing = npcsRef.current.get(u.id);
              if (existing) {
                existing.x = u.x;
                existing.y = u.y;
                existing.dir = u.dir;
                existing.moving = u.moving;
              }
            }
            break;

          case 'player_joined':
            playersRef.current.set(msg.player.id, msg.player);
            setClock((prev) => (prev ? { ...prev, onlineCount: msg.onlineCount } : prev));
            soundManager.playChime();
            break;

          case 'player_left':
            playersRef.current.delete(msg.playerId);
            setClock((prev) => (prev ? { ...prev, onlineCount: msg.onlineCount } : prev));
            break;

          case 'player_moved': {
            const p = playersRef.current.get(msg.playerId);
            if (p) {
              p.x = msg.x;
              p.y = msg.y;
              p.dir = msg.dir;
              p.moving = msg.moving;
            }
            break;
          }

          case 'player_updated':
            playersRef.current.set(msg.player.id, msg.player);
            break;

          case 'self_updated': {
            setSelf(msg.self);
            const p = playersRef.current.get(msg.self.id);
            if (p) {
              p.jobId = msg.self.jobId;
              p.age = msg.self.age;
              p.appearance = msg.self.appearance;
            }
            break;
          }

          case 'chat_broadcast': {
            setChatHistory((prev) => [...prev.slice(-39), msg.message]);
            const sender = playersRef.current.get(msg.message.senderId);
            if (sender) {
              sender.bubbleText = msg.message.text;
              sender.bubbleStamp = msg.message.stamp;
              sender.bubbleExpiresAt = Date.now() + 4500;
            }
            soundManager.playPop(msg.message.stamp ? 660 : 520, 0.08);
            break;
          }

          case 'npc_dialog':
            setNpcDialog({
              npc: msg.npc,
              line: msg.line,
              affinity: msg.affinity,
              canRomance: msg.canRomance,
            });
            soundManager.playPop(580, 0.09);
            break;
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const createCharacter = useCallback(
    (name: string, gender: Gender, jobId: JobId, appearance: Appearance) => {
      soundManager.unlock();
      send({ type: 'create_character', name, gender, jobId, appearance });
    },
    [send]
  );

  const loginCharacter = useCallback(
    (characterId: string) => {
      soundManager.unlock();
      send({ type: 'login_character', characterId });
    },
    [send]
  );

  const sendMove = useCallback(
    (x: number, y: number, dir: Direction, moving: boolean) => {
      send({ type: 'move', x, y, dir, moving });
    },
    [send]
  );

  const sendChat = useCallback((text: string) => send({ type: 'chat', text }), [send]);
  const sendStamp = useCallback((stamp: StampId) => send({ type: 'stamp', stamp }), [send]);
  const changeJob = useCallback(
    (jobId: JobId) => {
      soundManager.playChime();
      send({ type: 'change_job', jobId });
    },
    [send]
  );
  const interactNpc = useCallback((npcId: string) => send({ type: 'interact_npc', npcId }), [send]);
  const eatSnack = useCallback(() => {
    soundManager.playPop(700, 0.1);
    send({ type: 'eat_snack' });
  }, [send]);

  return {
    connected,
    error,
    characters,
    clock,
    self,
    playersRef,
    npcsRef,
    chatHistory,
    npcDialog,
    setNpcDialog,
    createCharacter,
    loginCharacter,
    sendMove,
    sendChat,
    sendStamp,
    changeJob,
    interactNpc,
    eatSnack,
  };
}
