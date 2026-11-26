import { useEffect, useRef, useState } from 'react';
import {
  type CharacterData,
  type Direction,
  type WorkRecipeDef,
} from '@familia-town/shared';
import { drawChibiCharacter } from '../game/chibiRenderer';
import { soundManager } from '../game/audio';

interface DungeonCanvasProps {
  self: CharacterData;
  recipe: WorkRecipeDef;
  onExit: (score: number) => void;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'wall' | 'pillar' | 'water';
}

interface Enemy {
  id: number;
  kind: 'slime' | 'goblin' | 'bat' | 'dragon';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  hitFlash: number;
  knockVx: number;
  knockVy: number;
  aiTimer: number;
}

interface LootNode {
  id: number;
  kind: 'chest' | 'ore' | 'herb' | 'heart';
  x: number;
  y: number;
  collected: boolean;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const DUNGEON_W = 1280;
const DUNGEON_H = 920;
const WALL_T = 44;

const THEMES = {
  1: { floor: '#4B724E', tile: '#446847', wall: '#2E4632', pillar: '#6E786F', name: 'はじまりの森ダンジョン' },
  2: { floor: '#4A4E5E', tile: '#424656', wall: '#2B2E3A', pillar: '#69748C', name: '鉱石どうくつ' },
  3: { floor: '#46324F', tile: '#3D2A45', wall: '#26192C', pillar: '#7A548A', name: '深層古代ダンジョン' },
};

export function DungeonCanvas({ self, recipe, onExit }: DungeonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joystickRef = useRef({ dx: 0, dy: 0 });
  const attackTriggerRef = useRef(false);
  const dashTriggerRef = useRef(false);
  const exitedRef = useRef(false);

  const skillRanks = self.skillRanks ?? {};
  const slashRank = skillRanks['adv_slash_wide'] ?? 0;
  const treasureRank = skillRanks['adv_treasure_eye'] ?? 0;
  const dashRank = skillRanks['adv_dash'] ?? 0;
  const rootRank = skillRanks['adv_root'] ?? 0;

  const [hudState, setHudState] = useState({
    hp: 10,
    maxHp: 10,
    defeated: 0,
    totalEnemies: 1,
    chestsOpened: 0,
    totalChests: 1,
    gathered: 0,
  });

  const finishDungeon = (score: number) => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    soundManager.playChime();
    soundManager.playBgm('town');
    onExit(Math.max(15, Math.min(100, Math.round(score))));
  };

