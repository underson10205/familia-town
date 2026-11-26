import { type CharacterSummary, type WorldClock, JOBS } from '@familia-town/shared';
import { ChibiPreview } from './ChibiPreview';
import { soundManager } from '../game/audio';

const SEASON_LABELS: Record<WorldClock['season'], string> = {
  spring: '🌸 はる',
  summer: '🌻 なつ',
  autumn: '🍁 あき',
  winter: '⛄ ふゆ',
};

interface LoginScreenProps {
  connected: boolean;
  characters: CharacterSummary[];
  clock: WorldClock | null;
  onSelectCharacter: (id: string) => void;
  onCreateNew: () => void;
}

export function LoginScreen({
  connected,
  characters,
  clock,
  onSelectCharacter,
  onCreateNew,
}: LoginScreenProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '28px 16px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="storybook-card" style={{ width: '100%', maxWidth: 760, padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#8C6239', letterSpacing: 1 }}>
          みんなで暮らす・世代をつなぐスローライフMMORPG
        </div>
        <h1 style={{ margin: '6px 0 12px', fontSize: 34, color: '#5A3A22' }}>
          🏡 ファミリアタウン
        </h1>

        {clock && (
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
            <span className="pill-badge">
              📅 {clock.year}年目 {SEASON_LABELS[clock.season]} {clock.day}日目
            </span>
            <span className="pill-badge">
              👥 いま {clock.onlineCount} / {clock.maxPlayers} 人ログイン中
            </span>
            <span className="pill-badge">
              {clock.paused ? '⏸ 誰もいないので時間ストップ中' : '▶️ 町の時間が進んでいるよ'}
            </span>
          </div>
        )}

        {!connected ? (
          <p style={{ fontWeight: 700, padding: 24 }}>🔄 町のサーバーに接続しているよ...</p>
        ) : (
          <>
            {characters.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>つづきから遊ぶ住人をえらんでね</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                    gap: 14,
                  }}
                >
                  {characters.map((c) => {
                    const job = JOBS[c.jobId];
                    return (
                      <button
                        key={c.id}
                        disabled={c.online}
                        onClick={() => onSelectCharacter(c.id)}
                        style={{
                          background: c.online ? '#F2EFEA' : '#FFFDF7',
                          border: `2.5px solid ${c.online ? '#C5BEB5' : '#D0AE7F'}`,
                          borderRadius: 16,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          opacity: c.online ? 0.65 : 1,
                        }}
                      >
                        <ChibiPreview appearance={c.appearance} size={92} scale={1.35} />
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{c.name}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: job.color }}>
                          {job.emoji} {job.name} ・ {c.age}さい（{c.generation}代目）
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>💰 {c.money}G</div>
                        {c.online && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#D9534F' }}>
                            🟢 いまログイン中
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              className="btn-primary"
              style={{ fontSize: 18, padding: '14px 32px' }}
              onClick={() => {
                soundManager.unlock();
                soundManager.playBgm('home');
                soundManager.playPop(600);
                onCreateNew();
              }}
            >
              ✨ あたらしい住人をつくって町に入る
            </button>
          </>
        )}
      </div>
    </div>
  );
}
