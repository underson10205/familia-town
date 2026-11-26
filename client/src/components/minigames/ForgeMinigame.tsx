import { useEffect, useRef, useState } from 'react';
import { soundManager } from '../../game/audio';

interface Props {
  tier: 1 | 2 | 3;
  skillRanks: Record<string, number>;
  onFinish: (score: number) => void;
}

export function ForgeMinigame({ tier, skillRanks, onFinish }: Props) {
  const [pos, setPos] = useState(10);
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('赤いゾーンで「カンッ！」と叩こう！');

  const wideRank = skillRanks['blk_wide_zone'] ?? 0;
  const slowRank = skillRanks['blk_slow_bar'] ?? 0;

  // Higher tier -> narrower zone & faster bar; skills directly counter difficulty!
  const baseZoneWidth = tier === 1 ? 26 : tier === 2 ? 18 : 12;
  const zoneWidth = Math.min(46, baseZoneWidth + wideRank * 6);
  const zoneStart = 50 - zoneWidth / 2;
  const zoneEnd = 50 + zoneWidth / 2;

  const baseSpeed = tier === 1 ? 68 : tier === 2 ? 105 : 145;
  const speed = Math.max(48, baseSpeed * (1 - slowRank * 0.14));

  const posRef = useRef(10);
  const dirRef = useRef(1);
  const doneRef = useRef(false);

  useEffect(() => {
    soundManager.playBgm('minigame');
    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!doneRef.current) {
        posRef.current += dirRef.current * speed * dt;
        if (posRef.current >= 98) {
          posRef.current = 98;
          dirRef.current = -1;
        } else if (posRef.current <= 2) {
          posRef.current = 2;
          dirRef.current = 1;
        }
        setPos(posRef.current);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      soundManager.playBgm('town');
    };
  }, [speed]);

  const handleStrike = () => {
    if (doneRef.current) return;
    const p = posRef.current;
    const distFromCenter = Math.abs(p - 50);
    let hitScore = 25;
    if (p >= zoneStart && p <= zoneEnd) {
      hitScore = distFromCenter < zoneWidth * 0.25 ? 100 : 82;
      soundManager.playChime();
      setFeedback(hitScore === 100 ? '🔥 パーフェクト！！カンッ！' : '✨ ナイス鍛造！');
    } else {
      soundManager.playPop(240, 0.1);
      setFeedback('💦 おしい！もう一回ねらおう！');
    }

    const nextScores = [...scores, hitScore];
    setScores(nextScores);
    if (nextScores.length >= 3) {
      doneRef.current = true;
      const avg = Math.round(nextScores.reduce((a, b) => a + b, 0) / nextScores.length);
      setTimeout(() => onFinish(avg), 420);
    } else {
      setRound(nextScores.length + 1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0' }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>
        🔨 鍛造チャレンジ（{round} / 3回目）
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#B85C2A' }}>{feedback}</div>

      {/* Forging Gauge */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          height: 44,
          background: '#3B3028',
          borderRadius: 999,
          border: '3px solid #754C29',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${zoneStart}%`,
            width: `${zoneWidth}%`,
            top: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, #FF7B54 0%, #D9453B 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${pos}%`,
            top: -2,
            bottom: -2,
            width: 10,
            transform: 'translateX(-50%)',
            background: '#FFF3C4',
            border: '2px solid #4A3525',
            borderRadius: 6,
          }}
        />
      </div>

      <button className="btn-primary" style={{ fontSize: 18, padding: '14px 40px' }} onClick={handleStrike}>
        🔨 カンッと叩く！
      </button>
    </div>
  );
}