  useEffect(() => {
    soundManager.playBgm('dungeon');
    const tier = recipe.tier;
    const theme = THEMES[tier];

    // Build dungeon room layout with pillars/walls creating Zelda-style rooms & corridors
    const obstacles: Obstacle[] = [
      // Room divider walls with wide passages
      { x: 420, y: WALL_T, w: 40, h: 280, kind: 'wall' },
      { x: 420, y: 460, w: 40, h: 260, kind: 'wall' },
      { x: 820, y: 180, w: 40, h: 320, kind: 'wall' },
      { x: 820, y: 640, w: 40, h: 240, kind: 'wall' },
      // Decorative stone pillars
      { x: 210, y: 240, w: 48, h: 48, kind: 'pillar' },
      { x: 210, y: 600, w: 48, h: 48, kind: 'pillar' },
      { x: 610, y: 390, w: 56, h: 56, kind: 'pillar' },
      { x: 1020, y: 260, w: 52, h: 52, kind: 'pillar' },
      { x: 1020, y: 610, w: 52, h: 52, kind: 'pillar' },
    ];

    const resolvePos = (x: number, y: number, r: number) => {
      let nx = Math.max(WALL_T + r, Math.min(DUNGEON_W - WALL_T - r, x));
      let ny = Math.max(WALL_T + r, Math.min(DUNGEON_H - WALL_T - r, y));
      for (const ob of obstacles) {
        const cx = Math.max(ob.x, Math.min(nx, ob.x + ob.w));
        const cy = Math.max(ob.y, Math.min(ny, ob.y + ob.h));
        const dx = nx - cx;
        const dy = ny - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 1;
          nx = cx + (dx / d) * r;
          ny = cy + (dy / d) * r;
        }
      }
      return { x: nx, y: ny };
    };

    // Spawn enemies across the 3 rooms
    const enemySpawns: { x: number; y: number; kind: Enemy['kind'] }[] =
      tier === 1
        ? [
            { x: 280, y: 360, kind: 'slime' },
            { x: 250, y: 150, kind: 'slime' },
            { x: 580, y: 220, kind: 'slime' },
            { x: 640, y: 660, kind: 'slime' },
            { x: 980, y: 440, kind: 'goblin' },
            { x: 1120, y: 180, kind: 'slime' },
          ]
        : tier === 2
        ? [
            { x: 270, y: 340, kind: 'slime' },
            { x: 240, y: 150, kind: 'bat' },
            { x: 590, y: 200, kind: 'goblin' },
            { x: 640, y: 660, kind: 'goblin' },
            { x: 700, y: 440, kind: 'bat' },
            { x: 1020, y: 430, kind: 'goblin' },
            { x: 1130, y: 180, kind: 'bat' },
            { x: 1100, y: 740, kind: 'goblin' },
          ]
        : [
            { x: 270, y: 320, kind: 'goblin' },
            { x: 240, y: 150, kind: 'bat' },
            { x: 590, y: 200, kind: 'goblin' },
            { x: 640, y: 670, kind: 'goblin' },
            { x: 700, y: 440, kind: 'bat' },
            { x: 1060, y: 440, kind: 'dragon' }, // Boss!
            { x: 1120, y: 170, kind: 'goblin' },
            { x: 1120, y: 730, kind: 'bat' },
          ];

    const enemies: Enemy[] = enemySpawns.map((sp, i) => {
      const hp = sp.kind === 'dragon' ? 7 : sp.kind === 'goblin' ? 3 : sp.kind === 'bat' ? 2 : 2;
      return {
        id: i + 1,
        kind: sp.kind,
        x: sp.x,
        y: sp.y,
        vx: 0,
        vy: 0,
        hp,
        maxHp: hp,
        radius: sp.kind === 'dragon' ? 24 : 17,
        hitFlash: 0,
        knockVx: 0,
        knockVy: 0,
        aiTimer: Math.random() * 1.5,
      };
    });

    // Spawn treasure chests & gatherable ore/herbs
    const lootNodes: LootNode[] = [
      { id: 1, kind: 'chest', x: 140, y: 130, collected: false },
      { id: 2, kind: 'chest', x: 640, y: 120, collected: false },
      { id: 3, kind: 'chest', x: 1160, y: 440, collected: false },
      { id: 4, kind: 'ore', x: 320, y: 740, collected: false },
      { id: 5, kind: 'herb', x: 540, y: 780, collected: false },
      { id: 6, kind: 'ore', x: 960, y: 140, collected: false },
      { id: 7, kind: 'herb', x: 940, y: 790, collected: false },
    ];
    if (treasureRank > 0) {
      lootNodes.push({ id: 8, kind: 'chest', x: 640, y: 800, collected: false });
    }

    const totalEnemies = enemies.length;
    const totalChests = lootNodes.filter((n) => n.kind === 'chest').length;

    const player = {
      x: 130,
      y: DUNGEON_H - 120,
      dir: 'right' as Direction,
      moving: false,
      hp: 10,
      maxHp: 10,
      invuln: 0,
      slashTimer: 0,
      slashCooldown: 0,
      slashAngle: 0,
      dashTimer: 0,
      dashCooldown: 0,
    };

    const exitPortal = { x: 110, y: DUNGEON_H - 120, r: 34 };
    const floats: FloatingText[] = [];
    const keys = new Set<string>();

    const slashReach = 54 + slashRank * 14;
    const slashArc = Math.PI * (0.72 + slashRank * 0.12);
    const attackDamage = 1 + (rootRank >= 2 ? 1 : 0);

    const computeScore = () => {
      const def = enemies.filter((e) => e.hp <= 0).length;
      const chests = lootNodes.filter((n) => n.kind === 'chest' && n.collected).length;
      const gathered = lootNodes.filter((n) => (n.kind === 'ore' || n.kind === 'herb') && n.collected).length;
      const enemyRatio = def / Math.max(1, totalEnemies);
      const chestRatio = chests / Math.max(1, totalChests);
      return Math.min(100, Math.round(enemyRatio * 65 + chestRatio * 25 + gathered * 4));
    };

    const syncHud = () => {
      setHudState({
        hp: player.hp,
        maxHp: player.maxHp,
        defeated: enemies.filter((e) => e.hp <= 0).length,
        totalEnemies,
        chestsOpened: lootNodes.filter((n) => n.kind === 'chest' && n.collected).length,
        totalChests,
        gathered: lootNodes.filter((n) => (n.kind === 'ore' || n.kind === 'herb') && n.collected).length,
      });
    };
    syncHud();

    const doSlash = () => {
      if (player.slashCooldown > 0) return;
      player.slashTimer = 0.2;
      player.slashCooldown = 0.32;
      player.slashAngle =
        player.dir === 'right'
          ? 0
          : player.dir === 'down'
          ? Math.PI / 2
          : player.dir === 'left'
          ? Math.PI
          : -Math.PI / 2;
      soundManager.playPop(440, 0.07);

      let hudChanged = false;

      // Hit enemies inside directional Zelda sword arc
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= slashReach + e.radius) {
          const ang = Math.atan2(dy, dx);
          let diff = ang - player.slashAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) <= slashArc / 2 || dist < 30) {
            e.hp -= attackDamage;
            e.hitFlash = 0.18;
            const d = dist || 1;
            e.knockVx = (dx / d) * 260;
            e.knockVy = (dy / d) * 260;
            floats.push({ x: e.x, y: e.y - 20, text: `-${attackDamage}`, color: '#FFE066', life: 0.6 });
            soundManager.playPop(e.hp <= 0 ? 740 : 580, 0.08);
            if (e.hp <= 0) {
              hudChanged = true;
              floats.push({ x: e.x, y: e.y - 34, text: '✨ たおした!', color: '#7DF2A8', life: 0.9 });
              // Chance to drop a healing heart
              if (Math.random() < 0.45) {
                lootNodes.push({ id: Date.now() + Math.random(), kind: 'heart', x: e.x, y: e.y, collected: false });
              }
            }
          }
        }
      }

      // Slash gatherable ore/herbs & chests
      for (const node of lootNodes) {
        if (node.collected || node.kind === 'heart') continue;
        const dist = Math.hypot(node.x - player.x, node.y - player.y);
        if (dist <= slashReach + 18) {
          node.collected = true;
          hudChanged = true;
          soundManager.playChime();
          const label = node.kind === 'chest' ? '🧰 お宝GET!' : node.kind === 'ore' ? '🪨 鉱石GET!' : '🌿 薬草GET!';
          floats.push({ x: node.x, y: node.y - 22, text: label, color: '#FFD466', life: 1.0 });
        }
      }

      if (hudChanged) {
        syncHud();
        const allEnemiesDead = enemies.every((e) => e.hp <= 0);
        const allChestsOpen = lootNodes.filter((n) => n.kind === 'chest').every((c) => c.collected);
        if (allEnemiesDead && allChestsOpen) {
          floats.push({ x: player.x, y: player.y - 50, text: '🎉 ダンジョン完全クリア！', color: '#FFE066', life: 1.4 });
          setTimeout(() => finishDungeon(100), 850);
        }
      }
    };

    const doDash = () => {
      if (player.dashCooldown > 0) return;
      player.dashTimer = 0.18;
      player.dashCooldown = dashRank > 0 ? 0.65 : 1.1;
      player.invuln = Math.max(player.invuln, 0.22);
      soundManager.playPop(620, 0.06);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.add(k);
      if (k === ' ' || k === 'j') {
        e.preventDefault();
        doSlash();
      } else if (k === 'shift' || k === 'k') {
        e.preventDefault();
        doDash();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let rafId = 0;
    let lastMs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastMs) / 1000);
      lastMs = now;

      if (attackTriggerRef.current) {
        attackTriggerRef.current = false;
        doSlash();
      }
      if (dashTriggerRef.current) {
        dashTriggerRef.current = false;
        doDash();
      }

      // Player movement
      let vx = joystickRef.current.dx;
      let vy = joystickRef.current.dy;
      if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
      if (keys.has('arrowright') || keys.has('d')) vx += 1;
      if (keys.has('arrowup') || keys.has('w')) vy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) vy += 1;

      const mag = Math.hypot(vx, vy);
      const baseSpeed = 195 + dashRank * 20;
      const curSpeed = player.dashTimer > 0 ? baseSpeed * 2.1 : baseSpeed;

      if (mag > 0.1) {
        const nx = player.x + (vx / Math.max(1, mag)) * curSpeed * dt;
        const ny = player.y + (vy / Math.max(1, mag)) * curSpeed * dt;
        const res = resolvePos(nx, ny, 16);
        player.x = res.x;
        player.y = res.y;
        player.moving = true;
        if (Math.abs(vx) > Math.abs(vy)) {
          player.dir = vx > 0 ? 'right' : 'left';
        } else {
          player.dir = vy > 0 ? 'down' : 'up';
        }
      } else {
        player.moving = false;
      }

      if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);
      if (player.slashTimer > 0) player.slashTimer = Math.max(0, player.slashTimer - dt);
      if (player.slashCooldown > 0) player.slashCooldown = Math.max(0, player.slashCooldown - dt);
      if (player.dashTimer > 0) player.dashTimer = Math.max(0, player.dashTimer - dt);
      if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);

      // Collect touchable hearts & chests
      for (const node of lootNodes) {
        if (node.collected) continue;
        const dist = Math.hypot(node.x - player.x, node.y - player.y);
        if (dist < 28 && (node.kind === 'heart' || node.kind === 'chest')) {
          node.collected = true;
          if (node.kind === 'heart') {
            player.hp = Math.min(player.maxHp, player.hp + 2);
            soundManager.playPop(820, 0.09);
            floats.push({ x: player.x, y: player.y - 28, text: '❤️ +1', color: '#FF7B9C', life: 0.7 });
          } else {
            soundManager.playChime();
            floats.push({ x: node.x, y: node.y - 22, text: '🧰 お宝GET!', color: '#FFD466', life: 1.0 });
          }
          syncHud();
        }
      }

      // Update Enemies (Zelda-style chase when near + wander)
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        const speed = e.kind === 'bat' ? 92 : e.kind === 'dragon' ? 78 : e.kind === 'goblin' ? 76 : 56;

        if (distToPlayer < 240) {
          const d = distToPlayer || 1;
          e.vx = ((player.x - e.x) / d) * speed;
          e.vy = ((player.y - e.y) / d) * speed;
        } else {
          e.aiTimer -= dt;
          if (e.aiTimer <= 0) {
            e.aiTimer = 1.2 + Math.random() * 1.5;
            const a = Math.random() * Math.PI * 2;
            e.vx = Math.cos(a) * speed * 0.55;
            e.vy = Math.sin(a) * speed * 0.55;
          }
        }

        const nx = e.x + (e.vx + e.knockVx) * dt;
        const ny = e.y + (e.vy + e.knockVy) * dt;
        const res = resolvePos(nx, ny, e.radius);
        e.x = res.x;
        e.y = res.y;
        e.knockVx *= Math.pow(0.05, dt);
        e.knockVy *= Math.pow(0.05, dt);

        // Player contact damage
        if (player.invuln <= 0 && distToPlayer < e.radius + 15) {
          player.hp = Math.max(0, player.hp - (e.kind === 'dragon' ? 2 : 1));
          player.invuln = 1.0;
          soundManager.playPop(200, 0.14);
          floats.push({ x: player.x, y: player.y - 34, text: 'いてっ！', color: '#FF6B6B', life: 0.7 });
          syncHud();
          if (player.hp <= 0) {
            floats.push({ x: player.x, y: player.y - 46, text: '町へ帰還するよ！', color: '#FFF', life: 1.0 });
            setTimeout(() => finishDungeon(computeScore()), 650);
          }
        }
      }

      // Floating texts
      for (const f of floats) {
        f.y -= 32 * dt;
        f.life -= dt;
      }
      while (floats.length > 0 && floats[0].life <= 0) floats.shift();

      // Render Dungeon
      const canvas = canvasRef.current;
      if (canvas) {
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const camX = Math.max(0, Math.min(DUNGEON_W - canvas.width, player.x - canvas.width / 2));
          const camY = Math.max(0, Math.min(DUNGEON_H - canvas.height, player.y - canvas.height / 2));
          const timeSec = now / 1000;

          ctx.fillStyle = theme.wall;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.save();
          ctx.translate(-Math.round(camX), -Math.round(camY));

          // Floor
          ctx.fillStyle = theme.floor;
          ctx.fillRect(WALL_T, WALL_T, DUNGEON_W - WALL_T * 2, DUNGEON_H - WALL_T * 2);

          // Tiled pattern
          ctx.fillStyle = theme.tile;
          for (let y = WALL_T; y < DUNGEON_H - WALL_T; y += 48) {
            for (let x = WALL_T; x < DUNGEON_W - WALL_T; x += 48) {
              if (((x + y) / 48) % 2 === 0) {
                ctx.fillRect(x, y, 48, 48);
              }
            }
          }

          // Exit portal circle
          ctx.fillStyle = 'rgba(130, 210, 255, 0.25)';
          ctx.strokeStyle = '#90E0EF';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(exitPortal.x, exitPortal.y, exitPortal.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.font = '700 12px "M PLUS Rounded 1c", sans-serif';
          ctx.fillStyle = '#E0FBFC';
          ctx.textAlign = 'center';
          ctx.fillText('🚪 入口', exitPortal.x, exitPortal.y + 4);

          // Obstacles
          for (const ob of obstacles) {
            ctx.fillStyle = ob.kind === 'wall' ? theme.wall : theme.pillar;
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 8);
            ctx.fill();
            ctx.stroke();
          }

          // Loot nodes
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (const node of lootNodes) {
            if (node.collected) continue;
            const bob = Math.sin(timeSec * 4 + node.id) * 3;
            ctx.font = node.kind === 'chest' ? '28px sans-serif' : '24px sans-serif';
            const icon =
              node.kind === 'chest' ? '🧰' : node.kind === 'ore' ? '🪨' : node.kind === 'herb' ? '🌿' : '❤️';
            ctx.fillText(icon, node.x, node.y + bob);
          }

          // Enemies
          for (const e of enemies) {
            if (e.hp <= 0) continue;
            const hop = Math.abs(Math.sin(timeSec * 6 + e.id)) * -4;
            ctx.save();
            ctx.translate(e.x, e.y + hop);
            if (e.hitFlash > 0) ctx.globalAlpha = 0.55;
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.beginPath();
            ctx.ellipse(0, 12, e.radius * 0.85, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = e.kind === 'dragon' ? '38px sans-serif' : '28px sans-serif';
            const icon = e.kind === 'dragon' ? '🐉' : e.kind === 'goblin' ? '👺' : e.kind === 'bat' ? '🦇' : '🟢';
            ctx.fillText(icon, 0, 0);

            // Enemy HP bar
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-16, -e.radius - 10, 32, 5);
            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(-16, -e.radius - 10, 32 * (e.hp / e.maxHp), 5);
            ctx.restore();
          }

          // Draw Player Chibi Character!
          const blinkHide = player.invuln > 0 && Math.floor(timeSec * 16) % 2 === 0;
          if (!blinkHide) {
            drawChibiCharacter(ctx, {
              x: player.x,
              y: player.y,
              appearance: self.appearance,
              dir: player.dir,
              moving: player.moving,
              timeSec,
              name: self.name,
              jobId: self.jobId,
            });

            // Animated Swinging Sword (Zelda-style!)
            if (player.slashTimer > 0) {
              const duration = 0.2;
              const progress = Math.max(0, Math.min(1, 1 - player.slashTimer / duration));
              const startAng = player.slashAngle - slashArc / 2;
              const curAng = startAng + progress * slashArc;
              const trailStart = Math.max(startAng, curAng - slashArc * 0.65);
              const bladeLen = slashReach * 0.92;

              ctx.save();
              ctx.translate(player.x, player.y - 14);

              // Crescent motion trail behind the swinging blade
              ctx.strokeStyle = `rgba(255, 245, 170, ${(0.75 * (1 - progress * 0.5)).toFixed(2)})`;
              ctx.lineWidth = 12;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.arc(0, 0, bladeLen * 0.78, trailStart, curAng);
              ctx.stroke();

              ctx.strokeStyle = `rgba(255, 255, 255, ${(0.9 * (1 - progress * 0.4)).toFixed(2)})`;
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(0, 0, bladeLen * 0.92, trailStart, curAng);
              ctx.stroke();

              // Actual Sword Sprite rotating along the swing arc
              ctx.rotate(curAng);
              // Leather hilt
              ctx.fillStyle = '#6E472B';
              ctx.strokeStyle = '#3B281B';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(6, -3, 11, 6, 2);
              ctx.fill();
              ctx.stroke();

              // Golden crossguard
              ctx.fillStyle = '#F2C94C';
              ctx.beginPath();
              ctx.roundRect(15, -9, 5, 18, 2);
              ctx.fill();
              ctx.stroke();

              // Gleaming steel blade
              const bladeGrad = ctx.createLinearGradient(20, -5, bladeLen, 5);
              bladeGrad.addColorStop(0, '#E8F1F8');
              bladeGrad.addColorStop(0.5, '#FFFFFF');
              bladeGrad.addColorStop(1, '#B8D4E8');
              ctx.fillStyle = bladeGrad;
              ctx.beginPath();
              ctx.moveTo(20, -5);
              ctx.lineTo(bladeLen - 8, -4.5);
              ctx.lineTo(bladeLen + 4, 0);
              ctx.lineTo(bladeLen - 8, 4.5);
              ctx.lineTo(20, 5);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              // Blade center shine line
              ctx.strokeStyle = 'rgba(255,255,255,0.85)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(22, 0);
              ctx.lineTo(bladeLen - 6, 0);
              ctx.stroke();

              ctx.restore();
            } else {
              // Idle / walking sword held at the adventurer's side
              const sideX = player.dir === 'left' ? -14 : 14;
              const idleTilt = player.dir === 'left' ? -2.35 : -0.78;
              ctx.save();
              ctx.translate(player.x + sideX, player.y - 12);
              ctx.rotate(idleTilt + (player.moving ? Math.sin(timeSec * 12) * 0.12 : 0));
              ctx.strokeStyle = '#3B281B';
              ctx.lineWidth = 1.8;
              ctx.fillStyle = '#6E472B';
              ctx.beginPath();
              ctx.roundRect(-2, -2.5, 8, 5, 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#F2C94C';
              ctx.beginPath();
              ctx.roundRect(5, -6, 3.5, 12, 1.5);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#E6F0F7';
              ctx.beginPath();
              ctx.moveTo(8.5, -3.5);
              ctx.lineTo(24, -3);
              ctx.lineTo(29, 0);
              ctx.lineTo(24, 3);
              ctx.lineTo(8.5, 3.5);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
          }

          // Floating damage & loot texts
          for (const f of floats) {
            ctx.font = '800 15px "M PLUS Rounded 1c", sans-serif';
            ctx.fillStyle = '#2B1F16';
            ctx.fillText(f.text, f.x + 1, f.y + 1);
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y);
          }

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      soundManager.playBgm('town');
    };
  }, [attackTriggerRef, dashRank, recipe.tier, rootRank, self.appearance, self.jobId, self.name, slashRank, treasureRank]);

  const fullHearts = Math.floor(hudState.hp / 2);
  const halfHeart = hudState.hp % 2 === 1;
  const emptyHearts = Math.floor((hudState.maxHp - hudState.hp) / 2);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: '#1B241E' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={() => {
          attackTriggerRef.current = true;
        }}
        style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }}
      />

      {/* Top Left: Zelda Hearts & Dungeon Progress */}
      <div
        className="storybook-card"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 15 }}>
          🌲 {recipe.name}（{'★'.repeat(recipe.tier)}）
        </div>
        <div style={{ fontSize: 18, letterSpacing: 2 }}>
          {'❤️'.repeat(fullHearts)}
          {halfHeart ? '💔' : ''}
          {'🤍'.repeat(emptyHearts)}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', gap: 10 }}>
          <span>👾 討伐 {hudState.defeated}/{hudState.totalEnemies}</span>
          <span>🧰 宝箱 {hudState.chestsOpened}/{hudState.totalChests}</span>
          <span>🪨 採取 {hudState.gathered}</span>
        </div>
      </div>

      {/* Top Right: Return to Town button */}
      <button
        className="btn-secondary"
        style={{ position: 'absolute', top: 14, right: 14, fontWeight: 800 }}
        onClick={() => {
          const score = Math.min(
            100,
            Math.round(
              (hudState.defeated / Math.max(1, hudState.totalEnemies)) * 65 +
                (hudState.chestsOpened / Math.max(1, hudState.totalChests)) * 25 +
                hudState.gathered * 4
            )
          );
          finishDungeon(score);
        }}
      >
        🚪 報酬をもらって町へ戻る
      </button>

      {/* Bottom Left: Touch Joystick */}
      <DungeonJoystick
        onMove={(dx, dy) => {
          joystickRef.current.dx = dx;
          joystickRef.current.dy = dy;
        }}
      />

      {/* Bottom Right: Zelda Action Buttons (Sword Slash & Dash) */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', gap: 12 }}>
        <button
          className="btn-secondary"
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            fontSize: 13,
            fontWeight: 800,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            dashTriggerRef.current = true;
          }}
        >
          <span style={{ fontSize: 22 }}>💨</span>
          <span>回避</span>
        </button>
        <button
          className="btn-primary"
          style={{
            width: 82,
            height: 82,
            borderRadius: '50%',
            fontSize: 14,
            fontWeight: 800,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            attackTriggerRef.current = true;
          }}
        >
          <span style={{ fontSize: 26 }}>⚔️</span>
          <span>斬る!</span>
        </button>
      </div>
    </div>
  );
}

function DungeonJoystick({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const maxR = 36;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 4 ? Math.cos(angle) * clamped : 0;
    const ky = dist > 4 ? Math.sin(angle) * clamped : 0;
    setKnob({ x: kx, y: ky });
    onMove(kx / maxR, ky / maxR);
  };

  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setActive(true);
        handlePointer(e);
      }}
      onPointerMove={(e) => {
        if (!active) return;
        handlePointer(e);
      }}
      onPointerUp={() => {
        setActive(false);
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
      }}
      onPointerCancel={() => {
        setActive(false);
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
      }}
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        width: 104,
        height: 104,
        borderRadius: '50%',
        background: 'rgba(255, 252, 244, 0.35)',
        border: '3px solid rgba(255, 252, 244, 0.7)',
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(232, 116, 97, 0.9)',
          border: '3px solid #FFFDF7',
          transform: `translate(${knob.x}px, ${knob.y}px)`,
        }}
      />
    </div>
  );
}
