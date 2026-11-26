import { useState } from 'react';
import {
  type CharacterData,
  type ChatMessage,
  type StampId,
  type WorldClock,
  JOBS,
  STAMPS,
} from '@familia-town/shared';
import { soundManager } from '../game/audio';

const SEASON_ICONS: Record<WorldClock['season'], string> = {
  spring: '🌸 春',
  summer: '🌻 夏',
  autumn: '🍁 秋',
  winter: '⛄ 冬',
};

interface HUDProps {
  self: CharacterData;
  clock: WorldClock;
  chatHistory: ChatMessage[];
  nearbyNpcName: string | null;
  nearDungeonGate: boolean;
  onSendChat: (text: string) => void;
  onSendStamp: (stamp: StampId) => void;
  onOpenWork: () => void;
  onOpenMarket: () => void;
  onOpenJobs: () => void;
  onEatSnack: () => void;
  onInteractNearby: () => void;
  onEnterDungeonGate: () => void;
  onJoystickMove: (dx: number, dy: number) => void;
}

export function HUD({
  self,
  clock,
  chatHistory,
  nearbyNpcName,
  nearDungeonGate,
  onSendChat,
  onSendStamp,
  onOpenWork,
  onOpenMarket,
  onOpenJobs,
  onEatSnack,
  onInteractNearby,
  onEnterDungeonGate,
  onJoystickMove,
}: HUDProps) {
  const [muted, setMuted] = useState(soundManager.isMuted());
  const [chatText, setChatText] = useState('');
  const [showStamps, setShowStamps] = useState(false);

  const job = JOBS[self.jobId];
  const hours = String(Math.floor(clock.minuteOfDay / 60)).padStart(2, '0');
  const mins = String(Math.floor(clock.minuteOfDay % 60)).padStart(2, '0');
  const dayIcon = clock.minuteOfDay >= 360 && clock.minuteOfDay < 1080 ? '☀️' : '🌙';
  const onigiriCount = self.inventory.find((i) => i.itemId === 'onigiri')?.count ?? 0;
  const sp = self.skillPoints ?? 0;

  const handleToggleMute = () => {
    setMuted(soundManager.toggleMute());
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText.trim());
    setChatText('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {/* Top Left: Character Status Card */}
      <div
        className="storybook-card"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '10px 14px',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 230,
          maxWidth: 'calc(100vw - 24px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            {self.name}{' '}
            <span style={{ fontSize: 11, opacity: 0.78 }}>
              ({self.age}さい・{self.generation}代目)
            </span>
          </div>
          <span
            style={{
              background: job.accentColor,
              color: job.color,
              border: `1.5px solid ${job.color}`,
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {job.emoji} {job.name} Lv.{self.jobProgress[self.jobId].level}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700 }}>
          <span>💰 {self.money}G</span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🍙</span>
            <div
              style={{
                flex: 1,
                height: 10,
                background: '#EFE3CE',
                borderRadius: 999,
                overflow: 'hidden',
                border: '1.5px solid #C8AC83',
              }}
            >
              <div
                style={{
                  width: `${Math.round((self.hunger / self.maxHunger) * 100)}%`,
                  height: '100%',
                  background: self.hunger > 30 ? '#68C178' : '#E86F5C',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            style={{ padding: '5px 12px', fontSize: 12, boxShadow: '0 2px 0 #b84a39' }}
            onClick={onOpenWork}
          >
            {job.emoji} お仕事する
          </button>
          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onOpenJobs}>
            🌳 スキル{sp > 0 ? ` (${sp}SP)` : ''}
          </button>
          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onOpenMarket}>
            🏪 お店・掲示板
          </button>
          {onigiriCount > 0 && (
            <button
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: 12 }}
              onClick={onEatSnack}
              title="おにぎりをたべる"
            >
              🍙×{onigiriCount}
            </button>
          )}
        </div>
      </div>

      {/* Top Right: Shared Clock & Online Count */}
      <div
        className="storybook-card"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '10px 14px',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            {clock.year}年目 {SEASON_ICONS[clock.season]} {clock.day}日
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>
            {dayIcon} {hours}:{mins} ・ 👥 {clock.onlineCount}/{clock.maxPlayers}人
          </div>
        </div>
        <button
          className="btn-secondary"
          style={{ padding: '6px 10px', fontSize: 16 }}
          onClick={handleToggleMute}
          title="BGM・効果音のオン/オフ"
        >
          {muted ? '🔇' : '🎵'}
        </button>
      </div>

      {/* Bottom Left: Touch Virtual Pad (usable on tablets/phones & mouse drag) */}
      <TouchPad onMove={onJoystickMove} />

      {/* Center-Bottom: Nearby Interact / Dungeon Gate Prompt */}
      {nearDungeonGate ? (
        <button
          className="btn-primary"
          onClick={onEnterDungeonGate}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            fontSize: 16,
            padding: '12px 24px',
          }}
        >
          🌲 ダンジョンに入る (Space)
        </button>
      ) : (
        nearbyNpcName && (
          <button
            className="btn-green"
            onClick={onInteractNearby}
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'auto',
              fontSize: 16,
              padding: '12px 24px',
            }}
          >
            💬 {nearbyNpcName} と話す (Space)
          </button>
        )
      )}

      {/* Bottom Right: Stamps & Chat */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          width: 'min(310px, calc(100vw - 150px))',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {showStamps && (
          <div
            className="storybook-card"
            style={{
              padding: 10,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
            }}
          >
            {STAMPS.map((st) => (
              <button
                key={st.id}
                className="btn-secondary"
                style={{ fontSize: 12, padding: '6px 8px', textAlign: 'left' }}
                onClick={() => {
                  onSendStamp(st.id);
                  setShowStamps(false);
                }}
              >
                {st.emoji} {st.label}
              </button>
            ))}
          </div>
        )}

        {/* Recent Chat Feed */}
        {chatHistory.length > 0 && (
          <div
            style={{
              background: 'rgba(255, 252, 244, 0.82)',
              borderRadius: 14,
              border: '2px solid rgba(184, 139, 90, 0.5)',
              padding: '6px 10px',
              maxHeight: 95,
              overflowY: 'auto',
              fontSize: 12,
            }}
          >
            {chatHistory.slice(-4).map((m) => {
              const st = m.stamp ? STAMPS.find((s) => s.id === m.stamp) : null;
              return (
                <div key={m.id} style={{ marginBottom: 2 }}>
                  <strong style={{ color: '#8C5A34' }}>{m.senderName}:</strong>{' '}
                  {st ? `${st.emoji} ${st.label}` : m.text}
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '8px 10px', fontSize: 16 }}
            onClick={() => setShowStamps((v) => !v)}
            title="かんたんスタンプ"
          >
            😊
          </button>
          <input
            type="text"
            placeholder="おはなし..."
            maxLength={80}
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '8px 12px',
              borderRadius: 999,
              border: '2px solid #B88B5A',
              background: 'rgba(255, 252, 244, 0.96)',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 13,
            }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
            送信
          </button>
        </form>
      </div>
    </div>
  );
}

function TouchPad({ onMove }: { onMove: (dx: number, dy: number) => void }) {
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
        bottom: 18,
        left: 18,
        width: 104,
        height: 104,
        borderRadius: '50%',
        background: 'rgba(255, 252, 244, 0.55)',
        border: '3px solid rgba(184, 139, 90, 0.7)',
        pointerEvents: 'auto',
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
          background: 'rgba(232, 116, 97, 0.85)',
          border: '3px solid #FFFDF7',
          transform: `translate(${knob.x}px, ${knob.y}px)`,
          boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}
