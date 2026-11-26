import { JOBS } from '@familia-town/shared';
import type { NpcDialogState } from '../net/useGameSocket';
import { ChibiPreview } from './ChibiPreview';

interface NpcDialogModalProps {
  dialog: NpcDialogState;
  onClose: () => void;
  onOpenJobs: () => void;
}

export function NpcDialogModal({ dialog, onClose, onOpenJobs }: NpcDialogModalProps) {
  const { npc, line, affinity, canRomance } = dialog;
  const job = npc.jobId ? JOBS[npc.jobId] : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(54, 38, 26, 0.35)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '16px 16px 28px',
        zIndex: 35,
      }}
      onClick={onClose}
    >
      <div
        className="storybook-card"
        style={{
          width: '100%',
          maxWidth: 620,
          padding: 18,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: '#F6EEDF',
            borderRadius: 16,
            border: '2px solid #D8BC92',
            padding: 4,
            flexShrink: 0,
          }}
        >
          <ChibiPreview appearance={npc.appearance} size={96} scale={1.4} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 19, fontWeight: 800 }}>{npc.name}</span>
            <span className="pill-badge" style={{ fontSize: 11 }}>
              {job ? `${job.emoji} ` : ''}
              {npc.roleTitle}（{npc.age}さい）
            </span>
            {canRomance && (
              <span
                className="pill-badge"
                style={{ fontSize: 11, background: '#FDE8F0', borderColor: '#EC6B99', color: '#C43E6E' }}
              >
                💖 なかよし度 {affinity}/100
              </span>
            )}
          </div>

          <p style={{ margin: '6px 0 12px', fontSize: 15, fontWeight: 700, lineHeight: 1.55 }}>
            「{line}」
          </p>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {npc.id === 'npc_mei' && (
              <button
                className="btn-green"
                style={{ fontSize: 13, padding: '8px 16px' }}
                onClick={() => {
                  onClose();
                  onOpenJobs();
                }}
              >
                💼 転職＆スキルを見る
              </button>
            )}
            <button className="btn-primary" style={{ fontSize: 13, padding: '8px 18px' }} onClick={onClose}>
              またね！
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
