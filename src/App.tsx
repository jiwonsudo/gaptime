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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const openTour = () => setTour(true);

  return (
    <Routes>
      <Route path="/" element={<RoomCreate tour={tour} onOpenTour={openTour} onCloseTour={closeTour} />} />
      <Route
        path="/room/:roomId"
        element={<RoomJoin tour={tour} onOpenTour={openTour} onCloseTour={closeTour} />}
      />
      <Route
        path="/room/:roomId/:slug"
        element={<RoomJoin tour={tour} onOpenTour={openTour} onCloseTour={closeTour} />}
      />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
