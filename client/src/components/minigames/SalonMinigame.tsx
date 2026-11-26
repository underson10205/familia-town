import { useEffect, useRef, useState } from 'react';
import { soundManager } from '../../game/audio';

interface Props {
  tier: 1 | 2 | 3;
  skillRanks: Record<string, number>;
  onFinish: (score: number) => void;
}

interface Note {
  id: number;
  icon: string;
  x: number; // 100 -> 0
  judged: boolean;
}

const STYLE_ICONS = ['✂️', '🪮', '💄', '🎀'];

export function SalonMinigame({ tier, skillRanks, onFinish }: Props) {
  const guideRank = skillRanks['bty_guide_line'] ?? 0;
  const totalNotes = tier === 1 ? 6 : tier === 2 ? 8 : 10;
  const noteSpeed = tier === 1 ? 38 : tier === 2 ? 52 : 66;
  const hitWindow = 10 + guideRank * 4; // target is x=20

  const [notes, setNotes] = useState<Note[]>([]);
  const [hits, setHits] = useState(0);
  const [feedback, setFeedback] = useState('キラキラの輪に重なったらタップ！');

  const notesRef = useRef<Note[]>([]);
  const hitsRef = useRef(0);
  const judgedCountRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    soundManager.playBgm('minigame');
    const spacing = tier === 1 ? 36 : tier === 2 ? 32 : 28;
    const initial: Note[] = Array.from({ length: totalNotes }, (_, i) => ({
      id: i,
      icon: STYLE_ICONS[i % STYLE_ICONS.length],
      x: 100 + i * spacing,
      judged: false,
    }));
    notesRef.current = initial;
    setNotes([...initial]);

    let rafId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!doneRef.current) {
        for (const n of notesRef.current) {
          if (n.judged) continue;
          n.x -= noteSpeed * dt;
          if (n.x < 20 - hitWindow - 4) {
            n.judged = true;
            judgedCountRef.current += 1;
          }
        }
        setNotes([...notesRef.current]);
        if (judgedCountRef.current >= totalNotes) {
          doneRef.current = true;
          const pct = Math.round((hitsRef.current / totalNotes) * 100);
          setTimeout(() => onFinish(pct), 280);
          return;
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      soundManager.playBgm('town');
    };
  }, [hitWindow, noteSpeed, onFinish, tier, totalNotes]);

  const handleTapBeat = () => {
    if (doneRef.current) return;
    const candidate = notesRef.current.find((n) => !n.judged && Math.abs(n.x - 20) <= hitWindow);
    if (candidate) {
      candidate.judged = true;
      judgedCountRef.current += 1;
      hitsRef.current += 1;
      setHits(hitsRef.current);
      soundManager.playPop(740, 0.08);
      setFeedback('✨ かわいい〜！ナイススタイリング！');
    } else {
      soundManager.playPop(260, 0.08);
      setFeedback('💦 もうすこし引きつけて！');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0' }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>
        ✂️ スタイリング成功: {hits} / {totalNotes}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#EC6B99' }}>{feedback}</div>

      {/* Rhythm Lane */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          height: 68,
          background: '#FDECF2',
          borderRadius: 999,
          border: '3px solid #EC6B99',
          overflow: 'hidden',
        }}
      >
        {/* Target Sparkle Zone */}
        <div
          style={{
            position: 'absolute',
            left: `${20 - hitWindow}%`,
            width: `${hitWindow * 2}%`,
            top: 4,
            bottom: 4,
            background: 'rgba(236, 107, 153, 0.25)',
            border: '2px dashed #EC6B99',
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '20%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid #EC6B99',
            background: 'rgba(255,255,255,0.8)',
          }}
        />

        {notes.map(
          (n) =>
            !n.judged &&
            n.x <= 105 && (
              <div
                key={n.id}
                style={{
                  position: 'absolute',
                  left: `${n.x}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 28,
                }}
              >
                {n.icon}
              </div>
            )
        )}
      </div>

      <button className="btn-primary" style={{ fontSize: 18, padding: '14px 40px' }} onClick={handleTapBeat}>
        ✨ いま！カット＆メイク！
      </button>
    </div>
  );
}
