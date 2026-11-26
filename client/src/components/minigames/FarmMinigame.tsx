import { useEffect, useRef, useState } from 'react';
import { soundManager } from '../../game/audio';

interface Props {
  tier: 1 | 2 | 3;
  skillRanks: Record<string, number>;
  onFinish: (score: number) => void;
}

const ICONS_BY_TIER: Record<1 | 2 | 3, string[]> = {
  1: ['💧', '🥕', '🌱'],
  2: ['🐄', '🐖', '🥛'],
  3: ['🍓', '💧', '✨'],
};

export function FarmMinigame({ tier, skillRanks, onFinish }: Props) {
  const greenRank = skillRanks['frm_green_thumb'] ?? 0;
  const sprinklerRank = skillRanks['frm_sprinkler'] ?? 0;

  const targetCount = tier === 1 ? 8 : tier === 2 ? 11 : 14;
  const totalSec = 12 + greenRank * 2;
  const spawnMs = Math.max(520, (tier === 1 ? 950 : tier === 2 ? 780 : 620) + greenRank * 120);

  const [cells, setCells] = useState<(string | null)[]>(() => Array(9).fill(null));
  const [hits, setHits] = useState(sprinklerRank > 0 ? 2 : 0);
  const [timeLeft, setTimeLeft] = useState(totalSec);

  const hitsRef = useRef(sprinklerRank > 0 ? 2 : 0);
  const doneRef = useRef(false);

  useEffect(() => {
    soundManager.playBgm('minigame');
    const icons = ICONS_BY_TIER[tier];

    const spawner = window.setInterval(() => {
      if (doneRef.current) return;
      setCells((prev) => {
        const next = [...prev];
        // Clear random old icon if crowded
        const activeIndices = next.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
        if (activeIndices.length >= 3) {
          next[activeIndices[0]] = null;
        }
        const empty = next.map((v, i) => (!v ? i : -1)).filter((i) => i >= 0);
        if (empty.length > 0) {
          const pickIdx = empty[Math.floor(Math.random() * empty.length)];
          next[pickIdx] = icons[Math.floor(Math.random() * icons.length)];
        }
        return next;
      });
    }, spawnMs);

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!doneRef.current) {
            doneRef.current = true;
            const score = Math.min(100, Math.round((hitsRef.current / targetCount) * 100));
            setTimeout(() => onFinish(score), 200);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(spawner);
      window.clearInterval(timer);
      soundManager.playBgm('town');
    };
  }, [onFinish, spawnMs, targetCount, tier]);

  const handleTap = (idx: number) => {
    if (doneRef.current || !cells[idx]) return;
    soundManager.playPop(680, 0.08);
    setCells((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    hitsRef.current += 1;
    setHits(hitsRef.current);
    if (hitsRef.current >= targetCount && !doneRef.current) {
      doneRef.current = true;
      soundManager.playChime();
      setTimeout(() => onFinish(100), 280);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', gap: 14, fontWeight: 800, fontSize: 15 }}>
        <span>🌾 お世話: {hits} / {targetCount}</span>
        <span>⏱️ のこり {timeLeft}秒</span>
      </div>
      {sprinklerRank > 0 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#2E86AB' }}>
          💧 自動スプリンクラー発動！（はじめから +2 お世話済み）
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 82px)',
          gap: 10,
          background: '#A2784B',
          padding: 12,
          borderRadius: 18,
          border: '3px solid #754C29',
        }}
      >
        {cells.map((icon, i) => (
          <button
            key={i}
            onClick={() => handleTap(i)}
            style={{
              width: 82,
              height: 74,
              borderRadius: 14,
              background: icon ? '#EBF9E5' : '#8A6139',
              border: icon ? '3px solid #5CB874' : '2px solid #6E4A27',
              fontSize: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon ?? ''}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>💡 マスに出てくるアイコンを素早くタップしよう！</div>
    </div>
  );
}
