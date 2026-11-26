import { useState } from 'react';
import {
  type CharacterData,
  type JobId,
  type SkillNodeDef,
  JOBS,
  JOB_LIST,
  canUnlockSkill,
} from '@familia-town/shared';
import { soundManager } from '../game/audio';

interface JobInfoModalProps {
  self: CharacterData;
  onChangeJob: (jobId: JobId) => void;
  onUnlockSkill: (skillId: string) => void;
  onClose: () => void;
}

export function JobInfoModal({ self, onChangeJob, onUnlockSkill, onClose }: JobInfoModalProps) {
  const [selectedJobId, setSelectedJobId] = useState<JobId>(self.jobId);
  const job = JOBS[selectedJobId];
  const [selectedSkillId, setSelectedSkillId] = useState<string>(job.skills[0].id);

  const skillRanks = self.skillRanks ?? {};
  const skillPoints = self.skillPoints ?? 0;
  const selectedSkill: SkillNodeDef =
    job.skills.find((s) => s.id === selectedSkillId) ?? job.skills[0];

  const handleSelectJobTab = (id: JobId) => {
    soundManager.playPop(540);
    setSelectedJobId(id);
    setSelectedSkillId(JOBS[id].skills[0].id);
  };

  const selectedRank = skillRanks[selectedSkill.id] ?? 0;
  const unlockCheck = canUnlockSkill(selectedSkill.id, skillRanks, skillPoints);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(35, 25, 18, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        zIndex: 30,
      }}
      onClick={onClose}
    >
      <div
        className="storybook-card"
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 21 }}>🌳 職業 ＆ スキルツリー</h2>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              スキルポイントを自由に割り振って解放！習得したスキルは子供にも引き継げるよ。
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              className="pill-badge"
              style={{
                background: '#FFF3C4',
                borderColor: '#E5AA3C',
                fontSize: 14,
                padding: '6px 14px',
              }}
            >
              💎 スキルポイント: <strong>{skillPoints} SP</strong>
            </span>
            <button className="btn-secondary" onClick={onClose}>
              ✕ とじる
            </button>
          </div>
        </div>

        {/* 6 Job Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {JOB_LIST.map((j) => {
            const active = j.id === selectedJobId;
            const isCurrent = j.id === self.jobId;
            return (
              <button
                key={j.id}
                onClick={() => handleSelectJobTab(j.id)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13,
                  background: active ? j.accentColor : '#FFFDF8',
                  border: active ? `3px solid ${j.color}` : '2px solid #DECBB0',
                  color: active ? j.color : '#4A3525',
                }}
              >
                {j.emoji} {j.name}
                {isCurrent ? ' ★' : ''}
              </button>
            );
          })}
        </div>

        {/* Job Banner & Switch Button */}
        <div
          style={{
            background: job.accentColor,
            border: `2px solid ${job.color}`,
            borderRadius: 14,
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: job.color }}>
              {job.emoji} {job.name}（Lv.{self.jobProgress[job.id].level}）
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{job.shortDesc}</div>
          </div>
          <button
            className={self.jobId === job.id ? 'btn-secondary' : 'btn-green'}
            disabled={self.jobId === job.id}
            style={{ fontSize: 13, padding: '8px 14px' }}
            onClick={() => onChangeJob(job.id)}
          >
            {self.jobId === job.id ? '✨ いまの職業' : `${job.name} に転職する`}
          </button>
        </div>

        {/* Shelldiver-style Visual Branching Node Tree */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 310,
            borderRadius: 18,
            background: 'radial-gradient(circle at 50% 25%, #2D3548 0%, #1B2130 100%)',
            border: '3px solid #6E5A44',
            overflow: 'hidden',
          }}
        >
          {/* Subtle grid dots */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            {job.skills.map((node) =>
              node.requires.map((parentId) => {
                const parent = job.skills.find((s) => s.id === parentId);
                if (!parent) return null;
                const parentUnlocked = (skillRanks[parent.id] ?? 0) >= 1;
                const nodeUnlocked = (skillRanks[node.id] ?? 0) >= 1;
                return (
                  <line
                    key={`${parent.id}-${node.id}`}
                    x1={parent.x}
                    y1={parent.y}
                    x2={node.x}
                    y2={node.y}
                    stroke={nodeUnlocked ? '#6CE59A' : parentUnlocked ? '#F6C75B' : '#4C5873'}
                    strokeWidth={nodeUnlocked ? 1.4 : 0.9}
                    strokeDasharray={parentUnlocked ? undefined : '2 1.5'}
                  />
                );
              })
            )}
          </svg>

          {/* Interactive Skill Nodes */}
          {job.skills.map((node) => {
            const rank = skillRanks[node.id] ?? 0;
            const maxed = rank >= node.maxRank;
            const check = canUnlockSkill(node.id, skillRanks, skillPoints);
            const isSelected = selectedSkill.id === node.id;
            const parentsMet = node.requires.every((r) => (skillRanks[r] ?? 0) >= 1);

            let bg = '#2F384C';
            let borderColor = '#566482';
            if (maxed) {
              bg = '#2F7D4E';
              borderColor = '#7DF2A8';
            } else if (rank > 0) {
              bg = '#375E8C';
              borderColor = '#7AC5FF';
            } else if (check.ok) {
              bg = '#6B5220';
              borderColor = '#FFD466';
            } else if (parentsMet) {
              bg = '#3E475E';
              borderColor = '#93A2C2';
            }

            return (
              <button
                key={node.id}
                onClick={() => {
                  soundManager.playPop(620);
                  setSelectedSkillId(node.id);
                }}
                style={{
                  position: 'absolute',
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: `translate(-50%, -50%) scale(${isSelected ? 1.12 : 1})`,
                  width: 66,
                  height: 66,
                  borderRadius: 16,
                  background: bg,
                  border: `3px solid ${isSelected ? '#FFFFFF' : borderColor}`,
                  boxShadow: check.ok
                    ? '0 0 14px rgba(255, 212, 102, 0.65)'
                    : isSelected
                    ? '0 0 12px rgba(255,255,255,0.6)'
                    : '0 4px 10px rgba(0,0,0,0.35)',
                  color: '#FFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  padding: 2,
                  opacity: parentsMet || rank > 0 ? 1 : 0.55,
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{node.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 800 }}>
                  {rank}/{node.maxRank}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Node Inspector & Unlock Action */}
        <div
          style={{
            background: '#FFFDF7',
            border: '2.5px solid #D5B58A',
            borderRadius: 16,
            padding: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}>{selectedSkill.icon}</span>
              <span style={{ fontSize: 17, fontWeight: 800 }}>{selectedSkill.name}</span>
              <span className="pill-badge" style={{ fontSize: 11 }}>
                ランク {selectedRank} / {selectedSkill.maxRank}
              </span>
              <span className="pill-badge" style={{ fontSize: 11, background: '#FFF3C4' }}>
                必要: {selectedSkill.cost} SP
              </span>
            </div>
            <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>{selectedSkill.description}</div>
            {!unlockCheck.ok && unlockCheck.reason && (
              <div style={{ fontSize: 12, color: '#C84B4B', fontWeight: 700, marginTop: 4 }}>
                ※ {unlockCheck.reason}
              </div>
            )}
          </div>

          <button
            className={unlockCheck.ok ? 'btn-primary' : 'btn-secondary'}
            disabled={!unlockCheck.ok}
            style={{ padding: '12px 20px', fontSize: 15, opacity: unlockCheck.ok ? 1 : 0.6 }}
            onClick={() => {
              soundManager.playChime();
              onUnlockSkill(selectedSkill.id);
            }}
          >
            {selectedRank >= selectedSkill.maxRank
              ? '🌟 マスター済み！'
              : `✨ ${selectedSkill.cost} SP で習得`}
          </button>
        </div>
      </div>
    </div>
  );
}
