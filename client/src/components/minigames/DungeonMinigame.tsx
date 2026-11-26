import { useEffect, useRef, useState } from 'react';
import { soundManager } from '../../game/audio';

interface Props {
  tier: 1 | 2 | 3;
  skillRanks: Record<string, number>;
  onFinish: (score: number) => void;
}

interface Target {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  kind: 'slime' | 'goblin' | 'dragon' | 'chest';
}

export function DungeonMinigame({ tier, skillRanks, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [timeLeft, setTimeLeft] = useState(16);
  const [defeated, setDefeated] = useState(0);
  const [totalTargets, setTotalTargets] = useState(1);
  const finishedRef = useRef(false);

  const slashRank = skillRanks['adv_slash_wide'] ?? 0;
  const treasureRank = skillRanks['adv_treasure_eye'] ?? 0;
  const dashRank = skillRanks['adv_dash'] ?? 0;

  useEffect(() => {
    soundManager.playBgm('dungeon');
    const W = 420;
    const H = 260;

    const enemyCount = tier === 1 ? 5 : tier === 2 ? 7 : 9;
    const chestCount = 1 + (treasureRank > 0 ? 1 : 0);
    const targets: Target[] = [];
    let nextId = 1;

    for (let i = 0; i < enemyCount; i++) {
      const kind = tier === 1 ? 'slime' : tier === 2 ? (i % 2 === 0 ? 'goblin' : 'slime') : i === 0 ? 'dragon' : 'goblin';
      const hp = kind === 'dragon' ? 3 : kind === 'goblin' ? 2 : 1;
      const spd = (tier === 1 ? 35 : tier === 2 ? 55 : 75) + Math.random() * 25;
      const ang = Math.random() * Math.PI * 2;
      targets.push({
        id: nextId++,
        x: 60 + Math.random() * (W - 120),
        y: 45 + Math.random() * (H - 90),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        hp,
        maxHp: hp,
        kind,
      });
    }
    for (let i = 0; i < chestCount; i++) {
      targets.push({
        id: nextId++,
        x: 50 + Math.random() * (W - 100),
        y: 45 + Math.random() * (H - 90),
        vx: 0,
        vy: 0,
        hp: 1,
        maxHp: 1,
        kind: 'chest',
      });
    }
    setTotalTargets(targets.length);

    const player = { x: W / 2, y: H - 36, slashTimer: 0 };
    const slashRadius = 46 + slashRank * 14;
    const moveSpeed = 160 + dashRank * 45;
    let pointerTarget: { x: number; y: number } | null = null;
    const keys = new Set<string>();

    const triggerSlash = () => {
      if (player.slashTimer > 0.05) return;
      player.slashTimer = 0.22;
      soundManager.playPop(420, 0.07);
      let hits = 0;
      for (const t of targets) {
        if (t.hp <= 0) continue;
        const d = Math.hypot(t.x - player.x, t.y - player.y);
        if (d <= slashRadius + 16) {
          t.hp -= 1;
          hits += 1;
          if (t.hp <= 0) {
            soundManager.playPop(t.kind === 'chest' ? 860 : 640, 0.09);
          }
        }
      }
      if (hits > 0) {
        const count = targets.filter((t) => t.hp <= 0).length;
        setDefeated(count);
        if (count >= targets.length && !finishedRef.current) {
          finishedRef.current = true;
          setTimeout(() => onFinish(100), 320);
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (e.key === ' ') {
        e.preventDefault();
        triggerSlash();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const canvas = canvasRef.current;
    const onPointerDown = (e: PointerEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * W;
      const sy = ((e.clientY - rect.top) / rect.height) * H;
      pointerTarget = { x: sx, y: sy };
      if (Math.hypot(sx - player.x, sy - player.y) < slashRadius + 28) {
        triggerSlash();
      }
    };
    canvas?.addEventListener('pointerdown', onPointerDown);

    const startMs = performance.now();
    let lastMs = startMs;
    let rafId = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastMs) / 1000);
      lastMs = now;
      const elapsed = (now - startMs) / 1000;
      const rem = Math.max(0, 16 - elapsed);
      setTimeLeft(Math.ceil(rem));

      if (rem <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        const count = targets.filter((t) => t.hp <= 0).length;
        const pct = Math.round((count / targets.length) * 100);
        onFinish(pct);
        return;
      }

      // Move player
      let vx = 0;
      let vy = 0;
      if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
      if (keys.has('arrowright') || keys.has('d')) vx += 1;
      if (keys.has('arrowup') || keys.has('w')) vy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) vy += 1;

      if (vx !== 0 || vy !== 0) {
        pointerTarget = null;
        const m = Math.hypot(vx, vy);
        player.x = Math.max(20, Math.min(W - 20, player.x + (vx / m) * moveSpeed * dt));
        player.y = Math.max(20, Math.min(H - 20, player.y + (vy / m) * moveSpeed * dt));
      } else if (pointerTarget) {
        const dx = pointerTarget.x - player.x;
        const dy = pointerTarget.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          player.x += (dx / dist) * Math.min(dist, moveSpeed * dt);
          player.y += (dy / dist) * Math.min(dist, moveSpeed * dt);
        } else {
          pointerTarget = null;
          triggerSlash();
        }
      }

      if (player.slashTimer > 0) player.slashTimer = Math.max(0, player.slashTimer - dt);

      // Update monsters
      for (const t of targets) {
        if (t.hp <= 0 || t.kind === 'chest') continue;
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        if (t.x < 24 || t.x > W - 24) t.vx *= -1;
        if (t.y < 24 || t.y > H - 24) t.vy *= -1;
      }

      // Draw arena
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.fillStyle = tier === 1 ? '#36543E' : tier === 2 ? '#3B4254' : '#3D2C44';
        ctx.fillRect(0, 0, W, H);

        // Floor tiles
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        for (let x = 0; x < W; x += 35) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        for (let y = 0; y < H; y += 35) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }

        // Slash range ring
        ctx.strokeStyle = player.slashTimer > 0 ? 'rgba(255, 224, 102, 0.9)' : 'rgba(255, 255, 255, 0.16)';
        ctx.fillStyle = player.slashTimer > 0 ? 'rgba(255, 224, 102, 0.28)' : 'transparent';
        ctx.lineWidth = player.slashTimer > 0 ? 4 : 1.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, slashRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw targets
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const t of targets) {
          if (t.hp <= 0) continue;
          ctx.font = '26px sans-serif';
          const icon = t.kind === 'chest' ? '🧰' : t.kind === 'dragon' ? '🐉' : t.kind === 'goblin' ? '👺' : '🟢';
          ctx.fillText(icon, t.x, t.y);
          if (t.maxHp > 1) {
            ctx.fillStyle = '#222';
            ctx.fillRect(t.x - 14, t.y - 22, 28, 5);
            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(t.x - 14, t.y - 22, 28 * (t.hp / t.maxHp), 5);
          }
        }

        // Draw player
        ctx.font = '28px sans-serif';
        ctx.fillText('⚔️', player.x, player.y);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas?.removeEventListener('pointerdown', onPointerDown);
      soundManager.playBgm('town');
    };
  }, [dashRank, onFinish, slashRank, tier, treasureRank]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, fontWeight: 800, fontSize: 14 }}>
        <span>⏱️ のこり {timeLeft}秒</span>
        <span>🎯 たおした/ゲット: {defeated} / {totalTargets}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={420}
        height={260}
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          border: '3px solid #754C29',
          cursor: 'crosshair',
          touchAction: 'none',
        }}
      />
      <div style={{ fontSize: 12, opacity: 0.85, textAlign: 'center' }}>
        💡 敵や宝箱をタップ（またはWASD移動＋Space）で攻撃＆ゲット！
      </div>
    </div>
  );
}
