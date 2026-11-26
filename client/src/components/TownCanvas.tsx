import { useEffect, useRef } from 'react';
import {
  type CharacterData,
  type Direction,
  type NpcData,
  type OnlinePlayerState,
  type WorldClock,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  clampAndResolvePosition,
} from '@familia-town/shared';
import { drawChibiCharacter } from '../game/chibiRenderer';
import { drawDayNightOverlay, drawTownBackground } from '../game/mapRenderer';

interface TownCanvasProps {
  self: CharacterData;
  clock: WorldClock;
  playersRef: React.MutableRefObject<Map<string, OnlinePlayerState>>;
  npcsRef: React.MutableRefObject<Map<string, NpcData>>;
  joystickRef: React.MutableRefObject<{ dx: number; dy: number }>;
  onSendMove: (x: number, y: number, dir: Direction, moving: boolean) => void;
  onNearbyNpcChange: (npc: NpcData | null) => void;
  onInteractNpc: (npcId: string) => void;
}

export function TownCanvas({
  self,
  clock,
  playersRef,
  npcsRef,
  joystickRef,
  onSendMove,
  onNearbyNpcChange,
  onInteractNpc,
}: TownCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const clockRef = useRef(clock);
  clockRef.current = clock;

  const selfRef = useRef(self);
  selfRef.current = self;

  const localPosRef = useRef({ x: self.x, y: self.y, dir: self.dir as Direction, moving: false });
  const nearestNpcRef = useRef<NpcData | null>(null);

  useEffect(() => {
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      keys.add(e.key.toLowerCase());
      if ((e.key === ' ' || e.key === 'Enter') && nearestNpcRef.current) {
        e.preventDefault();
        onInteractNpc(nearestNpcRef.current.id);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let rafId = 0;
    let lastFrameMs = performance.now();
    let lastNetSendMs = 0;
    let lastReportedNpcId: string | null = null;

    const loop = (nowMs: number) => {
      const dt = Math.min(0.05, (nowMs - lastFrameMs) / 1000);
      lastFrameMs = nowMs;

      const canvas = canvasRef.current;
      if (canvas) {
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }

        // Compute movement vector from keyboard + touch joystick
        let vx = joystickRef.current.dx;
        let vy = joystickRef.current.dy;
        if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
        if (keys.has('arrowright') || keys.has('d')) vx += 1;
        if (keys.has('arrowup') || keys.has('w')) vy -= 1;
        if (keys.has('arrowdown') || keys.has('s')) vy += 1;

        const mag = Math.hypot(vx, vy);
        const speed = 185;
        const pos = localPosRef.current;
        const wasMoving = pos.moving;

        if (mag > 0.1) {
          const nx = pos.x + (vx / Math.max(1, mag)) * speed * dt;
          const ny = pos.y + (vy / Math.max(1, mag)) * speed * dt;
          const resolved = clampAndResolvePosition(nx, ny);
          pos.x = resolved.x;
          pos.y = resolved.y;
          pos.moving = true;
          if (Math.abs(vx) > Math.abs(vy)) {
            pos.dir = vx > 0 ? 'right' : 'left';
          } else {
            pos.dir = vy > 0 ? 'down' : 'up';
          }
        } else {
          pos.moving = false;
        }

        // Keep own entry in playersRef synced for smooth local rendering
        const myOnline = playersRef.current.get(selfRef.current.id);
        if (myOnline) {
          myOnline.x = pos.x;
          myOnline.y = pos.y;
          myOnline.dir = pos.dir;
          myOnline.moving = pos.moving;
        }

        // Throttle network move updates (~20Hz while moving, or once on stop)
        if ((pos.moving && nowMs - lastNetSendMs > 50) || (!pos.moving && wasMoving)) {
          lastNetSendMs = nowMs;
          onSendMove(Math.round(pos.x), Math.round(pos.y), pos.dir, pos.moving);
        }

        // Find nearest interactable NPC within 75px
        let nearest: NpcData | null = null;
        let bestDist = 78;
        for (const npc of npcsRef.current.values()) {
          const d = Math.hypot(npc.x - pos.x, npc.y - pos.y);
          if (d < bestDist) {
            bestDist = d;
            nearest = npc;
          }
        }
        nearestNpcRef.current = nearest;
        const nextId = nearest?.id ?? null;
        if (nextId !== lastReportedNpcId) {
          lastReportedNpcId = nextId;
          onNearbyNpcChange(nearest);
        }

        // Camera clamped to town bounds
        const camX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, pos.x - canvas.width / 2));
        const camY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, pos.y - canvas.height / 2));

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const timeSec = nowMs / 1000;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          ctx.save();
          ctx.translate(-Math.round(camX), -Math.round(camY));

          drawTownBackground(ctx, clockRef.current, timeSec, selfRef.current.homePlotIndex);

          // Collect all drawable characters (players + NPCs) and Y-sort for depth
          type DrawItem = { y: number; draw: () => void };
          const items: DrawItem[] = [];
          const nowEpoch = Date.now();

          for (const npc of npcsRef.current.values()) {
            const canRomance = npc.canMarry && npc.gender !== selfRef.current.gender;
            items.push({
              y: npc.y,
              draw: () =>
                drawChibiCharacter(ctx, {
                  x: npc.x,
                  y: npc.y,
                  appearance: npc.appearance,
                  dir: npc.dir,
                  moving: npc.moving,
                  timeSec,
                  name: npc.name,
                  jobId: npc.jobId,
                  isNpc: true,
                  canRomance,
                }),
            });
          }

          for (const p of playersRef.current.values()) {
            const showBubble = p.bubbleExpiresAt && p.bubbleExpiresAt > nowEpoch;
            items.push({
              y: p.y,
              draw: () =>
                drawChibiCharacter(ctx, {
                  x: p.x,
                  y: p.y,
                  appearance: p.appearance,
                  dir: p.dir,
                  moving: p.moving,
                  timeSec,
                  name: p.name,
                  jobId: p.jobId,
                  bubbleText: showBubble ? p.bubbleText : undefined,
                  bubbleStamp: showBubble ? p.bubbleStamp : undefined,
                }),
            });
          }

          items.sort((a, b) => a.y - b.y);
          for (const item of items) item.draw();

          ctx.restore();

          drawDayNightOverlay(ctx, clockRef.current, canvas.width, canvas.height, timeSec);
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [joystickRef, npcsRef, onInteractNpc, onNearbyNpcChange, onSendMove, playersRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100vw',
        height: '100vh',
        touchAction: 'none',
      }}
    />
  );
}
