import { useState } from 'react';
import { type CharacterData, type Gender, type NpcData, JOBS } from '@familia-town/shared';
import { ChibiPreview } from './ChibiPreview';
import { soundManager } from '../game/audio';

const HOME_TIERS = [
  { level: 1, name: '小さなマイホーム', emoji: '🏠', nextCost: 600, desc: 'スタート時のこぢんまりしたあたたかいおうち' },
  { level: 2, name: 'あったかファミリーハウス', emoji: '🏡', nextCost: 1500, desc: '家族みんなでゆったり暮らせる2階建てのおうち' },
  { level: 3, name: 'お庭つき豪邸', emoji: '🏘️', nextCost: 3000, desc: 'お花いっぱいのお庭があるすてきな豪邸' },
  { level: 4, name: 'ファミリアお城ハウス', emoji: '🏰', nextCost: null, desc: '町のシンボル！夢の最高ランクお城ハウス' },
];

interface FamilyModalProps {
  self: CharacterData;
  npcs: NpcData[];
  onHaveChild: (name: string, gender: Gender) => void;
  onPassGeneration: (childId: string) => void;
  onUpgradeHome: () => void;
  onPayRent: () => void;
  onClose: () => void;
}

export function FamilyModal({
  self,
  npcs,
  onHaveChild,
  onPassGeneration,
  onUpgradeHome,
  onPayRent,
  onClose,
}: FamilyModalProps) {
  const [tab, setTab] = useState<'family' | 'lineage' | 'home'>('family');
  const [childName, setChildName] = useState('');
  const [childGender, setChildGender] = useState<Gender>('female');
  const [confirmChildId, setConfirmChildId] = useState<string | null>(null);

  const spouse = self.spouseNpcId ? npcs.find((n) => n.id === self.spouseNpcId) ?? null : null;
  const children = self.children ?? [];
  const lineage = self.lineageHistory ?? [];
  const homeTier = HOME_TIERS.find((h) => h.level === self.homeLevel) ?? HOME_TIERS[0];
  const rentCutRank = self.skillRanks?.['rel_rent_cut'] ?? 0;
  const weeklyRent = Math.max(15, Math.round(self.homeLevel * 40 * (1 - rentCutRank * 0.12)));

  const handleCreateChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim()) return;
    soundManager.playChime();
    onHaveChild(childName.trim(), childGender);
    setChildName('');
  };

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
        zIndex: 35,
      }}
      onClick={onClose}
    >
      <div
        className="storybook-card"
        style={{
          width: '100%',
          maxWidth: 660,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>👨‍👩‍👧‍👦 家族・家系図・マイホーム</h2>
          <button className="btn-secondary" onClick={onClose}>
            ✕ とじる
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={tab === 'family' ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
            onClick={() => setTab('family')}
          >
            💑 家族・世代交代
          </button>
          <button
            className={tab === 'lineage' ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
            onClick={() => setTab('lineage')}
          >
            📖 家系図 ({lineage.length + 1}代)
          </button>
          <button
            className={tab === 'home' ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
            onClick={() => setTab('home')}
          >
            🏡 マイホーム
          </button>
        </div>

        {tab === 'family' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Current Parents Row */}
            <div
              style={{
                background: '#FFF7E6',
                border: '2px solid #D6A667',
                borderRadius: 16,
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <ChibiPreview appearance={self.appearance} size={96} scale={1.45} />
                <div style={{ fontWeight: 800, fontSize: 14 }}>{self.name}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  {self.generation}代目 ・ {self.age}さい
                </div>
              </div>

              <div style={{ fontSize: 26 }}>{spouse ? '💖' : '💭'}</div>

              {spouse ? (
                <div style={{ textAlign: 'center' }}>
                  <ChibiPreview appearance={spouse.appearance} size={96} scale={1.45} />
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{spouse.name}</div>
                  <div style={{ fontSize: 11, color: '#C43E6E', fontWeight: 700 }}>💍 パートナー</div>
                </div>
              ) : (
                <div style={{ maxWidth: 240, fontSize: 13, lineHeight: 1.55 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>まだ独身だよ！</div>
                  <div>
                    町にいる<strong>異性のNPC（♡マーク付き）</strong>とお話したりお花を贈って、なかよし度<strong>60以上</strong>になるとプロポーズできるよ！
                  </div>
                </div>
              )}
            </div>

            {/* Welcome a Child Form */}
            {spouse && children.length < 3 && (
              <form
                onSubmit={handleCreateChild}
                style={{
                  background: '#FDECF2',
                  border: '2px dashed #EC6B99',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 15 }}>👶 子供をむかえる（両親の容姿が遺伝するよ！）</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="子供のおなまえ"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 150,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '2px solid #EC6B99',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setChildGender('female')}
                    className="btn-secondary"
                    style={{
                      background: childGender === 'female' ? '#FAD1E2' : '#FFF',
                      borderColor: childGender === 'female' ? '#EC6B99' : '#D5C2A5',
                    }}
                  >
                    👧 女の子
                  </button>
                  <button
                    type="button"
                    onClick={() => setChildGender('male')}
                    className="btn-secondary"
                    style={{
                      background: childGender === 'male' ? '#D6ECFF' : '#FFF',
                      borderColor: childGender === 'male' ? '#5A9BD5' : '#D5C2A5',
                    }}
                  >
                    👦 男の子
                  </button>
                  <button type="submit" className="btn-primary" disabled={!childName.trim()} style={{ padding: '8px 18px' }}>
                    🍼 むかえる！
                  </button>
                </div>
              </form>
            )}

            {/* Children List & Pass Generation */}
            {children.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>🌱 わが子たち（世代交代で操作キャラを引き継げるよ）</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {children.map((ch) => (
                    <div
                      key={ch.id}
                      style={{
                        background: '#FFFDF8',
                        border: '2.5px solid #74CC82',
                        borderRadius: 16,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <ChibiPreview appearance={ch.appearance} size={96} scale={1.45} />
                      <div style={{ fontWeight: 800, fontSize: 16 }}>
                        {ch.name}（{ch.gender === 'female' ? '👧' : '👦'} {ch.age}さい）
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>
                        両親：{ch.parentNames[0]} ＆ {ch.parentNames[1]}
                      </div>

                      {confirmChildId === ch.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', marginTop: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#B84A39', textAlign: 'center' }}>
                            スキル・お金・おうちを引き継ぎ、{self.name}はご隠居NPCになるよ！
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn-primary"
                              style={{ flex: 1, fontSize: 12, padding: '7px 10px' }}
                              onClick={() => {
                                soundManager.playChime();
                                onPassGeneration(ch.id);
                                setConfirmChildId(null);
                                onClose();
                              }}
                            >
                              🌸 引き継ぐ！
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 12, padding: '7px 10px' }}
                              onClick={() => setConfirmChildId(null)}
                            >
                              やめる
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn-green"
                          style={{ width: '100%', fontSize: 12, padding: '8px 10px', marginTop: 4 }}
                          onClick={() => setConfirmChildId(ch.id)}
                        >
                          🌸 この子に世代を託す（+2 SP）
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'lineage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              歴代の家族の思い出アルバムだよ！引退したご先祖さまは「ご隠居NPC」として町を歩いているよ。
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 10 }}>
              {/* Current Generation */}
              <div
                style={{
                  background: '#FFF7E6',
                  border: '3px solid #E5AA3C',
                  borderRadius: 16,
                  padding: 12,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: '#B87B1E' }}>⭐ いまの操作キャラ</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ChibiPreview appearance={self.appearance} size={86} scale={1.3} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{self.name}</div>
                <div style={{ fontSize: 12 }}>
                  {self.generation}代目 ・ {JOBS[self.jobId].emoji} {JOBS[self.jobId].name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{self.age}さい</div>
              </div>

              {[...lineage].reverse().map((entry) => (
                <div
                  key={`${entry.generation}-${entry.name}`}
                  style={{
                    background: '#FFFDF8',
                    border: '2px solid #DECBB0',
                    borderRadius: 16,
                    padding: 12,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.7 }}>{entry.generation}代目・ご隠居</div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ChibiPreview appearance={entry.appearance} size={86} scale={1.3} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{entry.name}</div>
                  <div style={{ fontSize: 12 }}>
                    {JOBS[entry.jobId].emoji} {JOBS[entry.jobId].name}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    引退時 {entry.retiredAge}さい {entry.spouseName ? `/ 💑${entry.spouseName}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                background: '#FFF7E6',
                border: '2.5px solid #D6A667',
                borderRadius: 16,
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {homeTier.emoji} {homeTier.name}（Lv.{self.homeLevel}）
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{homeTier.desc}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                  📅 季節ごとの家賃：<strong>{weeklyRent}G</strong>
                  {rentCutRank > 0 && <span style={{ color: '#2E86AB' }}>（不動産スキルで割引中！）</span>}
                </div>
              </div>

              {homeTier.nextCost ? (
                <button
                  className="btn-primary"
                  disabled={self.money < homeTier.nextCost}
                  onClick={() => {
                    soundManager.playChime();
                    onUpgradeHome();
                  }}
                >
                  🔨 増築・リフォーム ({homeTier.nextCost}G)
                </button>
              ) : (
                <span className="pill-badge" style={{ background: '#E8F7EA', borderColor: '#5CB874' }}>
                  👑 最高ランク達成！
                </span>
              )}
            </div>

            {self.rentDue > 0 && (
              <div
                style={{
                  background: '#FDE8E8',
                  border: '2px solid #D9534F',
                  borderRadius: 14,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  💌 未払いの家賃が <strong>{self.rentDue}G</strong> あるよ（追い出されないからゆっくり返してね！）
                </div>
                <button className="btn-green" style={{ fontSize: 12 }} onClick={onPayRent}>
                  💰 家賃をはらう
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
