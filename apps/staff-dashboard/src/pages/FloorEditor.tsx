import React, { useEffect, useState, useMemo } from 'react';
import { FloorMapCanvas, FloorTableCanvas } from '@fnb/ui-shared';
import { createApiClient, mapApiTableToCanvas } from '@fnb/utils';

interface Floor {
  id: string;
  name: string;
}

const FloorEditor: React.FC = () => {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [tables, setTables] = useState<FloorTableCanvas[]>([]);
  const [selectedTable, setSelectedTable] = useState<FloorTableCanvas | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  const [dirtyTableIds, setDirtyTableIds] = useState<Set<string>>(new Set());

  const branchId = localStorage.getItem('branchId') || 'branch-1';

  const apiClient = useMemo(() => createApiClient({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    getToken: () => localStorage.getItem('jwt'),
  }), []);

  useEffect(() => {
    setIsLoading(true);
    apiClient.get(`/api/v1/floors?branch_id=${branchId}`)
      .then(res => {
        const floorList = res.data.data || [];
        setFloors(floorList);
        if (floorList.length > 0) setSelectedFloor(floorList[0].id);
      })
      .catch(() => setError('Không thể tải danh sách tầng'))
      .finally(() => setIsLoading(false));
  }, [apiClient, branchId]);

  const loadTables = (floorId: string) => {
    setIsLoading(true);
    apiClient.get(`/api/v1/floors/${floorId}/tables`)
      .then(res => {
        const mappedTables: FloorTableCanvas[] = (res.data.data || []).map(mapApiTableToCanvas);
        setTables(mappedTables);
        setSelectedTable(null);
        setDirtyTableIds(new Set());
      })
      .catch(() => setError('Không thể tải danh sách bàn'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (selectedFloor) {
      loadTables(selectedFloor);
    }
  }, [selectedFloor, apiClient]);

  const markDirty = (id: string) => {
    setDirtyTableIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleTableMove = (table: FloorTableCanvas, x: number, y: number) => {
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, coord_x: x, coord_y: y } : t));
    markDirty(table.id);
    if (selectedTable?.id === table.id) {
      setSelectedTable({ ...table, coord_x: x, coord_y: y });
    }
  };

  const handleAddTable = () => {
    const newId = `new-${Date.now()}`;
    const newTable: FloorTableCanvas = {
      id: newId,
      name: `Bàn ${tables.length + 1}`,
      status: 'AVAILABLE',
      coord_x: 100,
      coord_y: 100,
      width: 80,
      height: 80,
      shape: 'rectangle'
    };
    setTables([...tables, newTable]);
    setSelectedTable(newTable);
    markDirty(newId);
  };

  const handleSave = async () => {
    if (dirtyTableIds.size === 0) return alert('Không có thay đổi nào để lưu');
    setIsSaving(true);
    setError('');
    
    try {
      const savePromises = Array.from(dirtyTableIds).map(id => {
        const table = tables.find(t => t.id === id);
        if (!table) return Promise.resolve();

        const payload = {
          name: table.name,
          pos_x: table.coord_x,
          pos_y: table.coord_y,
          width: table.width,
          height: table.height,
          shape: table.shape
        };
        
        if (id.startsWith('new-')) {
          return apiClient.post('/api/v1/tables', { ...payload, floor_id: selectedFloor, capacity: 4 });
        } else {
          return apiClient.patch(`/api/v1/tables/${id}`, payload);
        }
      });

      await Promise.all(savePromises);
      alert('Đã lưu sơ đồ bàn thành công!');
      loadTables(selectedFloor); // Reload to get actual DB IDs and clear dirty state
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu một số bàn. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn hủy bỏ các thay đổi chưa lưu?')) {
      loadTables(selectedFloor);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF7F3]">
      {/* Header */}
      <header className="bg-[#543310] text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Floor Editor (Quản lý sơ đồ bàn)</h1>
        <div className="flex gap-4 items-center">
          {dirtyTableIds.size > 0 && (
            <span className="text-sm font-medium bg-[#FED8B1] text-[#543310] px-3 py-1 rounded-full animate-pulse">
              Có {dirtyTableIds.size} thay đổi chưa lưu
            </span>
          )}
          <select 
            className="text-black rounded px-2 py-1 outline-none"
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            disabled={isLoading}
          >
            {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button 
            onClick={handleReset}
            disabled={isSaving || dirtyTableIds.size === 0}
            className="bg-gray-300 text-gray-800 px-4 py-1.5 rounded font-bold hover:bg-gray-400 disabled:opacity-50 transition"
          >
            Hủy / Tải lại
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || dirtyTableIds.size === 0}
            className="bg-[#237A57] px-4 py-1.5 rounded font-bold hover:bg-green-700 disabled:opacity-50 transition"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu Sơ Đồ'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 p-4 relative">
          {error && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#B42318] text-white px-4 py-2 rounded shadow-lg z-10 flex gap-4 items-center">
              <span>{error}</span>
              <button onClick={() => setError('')} className="font-bold underline">Đóng</button>
            </div>
          )}
          
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-white rounded-lg border border-[#E8DED5] shadow-inner text-gray-400">
              <span className="animate-pulse font-medium">Đang tải sơ đồ bàn...</span>
            </div>
          ) : (
            <FloorMapCanvas 
              tables={tables} 
              editable={true}
              selectedTableId={selectedTable?.id}
              onTableSelect={setSelectedTable}
              onTableMove={handleTableMove}
            />
          )}
          
          <button 
            onClick={handleAddTable}
            disabled={isLoading || !selectedFloor}
            className="absolute bottom-8 right-8 bg-[#D67D3E] text-white w-14 h-14 rounded-full shadow-lg text-3xl flex items-center justify-center hover:bg-orange-700 disabled:opacity-50 transition"
            title="Thêm bàn mới"
          >
            +
          </button>
        </div>

        {/* Sidebar Properties */}
        <div className="w-80 bg-white border-l border-[#E8DED5] p-6 overflow-y-auto">
          <h2 className="text-lg font-bold text-[#543310] mb-6">Thuộc tính Bàn</h2>
          
          {selectedTable ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên bàn / Mã bàn</label>
                <input 
                  type="text" 
                  className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
                  value={selectedTable.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setSelectedTable({...selectedTable, name: newName});
                    setTables(tables.map(t => t.id === selectedTable.id ? {...t, name: newName} : t));
                    markDirty(selectedTable.id);
                  }}
                />
              </div>
              
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tọa độ X</label>
                  <input type="number" readOnly value={selectedTable.coord_x ?? 0} className="w-full border rounded p-2 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tọa độ Y</label>
                  <input type="number" readOnly value={selectedTable.coord_y ?? 0} className="w-full border rounded p-2 bg-gray-50" />
                </div>
              </div>

              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chiều rộng</label>
                  <input 
                    type="number" 
                    value={selectedTable.width ?? 80} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSelectedTable({...selectedTable, width: val});
                      setTables(tables.map(t => t.id === selectedTable.id ? {...t, width: val} : t));
                      markDirty(selectedTable.id);
                    }}
                    className="w-full border rounded p-2" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chiều cao</label>
                  <input 
                    type="number" 
                    value={selectedTable.height ?? 80} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSelectedTable({...selectedTable, height: val});
                      setTables(tables.map(t => t.id === selectedTable.id ? {...t, height: val} : t));
                      markDirty(selectedTable.id);
                    }}
                    className="w-full border rounded p-2" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hình dạng</label>
                <select 
                  className="w-full border rounded p-2 outline-none"
                  value={selectedTable.shape || 'rectangle'}
                  onChange={(e) => {
                    const shape = e.target.value as 'circle' | 'rectangle' | 'square';
                    setSelectedTable({...selectedTable, shape});
                    setTables(tables.map(t => t.id === selectedTable.id ? {...t, shape} : t));
                    markDirty(selectedTable.id);
                  }}
                >
                  <option value="rectangle">Chữ nhật</option>
                  <option value="square">Vuông</option>
                  <option value="circle">Tròn</option>
                </select>
              </div>

            </div>
          ) : (
            <div className="text-gray-500 text-center mt-10">
              Nhấp chọn một bàn trên sơ đồ để chỉnh sửa thuộc tính.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloorEditor;
