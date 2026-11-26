import {
  type BuildingDef,
  type Season,
  type WorldClock,
  BUILDINGS,
  FOUNTAIN_CENTER,
  MAP_COLS,
  MAP_ROWS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@familia-town/shared';

const SEASON_GROUND: Record<Season, { base: string; patch: string; tree: string; treeLight: string }> = {
  spring: { base: '#A7DC8A', patch: '#9AD27D', tree: '#6BB86B', treeLight: '#F9B8C9' },
  summer: { base: '#8ED16F', patch: '#80C460', tree: '#4E9E52', treeLight: '#7AD16C' },
  autumn: { base: '#D6C67C', patch: '#C8B56A', tree: '#C96D3B', treeLight: '#E59F47' },
  winter: { base: '#E4EFF5', patch: '#D5E5EE', tree: '#7BA0A8', treeLight: '#FFFFFF' },
};

const BORDER_TREES: { x: number; y: number; scale: number; blossom: boolean }[] = [];
for (let c = 0; c < MAP_COLS; c += 2) {
  if (c < 14 || c > 21) {
    BORDER_TREES.push({ x: c * TILE_SIZE + 24, y: 24, scale: 1, blossom: c % 4 === 0 });
  }
  BORDER_TREES.push({ x: c * TILE_SIZE + 24, y: (MAP_ROWS - 1) * TILE_SIZE + 16, scale: 1, blossom: c % 6 === 0 });
}
for (let r = 2; r < MAP_ROWS - 1; r += 2) {
  BORDER_TREES.push({ x: 24, y: r * TILE_SIZE + 24, scale: 1, blossom: r % 4 === 0 });
  BORDER_TREES.push({ x: (MAP_COLS - 1) * TILE_SIZE + 24, y: r * TILE_SIZE + 24, scale: 1, blossom: r % 4 === 0 });
}

export function drawTownBackground(
  ctx: CanvasRenderingContext2D,
  clock: WorldClock,
  timeSec: number,
  ownedPlotIndex?: number
): void {
  const palette = SEASON_GROUND[clock.season];

  // 1. Meadow base
  ctx.fillStyle = palette.base;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Subtle checkered meadow grass tiles
  ctx.fillStyle = palette.patch;
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // 2. Cobblestone roads & central plaza
  drawPaths(ctx);

  // 3. Cute decorative flowers scattered on grass
  drawFlowers(ctx, clock.season);

  // 4. Farm & Pasture ground (non-solid building)
  const farm = BUILDINGS.find((b) => b.kind === 'pasture');
  if (farm) {
    drawFarmPasture(ctx, farm, timeSec);
  }

  // 5. Central Plaza Fountain
  drawFountain(ctx, timeSec);

  // 6. Solid Buildings (shops, guild, hall, houses, dungeon gate)
  const isNight = clock.minuteOfDay < 360 || clock.minuteOfDay >= 1110;
  for (const b of BUILDINGS) {
    if (b.kind === 'pasture') continue;
    drawBuilding(ctx, b, isNight, b.plotIndex === ownedPlotIndex);
  }

  // 7. Border trees
  for (const t of BORDER_TREES) {
    drawTree(ctx, t.x, t.y, palette.tree, t.blossom ? palette.treeLight : palette.tree, timeSec);
  }
}

export function drawDayNightOverlay(
  ctx: CanvasRenderingContext2D,
  clock: WorldClock,
  viewW: number,
  viewH: number,
  timeSec: number
): void {
  const m = clock.minuteOfDay;
  let color = '';
  if (m >= 1020 && m < 1140) {
    // Warm sunset (17:00 - 19:00)
    const t = (m - 1020) / 120;
    color = `rgba(235, 130, 70, ${(0.22 * Math.sin(t * Math.PI)).toFixed(3)})`;
  } else if (m >= 1140 || m < 330) {
    // Cozy starry twilight/night (19:00 - 05:30)
    color = 'rgba(32, 46, 88, 0.30)';
  } else if (m >= 330 && m < 420) {
    // Dawn (05:30 - 07:00)
    const t = 1 - (m - 330) / 90;
    color = `rgba(90, 95, 155, ${(0.22 * t).toFixed(3)})`;
  }

  if (color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  // Seasonal gentle particles (petals in spring, leaves in autumn, snow in winter)
  if (clock.season === 'spring' || clock.season === 'autumn' || clock.season === 'winter') {
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const px = ((i * 197 + timeSec * (24 + (i % 5) * 6)) % (viewW + 40)) - 20;
      const py = ((i * 113 + timeSec * (28 + (i % 4) * 5)) % (viewH + 40)) - 20;
      if (clock.season === 'spring') {
        ctx.fillStyle = 'rgba(255, 192, 210, 0.85)';
        ctx.beginPath();
        ctx.ellipse(px, py, 4, 2.5, timeSec + i, 0, Math.PI * 2);
        ctx.fill();
      } else if (clock.season === 'autumn') {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(225, 120, 55, 0.85)' : 'rgba(238, 175, 65, 0.85)';
        ctx.beginPath();
        ctx.ellipse(px, py, 4.5, 2.8, timeSec + i, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawPaths(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#EFE2C6';
  ctx.strokeStyle = '#D7C39E';
  ctx.lineWidth = 3;

  // Main North-South Avenue
  ctx.beginPath();
  ctx.roundRect(16.5 * TILE_SIZE, 4 * TILE_SIZE, 3 * TILE_SIZE, 20.5 * TILE_SIZE, 16);
  ctx.fill();
  ctx.stroke();

  // Main East-West Avenue (Shops)
  ctx.beginPath();
  ctx.roundRect(4.5 * TILE_SIZE, 14.2 * TILE_SIZE, 26.5 * TILE_SIZE, 2.2 * TILE_SIZE, 16);
  ctx.fill();
  ctx.stroke();

  // Upper East-West Avenue (Guild <-> Town Hall)
  ctx.beginPath();
  ctx.roundRect(6.5 * TILE_SIZE, 7.2 * TILE_SIZE, 22.5 * TILE_SIZE, 1.8 * TILE_SIZE, 14);
  ctx.fill();
  ctx.stroke();

  // Lower Residential Avenue
  ctx.beginPath();
  ctx.roundRect(4.5 * TILE_SIZE, 24 * TILE_SIZE, 26 * TILE_SIZE, 1.4 * TILE_SIZE, 12);
  ctx.fill();
  ctx.stroke();

  // Central Plaza Circle
  ctx.fillStyle = '#F6ECDA';
  ctx.beginPath();
  ctx.arc(FOUNTAIN_CENTER.x, FOUNTAIN_CENTER.y, 155, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawFlowers(ctx: CanvasRenderingContext2D, season: Season): void {
  if (season === 'winter') return;
  const flowerColors = season === 'autumn' ? ['#F4A261', '#E76F51', '#E9C46A'] : ['#FFB3C6', '#FFF3B0', '#A2D2FF', '#FFFFFF'];
  for (let i = 0; i < 42; i++) {
    const fx = ((i * 293 + 90) % (WORLD_WIDTH - 160)) + 80;
    const fy = ((i * 179 + 90) % (WORLD_HEIGHT - 160)) + 80;
    ctx.fillStyle = flowerColors[i % flowerColors.length];
    ctx.beginPath();
    ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F7C948';
    ctx.beginPath();
    ctx.arc(fx, fy, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFountain(ctx: CanvasRenderingContext2D, timeSec: number): void {
  const { x, y, radius } = FOUNTAIN_CENTER;

  // Stone basin
  ctx.fillStyle = '#DDD5C7';
  ctx.strokeStyle = '#7A6C5D';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sparkling water
  ctx.fillStyle = '#74C7E5';
  ctx.beginPath();
  ctx.arc(x, y, radius - 9, 0, Math.PI * 2);
  ctx.fill();

  // Animated water rings
  const ripple = (timeSec * 18) % (radius - 16);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 10 + ripple, 0, Math.PI * 2);
  ctx.stroke();

  // Center pedestal & splash
  ctx.fillStyle = '#EDE6D8';
  ctx.strokeStyle = '#7A6C5D';
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C8F1FF';
  const splashR = 5 + Math.sin(timeSec * 6) * 2;
  ctx.beginPath();
  ctx.arc(x, y - 4, splashR, 0, Math.PI * 2);
  ctx.fill();
}

function drawFarmPasture(ctx: CanvasRenderingContext2D, b: BuildingDef, timeSec: number): void {
  const px = b.x * TILE_SIZE;
  const py = b.y * TILE_SIZE;
  const pw = b.w * TILE_SIZE;
  const ph = b.h * TILE_SIZE;

  // Wooden fence outline
  ctx.fillStyle = 'rgba(214, 178, 122, 0.28)';
  ctx.strokeStyle = '#9C6B3B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 12);
  ctx.fill();
  ctx.stroke();

  // Left half: Tilled vegetable plots
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const cx = px + 18 + col * 52;
      const cy = py + 24 + row * 56;
      ctx.fillStyle = '#9B6B43';
      ctx.beginPath();
      ctx.roundRect(cx, cy, 42, 36, 6);
      ctx.fill();

      // Cute sprouting crops
      ctx.fillStyle = '#5BB85D';
      const sway = Math.sin(timeSec * 2 + col) * 1.5;
      ctx.beginPath();
      ctx.arc(cx + 14 + sway, cy + 16, 6, 0, Math.PI * 2);
      ctx.arc(cx + 28 + sway, cy + 16, 6, 0, Math.PI * 2);
      ctx.fill();
      if ((row + col) % 2 === 0) {
        ctx.fillStyle = '#F26B5B'; // tiny tomatoes/carrots
        ctx.beginPath();
        ctx.arc(cx + 21, cy + 22, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Right half: Cute animated cow & pig!
  const cowX = px + pw * 0.68 + Math.sin(timeSec * 0.7) * 28;
  const cowY = py + ph * 0.45;
  drawMiniAnimal(ctx, cowX, cowY, 'cow', timeSec);

  const pigX = px + pw * 0.84 + Math.cos(timeSec * 0.9) * 22;
  const pigY = py + ph * 0.68;
  drawMiniAnimal(ctx, pigX, pigY, 'pig', timeSec);

  // Farm label
  ctx.font = '800 13px "M PLUS Rounded 1c", sans-serif';
  ctx.fillStyle = '#4A3525';
  ctx.textAlign = 'center';
  ctx.fillText(`${b.emoji} ${b.name}`, px + pw / 2, py - 8);
}

function drawMiniAnimal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: 'cow' | 'pig',
  timeSec: number
): void {
  const hop = Math.abs(Math.sin(timeSec * 3.5)) * -2;
  ctx.save();
  ctx.translate(x, y + hop);
  ctx.strokeStyle = '#4A3525';
  ctx.lineWidth = 1.8;

  if (kind === 'cow') {
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Black cow spot
    ctx.fillStyle = '#3B3430';
    ctx.beginPath();
    ctx.ellipse(-3, -2, 5, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Cute head
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.arc(11, -3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F7B2B7';
    ctx.beginPath();
    ctx.ellipse(14, -1, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#F9B8C4';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(10, -2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E88DA0';
    ctx.beginPath();
    ctx.ellipse(13, -1, 3.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: BuildingDef,
  isNight: boolean,
  isMyHouse: boolean
): void {
  const px = b.x * TILE_SIZE;
  const py = b.y * TILE_SIZE;
  const pw = b.w * TILE_SIZE;
  const ph = b.h * TILE_SIZE;

  // Building ground shadow
  ctx.fillStyle = 'rgba(74, 53, 37, 0.18)';
  ctx.beginPath();
  ctx.roundRect(px + 6, py + 12, pw, ph, 14);
  ctx.fill();

  if (b.kind === 'dungeon') {
    // Stone archway into the forest dungeon
    ctx.fillStyle = '#6E7470';
    ctx.strokeStyle = '#3E4240';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px + 12, py + 12, pw - 24, ph - 12, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#24332A';
    ctx.beginPath();
    ctx.arc(px + pw / 2, py + ph, 38, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Wall
    ctx.fillStyle = b.wallColor;
    ctx.strokeStyle = '#5E422B';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.roundRect(px + 6, py + ph * 0.42, pw - 12, ph * 0.58, 10);
    ctx.fill();
    ctx.stroke();

    // Pitched Storybook Roof
    ctx.fillStyle = b.roofColor;
    ctx.beginPath();
    ctx.moveTo(px - 4, py + ph * 0.5);
    ctx.lineTo(px + pw / 2, py + 2);
    ctx.lineTo(px + pw + 4, py + ph * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Door
    const doorW = 28;
    const doorH = 36;
    ctx.fillStyle = '#8C5A34';
    ctx.beginPath();
    ctx.roundRect(px + pw / 2 - doorW / 2, py + ph - doorH, doorW, doorH, [12, 12, 0, 0]);
    ctx.fill();
    ctx.stroke();

    // Warm windows
    ctx.fillStyle = isNight ? '#FFE57F' : '#BCE3F5';
    ctx.beginPath();
    ctx.roundRect(px + 18, py + ph * 0.58, 26, 22, 5);
    ctx.roundRect(px + pw - 44, py + ph * 0.58, 26, 22, 5);
    ctx.fill();
    ctx.stroke();
  }

  // Signboard pill
  ctx.save();
  ctx.font = '800 13px "M PLUS Rounded 1c", sans-serif';
  const label = isMyHouse ? `⭐ あなたの家` : `${b.emoji} ${b.name}`;
  const tw = ctx.measureText(label).width;
  const sx = px + pw / 2;
  const sy = py + ph + 14;

  ctx.fillStyle = isMyHouse ? '#FFF3C4' : 'rgba(255, 252, 244, 0.94)';
  ctx.strokeStyle = isMyHouse ? '#D99B26' : '#B88B5A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(sx - tw / 2 - 10, sy - 11, tw + 20, 22, 11);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4A3525';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, sx, sy + 0.5);
  ctx.restore();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  foliage: string,
  highlight: string,
  timeSec: number
): void {
  const sway = Math.sin(timeSec * 1.4 + x * 0.02) * 2;
  ctx.save();
  ctx.translate(x, y);

  // Trunk
  ctx.fillStyle = '#8B5E3C';
  ctx.strokeStyle = '#4A3525';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-6, -2, 12, 16, 4);
  ctx.fill();
  ctx.stroke();

  // Fluffy canopy
  ctx.fillStyle = foliage;
  ctx.beginPath();
  ctx.arc(sway, -16, 20, 0, Math.PI * 2);
  ctx.arc(-11 + sway, -10, 14, 0, Math.PI * 2);
  ctx.arc(11 + sway, -10, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.arc(-4 + sway, -21, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
