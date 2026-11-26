import {
  type Appearance,
  type Direction,
  type JobId,
  type StampId,
  JOBS,
  STAMPS,
} from '@familia-town/shared';

const OUTLINE = '#4A3525';

export interface ChibiDrawOptions {
  x: number;
  y: number;
  scale?: number;
  appearance: Appearance;
  dir?: Direction;
  moving?: boolean;
  timeSec: number;
  name?: string;
  jobId?: JobId | null;
  isNpc?: boolean;
  canRomance?: boolean;
  bubbleText?: string;
  bubbleStamp?: StampId;
}

export function drawChibiCharacter(ctx: CanvasRenderingContext2D, opts: ChibiDrawOptions): void {
  const {
    x,
    y,
    scale = 1,
    appearance: app,
    dir = 'down',
    moving = false,
    timeSec,
    name,
    jobId,
    isNpc = false,
    canRomance = false,
    bubbleText,
    bubbleStamp,
  } = opts;

  const walkCycle = moving ? Math.sin(timeSec * 12) : 0;
  const bobY = moving ? Math.abs(Math.sin(timeSec * 12)) * -3.5 : Math.sin(timeSec * 2.4 + x * 0.05) * -1.2;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Soft ground shadow
  ctx.fillStyle = 'rgba(74, 53, 37, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bobY);

  // --- Back Hair (behind body/head) ---
  drawBackHair(ctx, app, dir);

  // --- Legs ---
  const leftLegY = moving ? walkCycle * 3 : 0;
  const rightLegY = moving ? -walkCycle * 3 : 0;
  ctx.fillStyle = '#5B4636';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(-8, -6 + leftLegY, 6, 9, 3);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(2, -6 + rightLegY, 6, 9, 3);
  ctx.fill();
  ctx.stroke();

  // --- Body / Outfit ---
  drawOutfit(ctx, app, walkCycle);

  // --- Head ---
  ctx.fillStyle = app.skinColor;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, -28, 16.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ears
  ctx.beginPath();
  ctx.arc(-16, -27, 3.2, 0, Math.PI * 2);
  ctx.arc(16, -27, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // --- Face (hidden when facing up) ---
  if (dir !== 'up') {
    const faceShiftX = dir === 'left' ? -3 : dir === 'right' ? 3 : 0;
    drawFace(ctx, app, faceShiftX, timeSec + x * 0.01);
  }

  // --- Front Hair / Bangs ---
  drawFrontHair(ctx, app, dir);

  // --- Accessories ---
  drawAccessory(ctx, app);

  ctx.restore();

  // --- Nameplate & Job Badge ---
  if (name) {
    ctx.save();
    ctx.translate(x, y + 18 * scale);
    ctx.font = `700 ${Math.round(12 * Math.max(0.9, scale))}px "M PLUS Rounded 1c", sans-serif`;
    const jobEmoji = jobId ? JOBS[jobId].emoji : isNpc ? '💬' : '';
    const heart = canRomance ? ' ♡' : '';
    const label = `${jobEmoji ? jobEmoji + ' ' : ''}${name}${heart}`;
    const textW = ctx.measureText(label).width;

    ctx.fillStyle = isNpc ? 'rgba(255, 248, 232, 0.92)' : 'rgba(255, 255, 255, 0.92)';
    ctx.strokeStyle = isNpc ? '#D6A667' : '#6A9ED4';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-textW / 2 - 8, -9, textW + 16, 20, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = OUTLINE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1.5);
    ctx.restore();
  }

  // --- Speech / Stamp Bubble ---
  if (bubbleStamp || bubbleText) {
    drawSpeechBubble(ctx, x, y - 56 * scale, bubbleText, bubbleStamp);
  }
}

