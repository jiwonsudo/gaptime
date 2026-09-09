import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RoomCreate from './components/RoomCreate';
import RoomJoin from './components/RoomJoin';
import PrivacyPolicy from './components/PrivacyPolicy';
import { hasSeenTutorial, markTutorialSeen } from './lib/roomAuth';

export default function App() {
  const [tour, setTour] = useState(() => !hasSeenTutorial());

  function closeTour() {
    markTutorialSeen();
    setTour(false);
  }
  const openTour = () => setTour(true);

  return (
    <Routes>
      <Route path="/" element={<RoomCreate tour={tour} onOpenTour={openTour} onCloseTour={closeTour} />} />
      <Route
        path="/r/:roomId"
        element={<RoomJoin tour={tour} onOpenTour={openTour} onCloseTour={closeTour} />}
      />
      <Route
        path="/r/:roomId/:slug"
        element={<RoomJoin tour={tour} onOpenTour={openTour} onCloseTour={closeTour} />}
      />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
