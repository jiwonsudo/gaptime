import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import RoomCreate from './components/RoomCreate';
import RoomJoin from './components/RoomJoin';
import PrivacyPolicy from './components/PrivacyPolicy';
import { hasSeenTutorial, markTutorialSeen } from './lib/roomAuth';
import { track, trackPage } from './lib/analytics';

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPage(location.pathname);
  }, [location.pathname]);
  return null;
}

export default function App() {
  const [tour, setTour] = useState(() => !hasSeenTutorial());

  function closeTour() {
    const wasFirstTime = !hasSeenTutorial();
    markTutorialSeen();
    setTour(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (wasFirstTime) track('tutorial_completed');
  }
  function openTour() {
    setTour(true);
    track('tutorial_opened');
  }

  return (
    <>
      <RouteTracker />
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
    </>
  );
}
