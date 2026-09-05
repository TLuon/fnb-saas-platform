import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('<h1>Mock Server is Running!</h1><p>The mock server is working properly.</p>'));

// --- MOCK DATA ---
const categories = [
  { id: 'cat1', name: 'Cà phê' },
  { id: 'cat2', name: 'Trà trái cây' }
];

const products = [
  { id: 'p1', name: 'Cà phê sữa đá', price: 29000, categoryId: 'cat1', active: true },
  { id: 'p2', name: 'Bạc xỉu', price: 35000, categoryId: 'cat1', active: true },
  { id: 'p3', name: 'Trà đào cam sả', price: 45000, categoryId: 'cat2', active: false }
];

const staff = [
  { id: 's1', name: 'Nguyễn Văn Chủ', role: 'OWNER', active: true },
  { id: 's2', name: 'Trần Nhân Viên', role: 'STAFF', active: true },
  { id: 's3', name: 'Lê Hỗ Trợ', role: 'SUPPORT', active: false }
];

let unmatched = [
  { id: 'tx1', amount: 150000, content: 'Chuyen khoan ban 5', status: 'UNMATCHED', makerId: null, proposedCustomerId: null },
  { id: 'tx2', amount: 75000, content: 'Ly cafe sua', status: 'UNMATCHED', makerId: null, proposedCustomerId: null }
];


// --- API ENDPOINTS ---

// MENU
app.get('/menu/categories', (req, res) => res.json(categories));
app.get('/menu/products', (req, res) => res.json(products));
app.patch('/menu/products/:id', (req, res) => {
  const p = products.find(x => x.id === req.params.id);
  if (p) p.active = req.body.active;
  res.json({ success: true });
});

// STAFF
app.get('/staff', (req, res) => res.json(staff));
app.patch('/staff/:id/activate', (req, res) => {
  const s = staff.find(x => x.id === req.params.id);
  if (s) s.active = true;
  res.json({ success: true });
});
app.patch('/staff/:id/deactivate', (req, res) => {
  const s = staff.find(x => x.id === req.params.id);
  if (s) s.active = false;
  res.json({ success: true });
});

// SUPPORT (MAKER-CHECKER)
app.get('/support/unmatched', (req, res) => res.json(unmatched));
app.post('/support/unmatched/:id/propose', (req, res) => {
  const tx = unmatched.find(x => x.id === req.params.id);
  if (tx) {
    tx.status = 'PENDING_APPROVAL';
    tx.proposedCustomerId = req.body.customerId;
    tx.makerId = 's1'; // Simulate staff 1 as maker
  }
  res.json({ success: true });
});
app.post('/support/unmatched/:id/approve', (req, res) => {
  const tx = unmatched.find(x => x.id === req.params.id);
  if (!tx) return res.status(404).json({ error: 'Not found' });
  
  // Simulate Self Approval Check (Mock)
  // Let's pretend the checker is always 's1' if they don't send anything
  // If the maker is 's1', we reject.
  if (tx.makerId === 's1') {
    return res.status(403).json({ message: 'ERR_6002_SELF_APPROVAL' });
  }

  tx.status = 'RESOLVED';
  res.json({ success: true });
});

// KITCHEN (KDS)
app.patch('/orders/:id/items/:itemId/kitchen-status', (req, res) => {
  const { id, itemId } = req.params;
  const { kitchen_status } = req.body;
  console.log(`[KDS] Update Item ${itemId} in Order ${id} to ${kitchen_status}`);
  
  // Broadcast to all clients to update
  io.emit('kds_item_status_changed', { itemId, kitchen_status });
  res.json({ success: true });
});


// --- WEBSOCKET ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Periodic mock kds_new_ticket
setInterval(() => {
  const orderId = `order-${Math.floor(Math.random() * 1000)}`;
  const ticket = {
    orderId,
    createdAt: new Date().toISOString(),
    items: [
      { id: `item-${Math.floor(Math.random() * 10000)}`, name: 'Trà đào cam sả', quantity: 1, kitchen_status: 'QUEUED' },
      { id: `item-${Math.floor(Math.random() * 10000)}`, name: 'Cà phê đen', quantity: 2, kitchen_status: 'QUEUED' }
    ]
  };
  console.log(`[KDS] Sending new ticket: ${orderId}`);
  io.emit('kds_new_ticket', ticket);
}, 15000); // every 15s

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
  console.log(`Sending mock KDS tickets every 15 seconds...`);
});
