import { useState } from 'react';
import {
  type Appearance,
  type Gender,
  type JobId,
  ACCESSORY_NAMES,
  EYE_COLORS,
  EYE_SHAPE_NAMES,
  HAIR_COLORS,
  HAIR_STYLE_NAMES,
  JOB_LIST,
  OUTFIT_COLORS,
  OUTFIT_NAMES,
  SKIN_COLORS,
  randomAppearance,
} from '@familia-town/shared';
import { ChibiPreview } from './ChibiPreview';
import { soundManager } from '../game/audio';

interface CharacterCreatorProps {
  onBack: () => void;
  onSubmit: (name: string, gender: Gender, jobId: JobId, appearance: Appearance) => void;
}

export function CharacterCreator({ onBack, onSubmit }: CharacterCreatorProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [jobId, setJobId] = useState<JobId>('adventurer');
  const [appearance, setAppearance] = useState<Appearance>(() => randomAppearance('female'));

  const handleGenderChange = (g: Gender) => {
    soundManager.playPop(540);
    setGender(g);
    setAppearance(randomAppearance(g));
  };

  const handleRandomize = () => {
    soundManager.playPop(660);
    setAppearance(randomAppearance(gender));
  };

  const selectedJob = JOB_LIST.find((j) => j.id === jobId)!;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '18px 14px 36px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div className="storybook-card" style={{ width: '100%', maxWidth: 880, padding: 20, height: 'fit-content' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>✨ あたらしい住人をつくろう！</h2>
          <button className="btn-secondary" onClick={onBack}>
            ← もどる
          </button>
        </div>

        {/* Sticky Live Character Preview (always visible while scrolling!) */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'linear-gradient(180deg, #e5f5d8 0%, #f9f3df 100%)',
            border: '2.5px solid #c9a675',
            borderRadius: 16,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            boxShadow: '0 6px 16px rgba(74, 53, 37, 0.14)',
          }}
        >
          <ChibiPreview appearance={appearance} size={118} scale={1.75} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {name.trim() || 'なまえ未入力'}（{gender === 'female' ? '👧 女の子' : '👦 男の子'}）
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: selectedJob.color }}>
              {selectedJob.emoji} {selectedJob.name}
            </div>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={handleRandomize}>
              🎲 おまかせチェンジ
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 20,
          }}
        >
          {/* Left: Basic Info & Appearance Parts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <label style={{ fontWeight: 800, display: 'block', marginBottom: 6 }}>おなまえ（12文字まで）</label>
              <input
                type="text"
                maxLength={12}
                placeholder="例：はなちゃん、ゆうた"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 16,
                  borderRadius: 12,
                  border: '2px solid #c7a67b',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 800, display: 'block', marginBottom: 6 }}>せいべつ</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleGenderChange('female')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 12,
                    fontWeight: 800,
                    background: gender === 'female' ? '#FDE2EC' : '#FFF',
                    border: gender === 'female' ? '3px solid #E86B99' : '2px solid #D5C2A5',
                  }}
                >
                  👧 女の子
                </button>
                <button
                  onClick={() => handleGenderChange('male')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 12,
                    fontWeight: 800,
                    background: gender === 'male' ? '#E1F0FF' : '#FFF',
                    border: gender === 'male' ? '3px solid #5A9BD5' : '2px solid #D5C2A5',
                  }}
                >
                  👦 男の子
                </button>
              </div>
              <p style={{ fontSize: 12, opacity: 0.78, margin: '6px 0 0' }}>
                ※ 町の異性のNPCと仲良くなると結婚＆子育てができるよ！
              </p>
            </div>

            {/* Appearance Parts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ColorRow
                label="はだの色"
                colors={SKIN_COLORS}
                value={appearance.skinColor}
                onChange={(c) => setAppearance({ ...appearance, skinColor: c })}
              />
              <CycleRow
                label="かみ型"
                valueName={HAIR_STYLE_NAMES[appearance.hairStyle]}
                onPrev={() =>
                  setAppearance({
                    ...appearance,
                    hairStyle: (appearance.hairStyle + HAIR_STYLE_NAMES.length - 1) % HAIR_STYLE_NAMES.length,
                  })
                }
                onNext={() =>
                  setAppearance({ ...appearance, hairStyle: (appearance.hairStyle + 1) % HAIR_STYLE_NAMES.length })
                }
              />
              <ColorRow
                label="かみの色"
                colors={HAIR_COLORS}
                value={appearance.hairColor}
                onChange={(c) => setAppearance({ ...appearance, hairColor: c })}
              />
              <CycleRow
                label="目の形"
                valueName={EYE_SHAPE_NAMES[appearance.eyeShape]}
                onPrev={() =>
                  setAppearance({
                    ...appearance,
                    eyeShape: (appearance.eyeShape + EYE_SHAPE_NAMES.length - 1) % EYE_SHAPE_NAMES.length,
                  })
                }
                onNext={() =>
                  setAppearance({ ...appearance, eyeShape: (appearance.eyeShape + 1) % EYE_SHAPE_NAMES.length })
                }
              />
              <ColorRow
                label="目の色"
                colors={EYE_COLORS}
                value={appearance.eyeColor}
                onChange={(c) => setAppearance({ ...appearance, eyeColor: c })}
              />
              <CycleRow
                label="お洋服"
                valueName={OUTFIT_NAMES[appearance.outfitId]}
                onPrev={() =>
                  setAppearance({
                    ...appearance,
                    outfitId: (appearance.outfitId + OUTFIT_NAMES.length - 1) % OUTFIT_NAMES.length,
                  })
                }
                onNext={() =>
                  setAppearance({ ...appearance, outfitId: (appearance.outfitId + 1) % OUTFIT_NAMES.length })
                }
              />
              <ColorRow
                label="服の色"
                colors={OUTFIT_COLORS}
                value={appearance.outfitColor}
                onChange={(c) => setAppearance({ ...appearance, outfitColor: c })}
              />
              <CycleRow
                label="アクセサリー"
                valueName={ACCESSORY_NAMES[appearance.accessoryId]}
                onPrev={() =>
                  setAppearance({
                    ...appearance,
                    accessoryId: (appearance.accessoryId + ACCESSORY_NAMES.length - 1) % ACCESSORY_NAMES.length,
                  })
                }
                onNext={() =>
                  setAppearance({
                    ...appearance,
                    accessoryId: (appearance.accessoryId + 1) % ACCESSORY_NAMES.length,
                  })
                }
              />
            </div>
          </div>

          {/* Right: Job Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>💼 はじめの職業をえらぼう（いつでも転職OK！）</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {JOB_LIST.map((job) => {
                const active = job.id === jobId;
                return (
                  <button
                    key={job.id}
                    onClick={() => {
                      soundManager.playPop(560);
                      setJobId(job.id);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      borderRadius: 14,
                      background: active ? job.accentColor : '#FFFDF8',
                      border: active ? `3px solid ${job.color}` : '2px solid #DECBB0',
                    }}
                  >
                    <div style={{ fontSize: 17, fontWeight: 800 }}>
                      {job.emoji} {job.name}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85, lineHeight: 1.35 }}>
                      {job.shortDesc}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                background: '#FFF7E6',
                border: '2px dashed #D6A667',
                borderRadius: 14,
                padding: 14,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                🎁 スタート時にもらえるもの
              </div>
              <div>・🏠 小さなマイホーム（家賃やすめ）</div>
              <div>・💰 はじめの所持金 500G ＆ 🍙 おにぎり × 3</div>
              <div>・🏪 職業特典：{selectedJob.starterFacility}</div>
            </div>

            <button
              className="btn-primary"
              style={{ marginTop: 'auto', padding: '15px 24px', fontSize: 18 }}
              disabled={!name.trim()}
              onClick={() => onSubmit(name.trim(), gender, jobId, appearance)}
            >
              🌟 この子でファミリアタウンへ出発！
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorRow({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: string[];
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 74 }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: c,
              border: value === c ? '3px solid #4A3525' : '2px solid #D5C2A5',
              transform: value === c ? 'scale(1.15)' : 'none',
            }}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  );
}

function CycleRow({
  label,
  valueName,
  onPrev,
  onNext,
}: {
  label: string;
  valueName: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 74 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn-secondary" style={{ padding: '4px 10px' }} onClick={onPrev}>
          ◀
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 118, textAlign: 'center' }}>{valueName}</span>
        <button className="btn-secondary" style={{ padding: '4px 10px' }} onClick={onNext}>
          ▶
        </button>
      </div>
    </div>
  );
}
