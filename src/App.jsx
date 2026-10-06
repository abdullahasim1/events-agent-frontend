import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
