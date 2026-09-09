import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RoomCreate from './components/RoomCreate';
import RoomJoin from './components/RoomJoin';
import TutorialModal from './components/TutorialModal';
import { hasSeenTutorial, markTutorialSeen } from './lib/roomAuth';

export default function App() {
  const [tutorial, setTutorial] = useState(() => !hasSeenTutorial());

  function closeTutorial() {
    markTutorialSeen();
    setTutorial(false);
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<RoomCreate onOpenTutorial={() => setTutorial(true)} />} />
        <Route path="/r/:roomId" element={<RoomJoin onOpenTutorial={() => setTutorial(true)} />} />
        <Route
          path="/r/:roomId/:slug"
          element={<RoomJoin onOpenTutorial={() => setTutorial(true)} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TutorialModal open={tutorial} onClose={closeTutorial} />
    </>
  );
}
