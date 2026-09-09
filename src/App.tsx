import { Routes, Route, Navigate } from 'react-router-dom';
import RoomCreate from './components/RoomCreate';
import RoomJoin from './components/RoomJoin';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoomCreate />} />
      <Route path="/r/:roomId" element={<RoomJoin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
