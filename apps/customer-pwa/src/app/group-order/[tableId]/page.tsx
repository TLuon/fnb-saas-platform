'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@fnb/utils';
import { PublicHeader } from '../../../components/PublicHeader';
import { GroupSessionHeader } from '../../../components/group-order/GroupSessionHeader';
import { MemberList } from '../../../components/group-order/MemberList';
import { SharedCartPanel, SharedCartItem } from '../../../components/group-order/SharedCartPanel';
import { RealtimeConnectionBadge, SocketStatus } from '../../../components/group-order/RealtimeConnectionBadge';
import { SessionExpiredState } from '../../../components/group-order/SessionExpiredState';
import { GroupMenuPicker } from '../../../components/group-order/GroupMenuPicker';
import { useToast } from '../../../components/ToastProvider';
import { ChevronRight, Plus } from 'lucide-react';

export default function GroupOrderPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params?.tableId as string;
  const { showInfo, showError } = useToast();

  const [memberName, setMemberName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'ACTIVE' | 'LOCKED' | 'EXPIRED'>('ACTIVE');
  
  const [members, setMembers] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<SharedCartItem[]>([]);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('RECONNECTING');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const fetchCart = async () => {
    try {
      // GET /api/v1/group-order/:tableId/cart
      const res: any = await apiClient.get(`/group-order/${tableId}/cart`);
      setCartItems(res.items || []);
      setMembers(res.members || []);
      if (res.status) setSessionStatus(res.status);
    } catch (err: any) {
      if (err.response?.status === 410 || err.response?.status === 404) {
        setSessionStatus('EXPIRED');
      }
    }
  };

  const initSocket = () => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(wsUrl, {
      query: { channel: `group_order:demo:${tableId}` }
    });

    socket.on('connect', () => {
      setSocketStatus('CONNECTED');
      fetchCart(); // Resync on connect/reconnect
    });

    socket.on('disconnect', () => {
      setSocketStatus('OFFLINE');
    });

    socket.on('group_order_cart_updated', (data: any) => {
      setCartItems(data.items || []);
      setMembers(data.members || []);
      if (data.status) setSessionStatus(data.status);
    });

    socketRef.current = socket;
  };

  useEffect(() => {
    if (hasJoined) {
      initSocket();
    }
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [hasJoined, tableId]);

  const handleJoin = async () => {
    if (!memberName.trim()) return;
    try {
      setIsJoining(true);
      // POST /api/v1/group-order/join
      await apiClient.post('/group-order/join', { tableId, name: memberName });
      setHasJoined(true);
    } catch (err: any) {
      showError('Lỗi tham gia phiên: ' + err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleAddToCart = async (product: any, quantity: number, note: string) => {
    if (sessionStatus !== 'ACTIVE') return;
    try {
      // POST /api/v1/group-order/:tableId/cart/items
      await apiClient.post(`/group-order/${tableId}/cart/items`, {
        productId: product.id,
        quantity,
        note
      });
      showInfo(`Đã thêm ${product.name}`);
    } catch (err) {
      showError('Không thể thêm món');
    }
  };

  if (!hasJoined) {
    return (
      <main className="min-h-screen bg-[#FAF7F3] flex flex-col">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8DED5] w-full max-w-sm">
            <h2 className="text-xl font-bold font-serif text-[#543310] mb-2 text-center">Bàn {tableId}</h2>
            <p className="text-sm text-[#6B625B] text-center mb-6">Nhập tên của bạn để tham gia gọi món chung với mọi người.</p>
            
            <input 
              type="text" 
              placeholder="VD: Tuấn Nguyễn"
              value={memberName}
              onChange={e => setMemberName(e.target.value)}
              className="w-full p-3 bg-[#FAF7F3] border border-[#E8DED5] rounded-xl mb-4 focus:border-[#D67D3E] focus:ring-1 focus:ring-[#D67D3E] outline-none transition-all"
            />
            
            <button 
              onClick={handleJoin}
              disabled={isJoining || !memberName.trim()}
              className="w-full py-3 bg-[#543310] text-white font-bold rounded-xl disabled:opacity-50 transition-colors hover:bg-[#D67D3E]"
            >
              {isJoining ? 'Đang tham gia...' : 'Tham gia'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (sessionStatus === 'EXPIRED') {
    return (
      <main className="min-h-screen bg-[#FAF7F3] flex flex-col">
        <PublicHeader />
        <SessionExpiredState />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-32 relative">
      <PublicHeader />
      <GroupSessionHeader 
        tableName={tableId} 
        memberCount={members.length} 
        status={sessionStatus} 
      />

      <div className="max-w-screen-xl mx-auto w-full p-4 space-y-4">
        <div className="flex justify-end">
          <RealtimeConnectionBadge status={socketStatus} />
        </div>

        <MemberList members={members} />

        <SharedCartPanel items={cartItems} />

        {sessionStatus === 'ACTIVE' && (
          <button 
            onClick={() => setIsPickerOpen(true)}
            className="w-full py-4 bg-white text-[#543310] font-bold rounded-xl border-2 border-dashed border-[#D67D3E] flex items-center justify-center gap-2 hover:bg-[#FED8B1]/20 transition-colors"
          >
            <Plus size={20} /> Thêm món mới
          </button>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8DED5] shadow-lg z-40 md:sticky">
        <button 
          onClick={() => router.push(`/group-order/${tableId}/cart`)}
          className="w-full max-w-screen-xl mx-auto py-3 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors flex items-center justify-center gap-2"
        >
          Xem & Xác nhận đơn <ChevronRight size={20} />
        </button>
      </div>

      <GroupMenuPicker 
        isOpen={isPickerOpen} 
        onClose={() => setIsPickerOpen(false)} 
        onAddToCart={handleAddToCart} 
      />
    </main>
  );
}
