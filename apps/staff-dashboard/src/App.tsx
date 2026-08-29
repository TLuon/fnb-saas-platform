import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import MenuManagement from './pages/MenuManagement';
import StaffManagement from './pages/StaffManagement';
import Analytics from './pages/Analytics';
import CDP from './pages/CDP';
import SupportBoard from './pages/SupportBoard';
import SupportTickets from './pages/SupportTickets';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/analytics" replace />} />
          <Route path="menu-management" element={<MenuManagement />} />
          <Route path="staff-management" element={<StaffManagement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="cdp" element={<CDP />} />
          <Route path="support/board" element={<SupportBoard />} />
          <Route path="support/tickets" element={<SupportTickets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
