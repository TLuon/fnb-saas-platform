import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { Layout } from './components/Layout';
import { StaffAuthProvider } from './components/StaffAuthProvider';
import Login from './pages/Login';
import MenuManagement from './pages/MenuManagement';
import StaffManagement from './pages/StaffManagement';
import Analytics from './pages/Analytics';
import CDP from './pages/CDP';
import Customer360 from './pages/Customer360';
import SupportBoard from './pages/SupportBoard';
import SupportTickets from './pages/SupportTickets';
import ShiftManagement from './pages/ShiftManagement';
import Inventory from './pages/Inventory';
import KDSKitchen from './pages/KDSKitchen';
import KDSBar from './pages/KDSBar';
import FloorEditor from './pages/FloorEditor';
import LiveFloorMap from './pages/LiveFloorMap';
import POS from './pages/POS';

function App() {
  return (
    <BrowserRouter>
      <StaffAuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/analytics" replace />} />
            <Route path="menu-management" element={<AuthGuard requiredRole="OWNER"><MenuManagement /></AuthGuard>} />
            <Route path="staff-management" element={<AuthGuard requiredRole="OWNER"><StaffManagement /></AuthGuard>} />
            <Route path="analytics" element={<AuthGuard requiredRole="OWNER"><Analytics /></AuthGuard>} />
            <Route path="cdp" element={<AuthGuard requiredRole="OWNER"><CDP /></AuthGuard>} />
            <Route path="cdp/customers/:id" element={<AuthGuard requiredRole="OWNER"><Customer360 /></AuthGuard>} />
            <Route path="support/board" element={<AuthGuard requiredRole="SUPPORT"><SupportBoard /></AuthGuard>} />
            <Route path="support/tickets" element={<AuthGuard requiredRole="SUPPORT"><SupportTickets /></AuthGuard>} />
            <Route path="shifts" element={<AuthGuard requiredRole="OWNER"><ShiftManagement /></AuthGuard>} />
            <Route path="inventory" element={<AuthGuard requiredRole="OWNER"><Inventory /></AuthGuard>} />
            <Route path="floor-editor" element={<AuthGuard requiredRole="OWNER"><FloorEditor /></AuthGuard>} />
            <Route path="floor-map" element={<AuthGuard requiredRole="STAFF"><LiveFloorMap /></AuthGuard>} />
            <Route path="pos" element={<AuthGuard requiredRole="STAFF"><POS /></AuthGuard>} />
            <Route path="kds/kitchen" element={<AuthGuard requiredRole="STAFF"><KDSKitchen /></AuthGuard>} />
            <Route path="kds/bar" element={<AuthGuard requiredRole="STAFF"><KDSBar /></AuthGuard>} />
          </Route>
        </Routes>
      </StaffAuthProvider>
    </BrowserRouter>
  );
}

export default App;
