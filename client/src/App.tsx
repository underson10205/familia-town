import { useCallback, useRef, useState } from 'react';
import { type NpcData, type WorkRecipeDef, getRecipesForJob } from '@familia-town/shared';
import { useGameSocket } from './net/useGameSocket';
import { LoginScreen } from './components/LoginScreen';
import { CharacterCreator } from './components/CharacterCreator';
import { TownCanvas } from './components/TownCanvas';
import { DungeonCanvas } from './components/DungeonCanvas';
import { HUD } from './components/HUD';
import { JobInfoModal } from './components/JobInfoModal';
import { NpcDialogModal } from './components/NpcDialogModal';
import { WorkModal } from './components/WorkModal';
import { MarketModal } from './components/MarketModal';
import { FamilyModal } from './components/FamilyModal';

export function App() {
  const {
    connected,
    error,
    characters,
    clock,
    self,
    playersRef,
    npcsRef,
    chatHistory,
    npcDialog,
    setNpcDialog,
    errands,
    workResult,
    setWorkResult,
    familyEvent,
    setFamilyEvent,
    createCharacter,
    loginCharacter,
    sendMove,
    sendChat,
    sendStamp,
    changeJob,
    unlockSkill,
    interactNpc,
    eatSnack,
    completeWork,
    buyItem,
    sellItem,
    postErrand,
    fulfillErrand,
    giftNpc,
    proposeNpc,
    haveChild,
    passGeneration,
    upgradeHome,
    payRent,
  } = useGameSocket();

  const [creating, setCreating] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const [showWork, setShowWork] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [nearbyNpc, setNearbyNpc] = useState<NpcData | null>(null);
  const [nearDungeonGate, setNearDungeonGate] = useState(false);
  const [activeDungeonRecipe, setActiveDungeonRecipe] = useState<WorkRecipeDef | null>(null);
  const joystickRef = useRef({ dx: 0, dy: 0 });

  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    joystickRef.current.dx = dx;
    joystickRef.current.dy = dy;
  }, []);

  const handleEnterDungeonGate = useCallback(() => {
    if (!self) return;
    if (self.jobId === 'adventurer') {
      setWorkResult(null);
      setShowWork(true);
    } else {
      const advTier1 = getRecipesForJob('adventurer')[0];
      if (advTier1) {
        changeJob('adventurer');
        setActiveDungeonRecipe(advTier1);
      }
    }
  }, [changeJob, self, setWorkResult]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {error && (
        <div
          style={{
            position: 'fixed',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#D9534F',
            color: '#FFF',
            padding: '10px 20px',
            borderRadius: 999,
            fontWeight: 800,
            zIndex: 100,
            boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {familyEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(35, 25, 18, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 90,
          }}
          onClick={() => setFamilyEvent(null)}
        >
          <div
            className="storybook-card"
            style={{
              maxWidth: 440,
              width: '100%',
              padding: 24,
              textAlign: 'center',
              background: '#FFF9EC',
              borderColor: '#E5AA3C',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 6 }}>{familyEvent.emoji}</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 21, color: '#8C4A22' }}>{familyEvent.title}</h2>
            <p style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700, lineHeight: 1.6 }}>
              {familyEvent.message}
            </p>
            <button className="btn-primary" onClick={() => setFamilyEvent(null)}>
              ✨ やったね！
            </button>
          </div>
        </div>
      )}

      {!self ? (
        creating ? (
          <CharacterCreator
            onBack={() => setCreating(false)}
            onSubmit={(name, gender, jobId, appearance) => {
              createCharacter(name, gender, jobId, appearance);
            }}
          />
        ) : (
          <LoginScreen
            connected={connected}
            characters={characters}
            clock={clock}
            onSelectCharacter={loginCharacter}
            onCreateNew={() => setCreating(true)}
          />
        )
      ) : activeDungeonRecipe ? (
        <DungeonCanvas
          self={self}
          recipe={activeDungeonRecipe}
          onExit={(score) => {
            const finishedRecipe = activeDungeonRecipe;
            setActiveDungeonRecipe(null);
            completeWork(finishedRecipe.id, score);
            setShowWork(true);
          }}
        />
      ) : (
        clock && (
          <>
            <TownCanvas
              self={self}
              clock={clock}
              playersRef={playersRef}
              npcsRef={npcsRef}
              joystickRef={joystickRef}
              onSendMove={sendMove}
              onNearbyNpcChange={setNearbyNpc}
              onInteractNpc={interactNpc}
              onNearDungeonGateChange={setNearDungeonGate}
              onEnterDungeonGate={handleEnterDungeonGate}
            />
            <HUD
              self={self}
              clock={clock}
              chatHistory={chatHistory}
              nearbyNpcName={nearbyNpc?.name ?? null}
              nearDungeonGate={nearDungeonGate}
              onSendChat={sendChat}
              onSendStamp={sendStamp}
              onOpenWork={() => {
                setWorkResult(null);
                setShowWork(true);
              }}
              onOpenMarket={() => setShowMarket(true)}
              onOpenFamily={() => setShowFamily(true)}
              onOpenJobs={() => setShowJobs(true)}
              onEatSnack={() => eatSnack('onigiri')}
              onInteractNearby={() => nearbyNpc && interactNpc(nearbyNpc.id)}
              onEnterDungeonGate={handleEnterDungeonGate}
              onJoystickMove={handleJoystickMove}
            />
            {showWork && (
              <WorkModal
                self={self}
                workResult={workResult}
                onCompleteWork={completeWork}
                onEnterDungeon={(recipe) => {
                  setShowWork(false);
                  setActiveDungeonRecipe(recipe);
                }}
                onClearResult={() => setWorkResult(null)}
                onOpenSkills={() => setShowJobs(true)}
                onClose={() => {
                  setWorkResult(null);
                  setShowWork(false);
                }}
              />
            )}
            {showMarket && (
              <MarketModal
                self={self}
                errands={errands}
                onBuyItem={buyItem}
                onSellItem={sellItem}
                onEatItem={(itemId) => eatSnack(itemId)}
                onPostErrand={postErrand}
                onFulfillErrand={fulfillErrand}
                onClose={() => setShowMarket(false)}
              />
            )}
            {showFamily && (
              <FamilyModal
                self={self}
                npcs={Array.from(npcsRef.current.values())}
                onHaveChild={haveChild}
                onPassGeneration={passGeneration}
                onUpgradeHome={upgradeHome}
                onPayRent={payRent}
                onClose={() => setShowFamily(false)}
              />
            )}
            {showJobs && (
              <JobInfoModal
                self={self}
                onChangeJob={(jobId) => {
                  changeJob(jobId);
                }}
                onUnlockSkill={unlockSkill}
                onClose={() => setShowJobs(false)}
              />
            )}
            {npcDialog && (
              <NpcDialogModal
                self={self}
                dialog={npcDialog}
                onGiftNpc={giftNpc}
                onProposeNpc={proposeNpc}
                onClose={() => setNpcDialog(null)}
                onOpenJobs={() => setShowJobs(true)}
              />
            )}
          </>
        )
      )}
    </div>
  );
}
