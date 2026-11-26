import { useEffect, useMemo, useRef, useState } from 'react';
import { soundManager } from '../../game/audio';

interface Props {
  tier: 1 | 2 | 3;
  skillRanks: Record<string, number>;
  onFinish: (score: number) => void;
}

interface RoomReq {
  id: string;
  emoji: string;
  label: string;
  targetCell: number; // 0..5 in 3x2 floor plan
  hintText: string;
}

const CELL_LABELS = ['北西（左上）', '北（上中央）', '北東（右上）', '南西（左下）', '南（下中央）', '南東（右下）'];

const ROOM_POOL = [
  { id: 'bed', emoji: '🛏️', label: 'ベッド' },
  { id: 'kitchen', emoji: '🍳', label: 'キッチン' },
  { id: 'bath', emoji: '🛁', label: 'おふろ' },
  { id: 'sofa', emoji: '🛋️', label: 'リビング' },
  { id: 'garden', emoji: '🌸', label: 'お庭' },
];

export function RealtorMinigame({ tier, skillRanks, onFinish }: Props) {
  const hintRank = skillRanks['rel_blueprint_hint'] ?? 0;
  const roomCount = tier === 1 ? 3 : tier === 2 ? 4 : 5;
  const totalSec = 20 + hintRank * 4;

  const requirements = useMemo<RoomReq[]>(() => {
    const cells = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    return ROOM_POOL.slice(0, roomCount).map((r, idx) => ({
      ...r,
      targetCell: cells[idx],
      hintText: `${r.emoji}${r.label} → ${CELL_LABELS[cells[idx]]}`,
    }));
  }, [roomCount]);

  const [selectedRoomId, setSelectedRoomId] = useState<string>(requirements[0].id);
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(totalSec);
  const doneRef = useRef(false);

  useEffect(() => {
    soundManager.playBgm('minigame');
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!doneRef.current) {
            doneRef.current = true;
            onFinish(60);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      window.clearInterval(timer);
      soundManager.playBgm('town');
    };
  }, [onFinish]);

  const selectedReq = requirements.find((r) => r.id === selectedRoomId);

  const handleCellClick = (cellIdx: number) => {
    if (doneRef.current || !selectedReq) return;
    if (cellIdx === selectedReq.targetCell) {
      soundManager.playPop(720, 0.08);
      const nextPlaced = { ...placed, [cellIdx]: selectedReq.emoji };
      setPlaced(nextPlaced);

      const remaining = requirements.filter((r) => !Object.values(nextPlaced).includes(r.emoji));
      if (remaining.length === 0) {
        doneRef.current = true;
        soundManager.playChime();
        setTimeout(() => onFinish(100), 300);
      } else {
        setSelectedRoomId(remaining[0].id);
      }
    } else {
      soundManager.playPop(220, 0.1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 14, fontWeight: 800, fontSize: 14 }}>
        <span>🏡 のこり {requirements.length - Object.keys(placed).length} 部屋</span>
        <span>⏱️ のこり {timeLeft}秒</span>
      </div>

      {/* Client request list */}
      <div
        style={{
          width: '100%',
          background: '#FFF7E6',
          border: '2px solid #D6A667',
          borderRadius: 12,
          padding: '8px 12px',
          fontSize: 12,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
        }}
      >
        {requirements.map((r) => {
          const isDone = placed[r.targetCell] === r.emoji;
          const isSel = selectedRoomId === r.id && !isDone;
          return (
            <button
              key={r.id}
              disabled={isDone}
              onClick={() => setSelectedRoomId(r.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 12,
                background: isDone ? '#D8F3DC' : isSel ? '#FFE599' : '#FFF',
                border: isSel ? '2.5px solid #2E86AB' : '1.5px solid #C8AC83',
                textDecoration: isDone ? 'line-through' : 'none',
              }}
            >
              {r.hintText}
            </button>
          );
        })}
      </div>

      {/* 3x2 Floor Plan Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 98px)',
          gap: 8,
          background: '#EAF5F9',
          padding: 12,
          borderRadius: 16,
          border: '3px solid #2E86AB',
        }}
      >
        {CELL_LABELS.map((label, idx) => {
          const isHint = hintRank > 0 && selectedReq?.targetCell === idx && !placed[idx];
          return (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              style={{
                height: 76,
                borderRadius: 12,
                background: placed[idx] ? '#D8F3DC' : isHint ? '#FFF3B0' : '#FFFFFF',
                border: isHint ? '3px dashed #E5AA3C' : '2px solid #9AC5D8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 26 }}>{placed[idx] ?? (isHint ? '✨' : '')}</span>
              <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.75 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
