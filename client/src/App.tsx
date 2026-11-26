import { useCallback, useRef, useState } from 'react';
import type { NpcData } from '@familia-town/shared';
import { useGameSocket } from './net/useGameSocket';
import { LoginScreen } from './components/LoginScreen';
import { CharacterCreator } from './components/CharacterCreator';
import { TownCanvas } from './components/TownCanvas';
import { HUD } from './components/HUD';
import { JobInfoModal } from './components/JobInfoModal';
import { NpcDialogModal } from './components/NpcDialogModal';

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
    createCharacter,
    loginCharacter,
    sendMove,
    sendChat,
    sendStamp,
    changeJob,
    interactNpc,
    eatSnack,
  } = useGameSocket();

  const [creating, setCreating] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const [nearbyNpc, setNearbyNpc] = useState<NpcData | null>(null);
  const joystickRef = useRef({ dx: 0, dy: 0 });

  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    joystickRef.current.dx = dx;
    joystickRef.current.dy = dy;
  }, []);

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
            />
            <HUD
              self={self}
              clock={clock}
              chatHistory={chatHistory}
              nearbyNpcName={nearbyNpc?.name ?? null}
              onSendChat={sendChat}
              onSendStamp={sendStamp}
              onOpenJobs={() => setShowJobs(true)}
              onEatSnack={eatSnack}
              onInteractNearby={() => nearbyNpc && interactNpc(nearbyNpc.id)}
              onJoystickMove={handleJoystickMove}
            />
            {showJobs && (
              <JobInfoModal
                self={self}
                onChangeJob={(jobId) => {
                  changeJob(jobId);
                  setShowJobs(false);
                }}
                onClose={() => setShowJobs(false)}
              />
            )}
            {npcDialog && (
              <NpcDialogModal
                dialog={npcDialog}
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
