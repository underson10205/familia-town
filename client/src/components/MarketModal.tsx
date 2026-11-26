import { useState } from 'react';
import {
  type CharacterData,
  type ErrandPost,
  ITEMS,
  SHOP_ITEM_IDS,
} from '@familia-town/shared';
import { soundManager } from '../game/audio';

interface MarketModalProps {
  self: CharacterData;
  errands: ErrandPost[];
  onBuyItem: (itemId: string, count: number) => void;
  onSellItem: (itemId: string, count: number) => void;
  onEatItem: (itemId: string) => void;
  onPostErrand: (itemId: string, count: number, rewardGold: number, note: string) => void;
  onFulfillErrand: (errandId: string) => void;
  onClose: () => void;
}

const POSTABLE_ITEMS = ['iron_ore', 'silver_ore', 'slime_gel', 'herb', 'carrot', 'milk', 'iron_sword', 'heal_potion'];

export function MarketModal({
  self,
  errands,
  onBuyItem,
  onSellItem,
  onEatItem,
  onPostErrand,
  onFulfillErrand,
  onClose,
}: MarketModalProps) {
  const [tab, setTab] = useState<'shop' | 'bag' | 'errands'>('shop');
  const [postItemId, setPostItemId] = useState('iron_ore');
  const [postCount, setPostCount] = useState(2);
  const [postReward, setPostReward] = useState(120);
  const [postNote, setPostNote] = useState('');

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    onPostErrand(postItemId, postCount, postReward, postNote);
    setPostNote('');
    soundManager.playChime();
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
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>🏪 お店・もちもの・おつかい掲示板</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pill-badge">💰 {self.money}G</span>
            <button className="btn-secondary" onClick={onClose}>
              ✕ とじる
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={tab === 'shop' ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
            onClick={() => setTab('shop')}
          >
            🍙 食料を買う
          </button>
          <button
            className={tab === 'bag' ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
            onClick={() => setTab('bag')}
          >
            🎒 もちもの ({self.inventory.length})
          </button>
          <button
            className={tab === 'errands' ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
            onClick={() => setTab('errands')}
          >
            📋 おつかい ({errands.length})
          </button>
        </div>

        {tab === 'shop' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              農家NPCのお店だよ！おなかが減ったらここで食料を買おう。
            </div>
            {SHOP_ITEM_IDS.map((id) => {
              const item = ITEMS[id];
              return (
                <div
                  key={id}
                  style={{
                    background: '#FFFDF8',
                    border: '2px solid #DECBB0',
                    borderRadius: 14,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>
                      {item.emoji} {item.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      おなか +{item.hungerRestore} ・ {item.buyPrice}G
                    </div>
                  </div>
                  <button
                    className="btn-green"
                    disabled={self.money < (item.buyPrice ?? 9999)}
                    style={{ fontSize: 13, padding: '7px 14px' }}
                    onClick={() => {
                      soundManager.playPop(640);
                      onBuyItem(id, 1);
                    }}
                  >
                    買う ({item.buyPrice}G)
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'bag' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {self.inventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, opacity: 0.7 }}>
                もちものはまだ空っぽだよ！お仕事をして集めよう。
              </div>
            ) : (
              self.inventory.map((inv) => {
                const def = ITEMS[inv.itemId];
                const canEat = Boolean(def?.hungerRestore || def?.staminaRestore);
                return (
                  <div
                    key={inv.itemId}
                    style={{
                      background: '#FFFDF8',
                      border: '2px solid #DECBB0',
                      borderRadius: 14,
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>
                        {inv.emoji} {inv.name} × {inv.count}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        売値: {def?.sellPrice ?? 10}G
                        {canEat ? ` ・ たべるとおなか+${def?.hungerRestore ?? 0}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canEat && (
                        <button
                          className="btn-green"
                          style={{ fontSize: 12, padding: '6px 12px' }}
                          onClick={() => onEatItem(inv.itemId)}
                        >
                          🍙 たべる
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => {
                          soundManager.playPop(700);
                          onSellItem(inv.itemId, 1);
                        }}
                      >
                        💰 1個売る
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'errands' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              💡 町の住民や家族のおつかいを納品すると、報酬ゴールドと <strong>💎 +1 SP</strong> がもらえるよ！
            </div>

            {errands.map((er) => {
              const itemDef = ITEMS[er.itemId];
              const owned = self.inventory.find((i) => i.itemId === er.itemId)?.count ?? 0;
              const isMine = er.posterId === self.id;
              const canFulfill = !isMine && owned >= er.count;
              return (
                <div
                  key={er.id}
                  style={{
                    background: er.isNpc ? '#FFFDF8' : '#EBF5FF',
                    border: `2px solid ${er.isNpc ? '#DECBB0' : '#7BAFD4'}`,
                    borderRadius: 14,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                      {er.isNpc ? '🏠' : '👥'} {er.posterName} のおねがい
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                      ほしいもの：{itemDef?.emoji} {itemDef?.name} × {er.count}（もちもの: {owned}）
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>「{er.note}」</div>
                  </div>
                  <button
                    className={canFulfill ? 'btn-primary' : 'btn-secondary'}
                    disabled={!canFulfill}
                    style={{ fontSize: 12, padding: '8px 12px', flexShrink: 0 }}
                    onClick={() => {
                      soundManager.playChime();
                      onFulfillErrand(er.id);
                    }}
                  >
                    {isMine ? '自分の依頼' : `納品 (${er.rewardGold}G +1SP)`}
                  </button>
                </div>
              );
            })}

            {/* Post a new errand for family/friends */}
            <form
              onSubmit={handlePost}
              style={{
                background: '#FFF7E6',
                border: '2px dashed #D6A667',
                borderRadius: 14,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 14 }}>📝 みんなにおつかいをたのむ</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <select
                  value={postItemId}
                  onChange={(e) => setPostItemId(e.target.value)}
                  style={{ padding: 6, borderRadius: 8, border: '1.5px solid #C7A67B', fontFamily: 'inherit' }}
                >
                  {POSTABLE_ITEMS.map((id) => (
                    <option key={id} value={id}>
                      {ITEMS[id].emoji} {ITEMS[id].name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={postCount}
                  onChange={(e) => setPostCount(Number(e.target.value))}
                  style={{ width: 58, padding: 6, borderRadius: 8, border: '1.5px solid #C7A67B' }}
                />
                <span style={{ alignSelf: 'center', fontSize: 12, fontWeight: 700 }}>個 / 報酬</span>
                <input
                  type="number"
                  min={30}
                  max={2000}
                  step={10}
                  value={postReward}
                  onChange={(e) => setPostReward(Number(e.target.value))}
                  style={{ width: 76, padding: 6, borderRadius: 8, border: '1.5px solid #C7A67B' }}
                />
                <span style={{ alignSelf: 'center', fontSize: 12, fontWeight: 700 }}>G</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="ひとことメモ（例：武器づくりにほしい！）"
                  value={postNote}
                  onChange={(e) => setPostNote(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #C7A67B', fontFamily: 'inherit' }}
                />
                <button type="submit" className="btn-green" style={{ fontSize: 12, padding: '6px 14px' }}>
                  掲示板に出す
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
