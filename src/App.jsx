import { Routes, Route, Navigate } from 'react-router';
import Display from './routes/Display.jsx';
import Upload from './routes/Upload.jsx';
import Admin from './routes/Admin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Display />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
