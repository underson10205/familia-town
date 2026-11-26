import { useEffect, useRef } from 'react';
import type { Appearance } from '@familia-town/shared';
import { drawChibiCharacter } from '../game/chibiRenderer';

interface ChibiPreviewProps {
  appearance: Appearance;
  size?: number;
  scale?: number;
}

export function ChibiPreview({ appearance, size = 110, scale = 1.6 }: ChibiPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    const render = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, size, size);
      drawChibiCharacter(ctx, {
        x: size / 2,
        y: size * 0.84,
        scale,
        appearance,
        dir: 'down',
        moving: false,
        timeSec: now / 1000,
      });
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [appearance, size, scale]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block' }} />;
}
