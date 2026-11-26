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
  const modeRef = useRef<'ws' | 'http'>('ws');
  const httpClientIdRef = useRef<string>(`http_${Math.random().toString(36).slice(2, 10)}`);

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

  const handleServerMessage = useCallback((msg: ServerMessage) => {
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
  }, []);

  const sendHttp = useCallback(
    async (msg: ClientMessage) => {
      try {
        const res = await fetch('./api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: httpClientIdRef.current, message: msg }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: ServerMessage[] };
        setConnected(true);
        if (data.messages) {
          for (const m of data.messages) handleServerMessage(m);
        }
      } catch {
        // Retry on next poll
      }
    },
    [handleServerMessage]
  );

  const send = useCallback(
    (msg: ClientMessage) => {
      if (modeRef.current === 'ws' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      } else {
        void sendHttp(msg);
      }
    },
    [sendHttp]
  );

  useEffect(() => {
    let closed = false;
    let pollTimer: number | undefined;
    let wsFallbackTimer: number | undefined;

    const startHttpFallback = () => {
      if (closed || modeRef.current === 'http') return;
      modeRef.current = 'http';
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      void sendHttp({ type: 'list_characters' });

      const poll = async () => {
        if (closed) return;
        try {
          const res = await fetch(`./api/poll?clientId=${encodeURIComponent(httpClientIdRef.current)}`);
          if (res.ok) {
            setConnected(true);
            const data = (await res.json()) as { messages?: ServerMessage[] };
            if (data.messages) {
              for (const m of data.messages) handleServerMessage(m);
            }
          }
        } catch {
          // ignore transient errors
        }
        if (!closed) {
          pollTimer = window.setTimeout(poll, 160);
        }
      };
      pollTimer = window.setTimeout(poll, 160);
    };

    // Try WebSocket first; if proxy blocks WS upgrade, seamlessly switch to HTTP fallback within 1.2s
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const basePath = window.location.pathname.endsWith('/')
        ? window.location.pathname
        : `${window.location.pathname}/`;
      const wsUrl = `${protocol}//${window.location.host}${basePath}ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      wsFallbackTimer = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          startHttpFallback();
        }
      }, 1200);

      ws.onopen = () => {
        if (wsFallbackTimer) window.clearTimeout(wsFallbackTimer);
        modeRef.current = 'ws';
        setConnected(true);
        setError(null);
      };

      ws.onerror = () => {
        if (wsFallbackTimer) window.clearTimeout(wsFallbackTimer);
        startHttpFallback();
      };

      ws.onclose = () => {
        if (modeRef.current === 'ws' && !closed) {
          startHttpFallback();
        }
      };

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as ServerMessage;
        handleServerMessage(msg);
      };
    } catch {
      startHttpFallback();
    }

    return () => {
      closed = true;
      if (pollTimer) window.clearTimeout(pollTimer);
      if (wsFallbackTimer) window.clearTimeout(wsFallbackTimer);
      wsRef.current?.close();
    };
  }, [handleServerMessage, sendHttp]);

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
  const unlockSkill = useCallback(
    (skillId: string) => {
      send({ type: 'unlock_skill', skillId });
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
    unlockSkill,
    interactNpc,
    eatSnack,
  };
}
