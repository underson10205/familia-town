import { useState } from 'react';
import {
  type CharacterData,
  type WorkRecipeDef,
  type WorkResultPayload,
  ALL_SKILLS,
  JOBS,
  getRecipesForJob,
} from '@familia-town/shared';
import { DungeonMinigame } from './minigames/DungeonMinigame';
import { ForgeMinigame } from './minigames/ForgeMinigame';
import { AlchemyMinigame } from './minigames/AlchemyMinigame';
import { FarmMinigame } from './minigames/FarmMinigame';
import { RealtorMinigame } from './minigames/RealtorMinigame';
import { SalonMinigame } from './minigames/SalonMinigame';
import { soundManager } from '../game/audio';

interface WorkModalProps {
  self: CharacterData;
  workResult: WorkResultPayload | null;
  onCompleteWork: (recipeId: string, score: number) => void;
  onEnterDungeon: (recipe: WorkRecipeDef) => void;
  onClearResult: () => void;
  onOpenSkills: () => void;
  onClose: () => void;
}

export function WorkModal({
  self,
  workResult,
  onCompleteWork,
  onEnterDungeon,
  onClearResult,
  onOpenSkills,
  onClose,
}: WorkModalProps) {
  const [activeRecipe, setActiveRecipe] = useState<WorkRecipeDef | null>(null);
  const job = JOBS[self.jobId];
  const recipes = getRecipesForJob(self.jobId);
  const skillRanks = self.skillRanks ?? {};

  // Active assist skills for current job
  const activeAssists = job.skills.filter((s) => (skillRanks[s.id] ?? 0) > 0);

  const handleFinish = (score: number) => {
    if (!activeRecipe) return;
    onCompleteWork(activeRecipe.id, score);
    setActiveRecipe(null);
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
      onClick={() => {
        if (!activeRecipe) onClose();
      }}
    >
      <div
        className="storybook-card"
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, color: job.color }}>
            {job.emoji} {job.name}のお仕事
          </h2>
          {!activeRecipe && (
            <button className="btn-secondary" onClick={onClose}>
              ✕ とじる
            </button>
          )}
        </div>

        {/* Result Screen */}
        {workResult ? (
          <div
            style={{
              background: '#FFF7E6',
              border: '3px solid #E5AA3C',
              borderRadius: 18,
              padding: 18,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 30 }}>
              {'⭐'.repeat(workResult.rank)}
              {'☆'.repeat(3 - workResult.rank)}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {workResult.rank === 3
                ? 'だいせいこう！！'
                : workResult.rank === 2
                ? 'よくできました！'
                : 'おつかれさま！'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>{workResult.recipeName}</div>

            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
              <span className="pill-badge">💰 +{workResult.goldEarned}G</span>
              <span className="pill-badge">✨ けいけんち +{workResult.xpEarned}</span>
              <span className="pill-badge">
                {workResult.itemEmoji} {workResult.itemName} ×{workResult.itemCount}
              </span>
            </div>

            {(workResult.leveledUp || workResult.spEarned > 0) && (
              <div
                style={{
                  background: '#E8F7EA',
                  border: '2px solid #5CB874',
                  borderRadius: 14,
                  padding: 10,
                  fontWeight: 800,
                  color: '#2B6E38',
                }}
              >
                {workResult.leveledUp && <div>🎉 レベルアップ！ Lv.{workResult.newLevel} になったよ！</div>}
                {workResult.spEarned > 0 && <div>💎 スキルポイント +{workResult.spEarned} SP ゲット！</div>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 6 }}>
              <button
                className="btn-green"
                onClick={() => {
                  onClearResult();
                }}
              >
                もう一回お仕事する
              </button>
              {workResult.spEarned > 0 && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    onClearResult();
                    onClose();
                    onOpenSkills();
                  }}
                >
                  🌳 スキルを割り振る！
                </button>
              )}
            </div>
          </div>
        ) : activeRecipe ? (
          /* Active Minigame View */
          <div>
            <div style={{ marginBottom: 10, textAlign: 'center', fontWeight: 800, fontSize: 15 }}>
              {activeRecipe.emoji} {activeRecipe.name}（むずかしさ {'★'.repeat(activeRecipe.tier)}）
            </div>
            {self.jobId === 'adventurer' && (
              <DungeonMinigame tier={activeRecipe.tier} skillRanks={skillRanks} onFinish={handleFinish} />
            )}
            {self.jobId === 'blacksmith' && (
              <ForgeMinigame tier={activeRecipe.tier} skillRanks={skillRanks} onFinish={handleFinish} />
            )}
            {self.jobId === 'apothecary' && (
              <AlchemyMinigame tier={activeRecipe.tier} skillRanks={skillRanks} onFinish={handleFinish} />
            )}
            {self.jobId === 'farmer' && (
              <FarmMinigame tier={activeRecipe.tier} skillRanks={skillRanks} onFinish={handleFinish} />
            )}
            {self.jobId === 'realtor' && (
              <RealtorMinigame tier={activeRecipe.tier} skillRanks={skillRanks} onFinish={handleFinish} />
            )}
            {self.jobId === 'beautician' && (
              <SalonMinigame tier={activeRecipe.tier} skillRanks={skillRanks} onFinish={handleFinish} />
            )}
          </div>
        ) : (
          /* Recipe Picker */
          <>
            {activeAssists.length > 0 && (
              <div
                style={{
                  background: '#EBF9E5',
                  border: '2px solid #74CC82',
                  borderRadius: 12,
                  padding: '8px 12px',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 4 }}>✨ はたらいているスキル補助：</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {activeAssists.map((s) => (
                    <span key={s.id} className="pill-badge" style={{ fontSize: 11 }}>
                      {s.icon} {s.name} Lv.{skillRanks[s.id]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recipes.map((r) => {
                const locked = r.requiredSkillId ? (skillRanks[r.requiredSkillId] ?? 0) < 1 : false;
                const reqName = r.requiredSkillId ? ALL_SKILLS[r.requiredSkillId]?.name : '';
                const hungry = self.hunger < r.hungerCost;
                return (
                  <div
                    key={r.id}
                    style={{
                      background: locked ? '#F3EFEA' : '#FFFDF8',
                      border: `2.5px solid ${locked ? '#C7BFB5' : job.color}`,
                      borderRadius: 14,
                      padding: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      opacity: locked ? 0.72 : 1,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>
                        {r.emoji} {r.name}{' '}
                        <span style={{ fontSize: 12, color: '#D9822B' }}>{'★'.repeat(r.tier)}</span>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>{r.description}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 5, opacity: 0.85 }}>
                        💰 めやす {r.baseGold}G〜 ・ 🍙 おなか -{r.hungerCost}
                      </div>
                      {locked && (
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#C84B4B', marginTop: 4 }}>
                          🔒 スキルツリーで「{reqName}」を解放すると遊べるよ！
                        </div>
                      )}
                    </div>

                    <button
                      className={locked || hungry ? 'btn-secondary' : 'btn-primary'}
                      disabled={locked || hungry}
                      style={{ padding: '10px 16px', fontSize: 14, flexShrink: 0 }}
                      onClick={() => {
                        soundManager.playPop(600);
                        if (self.jobId === 'adventurer') {
                          onEnterDungeon(r);
                        } else {
                          setActiveRecipe(r);
                        }
                      }}
                    >
                      {locked ? '🔒' : hungry ? '🍙おなか不足' : self.jobId === 'adventurer' ? '🌲 入る' : '▶ はじめる'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