function drawOutfit(ctx: CanvasRenderingContext2D, app: Appearance, walkCycle: number): void {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;

  // Arms
  ctx.fillStyle = app.skinColor;
  ctx.save();
  ctx.translate(-12, -16);
  ctx.rotate(walkCycle * 0.35);
  ctx.beginPath();
  ctx.roundRect(-3, 0, 6, 11, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(12, -16);
  ctx.rotate(-walkCycle * 0.35);
  ctx.beginPath();
  ctx.roundRect(-3, 0, 6, 11, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Main Torso
  ctx.fillStyle = app.outfitColor;
  ctx.beginPath();
  if (app.outfitId === 2) {
    // Dress (flared skirt)
    ctx.moveTo(-10, -18);
    ctx.lineTo(10, -18);
    ctx.lineTo(14, -2);
    ctx.lineTo(-14, -2);
    ctx.closePath();
  } else {
    ctx.roundRect(-11, -18, 22, 16, 6);
  }
  ctx.fill();
  ctx.stroke();

  // Outfit accent details
  if (app.outfitId === 1) {
    // Overalls straps & pocket
    ctx.fillStyle = '#FFF7EA';
    ctx.fillRect(-7, -17, 3, 6);
    ctx.fillRect(4, -17, 3, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(-5, -10, 10, 5);
  } else if (app.outfitId === 3) {
    // Adventurer belt
    ctx.fillStyle = '#6E472B';
    ctx.fillRect(-11, -8, 22, 4);
    ctx.fillStyle = '#F2C94C';
    ctx.fillRect(-3, -8.5, 6, 5);
  } else if (app.outfitId === 4) {
    // Cafe apron
    ctx.fillStyle = '#FFFDF7';
    ctx.beginPath();
    ctx.roundRect(-7, -15, 14, 12, 3);
    ctx.fill();
    ctx.stroke();
  } else if (app.outfitId === 5) {
    // Cape collar
    ctx.fillStyle = '#FFF3D6';
    ctx.beginPath();
    ctx.arc(0, -16, 7, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
  } else {
    // Tunic white collar
    ctx.fillStyle = '#FFFDF7';
    ctx.beginPath();
    ctx.moveTo(-5, -18);
    ctx.lineTo(0, -13);
    ctx.lineTo(5, -18);
    ctx.closePath();
    ctx.fill();
  }
}

function drawFace(ctx: CanvasRenderingContext2D, app: Appearance, shiftX: number, timeSec: number): void {
  // Periodic cute blink
  const blinkPhase = timeSec % 4.2;
  const isBlinking = blinkPhase > 4.05;

  // Cheeks
  if (app.cheekStyle === 0) {
    ctx.fillStyle = 'rgba(244, 138, 158, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-9 + shiftX, -23, 3.6, 2.2, 0, 0, Math.PI * 2);
    ctx.ellipse(9 + shiftX, -23, 3.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (app.cheekStyle === 1) {
    ctx.fillStyle = 'rgba(245, 165, 118, 0.42)';
    ctx.beginPath();
    ctx.ellipse(-9 + shiftX, -23, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(9 + shiftX, -23, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cute freckles
    ctx.fillStyle = 'rgba(166, 98, 60, 0.55)';
    for (const dx of [-10, -8, -9, 8, 10, 9]) {
      ctx.beginPath();
      ctx.arc(dx + shiftX, -23 + (Math.abs(dx) === 9 ? 1.5 : 0), 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Eyes
  for (const side of [-1, 1]) {
    const ex = side * 6.2 + shiftX;
    const ey = -27.5;

    if (isBlinking) {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      continue;
    }

    ctx.fillStyle = app.eyeColor;
    ctx.beginPath();
    if (app.eyeShape === 0 || app.eyeShape === 4) {
      ctx.ellipse(ex, ey, 3.3, 3.8, 0, 0, Math.PI * 2);
    } else if (app.eyeShape === 1) {
      ctx.ellipse(ex, ey, 3.4, 2.8, 0, 0, Math.PI * 2);
    } else if (app.eyeShape === 2) {
      ctx.ellipse(ex, ey + 0.5, 3.2, 3.2, side * 0.15, 0, Math.PI * 2);
    } else {
      ctx.ellipse(ex, ey, 3.0, 3.5, -side * 0.12, 0, Math.PI * 2);
    }
    ctx.fill();

    // Eye sparkle highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex - 1, ey - 1.2, 1.3, 0, Math.PI * 2);
    ctx.fill();
    if (app.eyeShape === 4) {
      ctx.beginPath();
      ctx.arc(ex + 1.1, ey + 1.1, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cute smile
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(shiftX, -22, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawBackHair(ctx: CanvasRenderingContext2D, app: Appearance, dir: Direction): void {
  ctx.fillStyle = app.hairColor;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;

  if (app.hairStyle === 1) {
    // Bob back
    ctx.beginPath();
    ctx.roundRect(-18, -32, 36, 21, 10);
    ctx.fill();
    ctx.stroke();
  } else if (app.hairStyle === 2) {
    // Twin tails
    ctx.beginPath();
    ctx.ellipse(-19, -22, 6, 12, 0.25, 0, Math.PI * 2);
    ctx.ellipse(19, -22, 6, 12, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (app.hairStyle === 4) {
    // Long flowing hair
    ctx.beginPath();
    ctx.roundRect(-19, -32, 38, 29, 11);
    ctx.fill();
    ctx.stroke();
  } else if (app.hairStyle === 5) {
    // Ponytail
    ctx.beginPath();
    ctx.ellipse(dir === 'left' ? 14 : dir === 'right' ? -14 : 11, -30, 6.5, 11, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (app.hairStyle === 6) {
    // Twin buns
    ctx.beginPath();
    ctx.arc(-15, -41, 6.5, 0, Math.PI * 2);
    ctx.arc(15, -41, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawFrontHair(ctx: CanvasRenderingContext2D, app: Appearance, dir: Direction): void {
  ctx.fillStyle = app.hairColor;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;

  if (dir === 'up') {
    // Full back of head covered by hair
    ctx.beginPath();
    ctx.arc(0, -29, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  // Top hair dome + bangs
  ctx.beginPath();
  ctx.arc(0, -30, 17.2, Math.PI * 0.95, Math.PI * 2.05);

  if (app.hairStyle === 3) {
    // Spiky energetic hair
    ctx.lineTo(14, -33);
    ctx.lineTo(8, -28);
    ctx.lineTo(4, -35);
    ctx.lineTo(-1, -27);
    ctx.lineTo(-6, -34);
    ctx.lineTo(-12, -29);
    ctx.closePath();
  } else if (app.hairStyle === 7) {
    // Round mushroom cut
    ctx.quadraticCurveTo(0, -28, -17, -31);
    ctx.closePath();
  } else {
    // Soft storybook bangs
    ctx.quadraticCurveTo(9, -31, 4, -35);
    ctx.quadraticCurveTo(0, -29, -5, -35);
    ctx.quadraticCurveTo(-11, -30, -17, -31);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
}

function drawAccessory(ctx: CanvasRenderingContext2D, app: Appearance): void {
  if (app.accessoryId === 0) return;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;

  if (app.accessoryId === 1) {
    // Red Ribbon
    ctx.fillStyle = '#E85D75';
    ctx.beginPath();
    ctx.ellipse(-6, -44, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.ellipse(6, -44, 6, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -44, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (app.accessoryId === 2) {
    // Straw Hat
    ctx.fillStyle = '#F2CF7E';
    ctx.beginPath();
    ctx.ellipse(0, -41, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -42, 12, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#D9534F';
    ctx.fillRect(-11, -44, 22, 3);
  } else if (app.accessoryId === 3) {
    // Round Glasses
    ctx.strokeStyle = '#5C4033';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-6.2, -27.5, 4.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(6.2, -27.5, 4.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1.6, -27.5);
    ctx.lineTo(1.6, -27.5);
    ctx.stroke();
  } else if (app.accessoryId === 4) {
    // Flower Pin
    ctx.fillStyle = '#FFE066';
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(11 + Math.cos(a) * 4, -39 + Math.sin(a) * 4, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FF922B';
    ctx.beginPath();
    ctx.arc(11, -39, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (app.accessoryId === 5) {
    // Cozy Beret
    ctx.fillStyle = '#9C6ADE';
    ctx.beginPath();
    ctx.ellipse(2, -43, 15, 7, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -50);
    ctx.lineTo(6, -53);
    ctx.stroke();
  }
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text?: string,
  stamp?: StampId
): void {
  const stampDef = stamp ? STAMPS.find((s) => s.id === stamp) : null;
  const content = stampDef ? `${stampDef.emoji} ${stampDef.label}` : text ?? '';
  if (!content) return;

  ctx.save();
  ctx.font = '700 13px "M PLUS Rounded 1c", sans-serif';
  const w = Math.max(54, ctx.measureText(content).width + 22);
  const h = 30;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#B88B5A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h, w, h, 14);
  ctx.fill();
  ctx.stroke();

  // Bubble pointer
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 1);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x + 6, y - 1);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = OUTLINE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(content, x, y - h / 2 + 1);
  ctx.restore();
}
