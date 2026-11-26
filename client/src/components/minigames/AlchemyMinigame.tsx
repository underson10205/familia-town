import { useEffect, useRef, useState } from 'react';
import { soundManager } from '../../game/audio';

interface Props {
  tier: 1 | 2 | 3;
  skillRanks: Record<string, number>;
  onFinish: (score: number) => void;
}

export function AlchemyMinigame({ tier, skillRanks, onFinish }: Props) {
  const [temp, setTemp] = useState(50);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);

  const steadyRank = skillRanks['alc_steady_fire'] ?? 0;
  const baseZone = tier === 1 ? 34 : tier === 2 ? 26 : 19;
  const zoneWidth = Math.min(54, baseZone + steadyRank * 7);
  const zoneMin = 50 - zoneWidth / 2;
  const zoneMax = 50 + zoneWidth / 2;

  const heatingRef = useRef(false);
  const tempRef = useRef(50);
  const progressRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    soundManager.playBgm('minigame');
    let rafId = 0;
    const startMs = performance.now();
    let lastMs = startMs;
    const wobbleAmp = Math.max(10, (tier === 1 ? 18 : tier === 2 ? 32 : 46) * (1 - steadyRank * 0.18));

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastMs) / 1000);
      lastMs = now;
      const elapsed = (now - startMs) / 1000;
      const rem = Math.max(0, 12 - elapsed);
      setTimeLeft(Math.ceil(rem));

      if (doneRef.current) return;

      const heatForce = heatingRef.current ? 58 : -44;
      const wobble = Math.sin(elapsed * (2.5 + tier)) * wobbleAmp;
      tempRef.current = Math.max(4, Math.min(96, tempRef.current + (heatForce + wobble) * dt));
      setTemp(tempRef.current);

      if (tempRef.current >= zoneMin && tempRef.current <= zoneMax) {
        progressRef.current = Math.min(100, progressRef.current + dt * 26);
        setProgress(Math.round(progressRef.current));
      }

      if (progressRef.current >= 100) {
        doneRef.current = true;
        soundManager.playChime();
        setTimeout(() => onFinish(100), 300);
        return;
      }
      if (rem <= 0) {
        doneRef.current = true;
        onFinish(Math.round(progressRef.current));
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      soundManager.playBgm('town');
    };
  }, [onFinish, steadyRank, tier, zoneMax, zoneMin]);

  const inZone = temp >= zoneMin && temp <= zoneMax;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0' }}>
      <div style={{ display: 'flex', gap: 14, fontWeight: 800, fontSize: 15 }}>
        <span>⚗️ 調合進みぐあい: {progress}%</span>
        <span>⏱️ のこり {timeLeft}秒</span>
      </div>

      {/* Temperature Gauge */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          height: 40,
          background: '#382B47',
          borderRadius: 999,
          border: '3px solid #7E57C2',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${zoneMin}%`,
            width: `${zoneWidth}%`,
            top: 0,
            bottom: 0,
            background: inZone ? '#5DD384' : 'rgba(93, 211, 132, 0.55)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${temp}%`,
            top: 2,
            bottom: 2,
            width: 14,
            transform: 'translateX(-50%)',
            background: '#FFE066',
            border: '2px solid #4A3525',
            borderRadius: 999,
          }}
        />
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          height: 14,
          background: '#EFE3CE',
          borderRadius: 999,
          overflow: 'hidden',
          border: '2px solid #B88B5A',
        }}
      >
        <div style={{ width: `${progress}%`, height: '100%', background: '#7E57C2' }} />
      </div>

      <button
        className="btn-primary"
        style={{ fontSize: 17, padding: '14px 36px', touchAction: 'none' }}
        onPointerDown={() => {
          heatingRef.current = true;
          soundManager.playPop(460, 0.06);
        }}
        onPointerUp={() => {
          heatingRef.current = false;
        }}
        onPointerLeave={() => {
          heatingRef.current = false;
        }}
      >
        🔥 長おしで火を強くする！
      </button>
    </div>
  );
}
