import { type CharacterData, type JobId, JOB_LIST } from '@familia-town/shared';

interface JobInfoModalProps {
  self: CharacterData;
  onChangeJob: (jobId: JobId) => void;
  onClose: () => void;
}

export function JobInfoModal({ self, onChangeJob, onClose }: JobInfoModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(54, 38, 26, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 30,
      }}
      onClick={onClose}
    >
      <div
        className="storybook-card"
        style={{ width: '100%', maxWidth: 820, maxHeight: '88vh', overflowY: 'auto', padding: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>💼 職業とスキルツリー</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>
              いつでも好きな職業に転職OK！獲得したスキルは子供にも引き継げるよ。
            </p>
          </div>
          <button className="btn-secondary" onClick={onClose}>
            ✕ とじる
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {JOB_LIST.map((job) => {
            const isCurrent = self.jobId === job.id;
            const prog = self.jobProgress[job.id];
            return (
              <div
                key={job.id}
                style={{
                  background: isCurrent ? job.accentColor : '#FFFDF8',
                  border: isCurrent ? `3px solid ${job.color}` : '2px solid #DECBB0',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>
                    {job.emoji} {job.name}
                  </span>
                  <span className="pill-badge" style={{ fontSize: 11 }}>
                    Lv.{prog.level}
                  </span>
                </div>

                <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>{job.shortDesc}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: job.color }}>
                  🎮 お仕事：{job.minigameSummary}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                  {job.skills.map((sk) => {
                    const unlocked = self.unlockedSkills.includes(sk.id);
                    return (
                      <div
                        key={sk.id}
                        style={{
                          background: unlocked ? '#E8F7EA' : 'rgba(255,255,255,0.75)',
                          border: `1.5px solid ${unlocked ? '#5CB874' : '#E2D3BC'}`,
                          borderRadius: 10,
                          padding: '6px 8px',
                          fontSize: 11,
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>
                          {sk.icon} {sk.name}{' '}
                          <span style={{ opacity: 0.65 }}>(Lv.{sk.requiredLevel})</span>
                        </div>
                        <div style={{ opacity: 0.8 }}>{sk.description}</div>
                      </div>
                    );
                  })}
                </div>

                <button
                  className={isCurrent ? 'btn-secondary' : 'btn-green'}
                  disabled={isCurrent}
                  style={{ marginTop: 'auto', fontSize: 13, padding: '8px 12px' }}
                  onClick={() => onChangeJob(job.id)}
                >
                  {isCurrent ? '✨ いまの職業だよ' : `${job.name} に転職する`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
