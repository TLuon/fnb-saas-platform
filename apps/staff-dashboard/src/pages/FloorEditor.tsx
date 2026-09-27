import React, { useEffect, useState } from 'react';
import { FloorMapCanvas, FloorTableCanvas, TableStatusLegend } from '@fnb/ui-shared';
import { apiClient, authStore, mapApiTableToCanvas } from '@fnb/utils';
import { useStore } from 'zustand';
import { useModal } from '../components/ModalProvider';

interface Floor {
  id: string;
  name: string;
}

const FloorEditor: React.FC = () => {
  const { showAlert, showConfirm } = useModal();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [tables, setTables] = useState<FloorTableCanvas[]>([]);
  const [selectedTable, setSelectedTable] = useState<FloorTableCanvas | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  const [dirtyTableIds, setDirtyTableIds] = useState<Set<string>>(new Set());
  const [deletedTableIds, setDeletedTableIds] = useState<Set<string>>(new Set());

  const branchId = useStore(authStore, (state) => state.branchId);

  useEffect(() => {
    if (!branchId) {
      setFloors([]);
      setTables([]);
      setError('Tài khoản chưa được gán chi nhánh');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    apiClient.get(`/floors?branch_id=${branchId}`)
      .then((res: any) => {
        const floorList = res.data?.data || res.data || res || [];
        setFloors(floorList);
        if (floorList.length > 0) setSelectedFloor(floorList[0].id);
      })
      .catch(() => setError('Không thể tải danh sách tầng'))
      .finally(() => setIsLoading(false));
  }, [branchId]);

  const loadTables = (floorId: string) => {
    setIsLoading(true);
    apiClient.get(`/floors/${floorId}/tables`)
      .then((res: any) => {
        const mappedTables: FloorTableCanvas[] = (res.data?.data || res.data || res || []).map(mapApiTableToCanvas);
        setTables(mappedTables);
        setSelectedTable(null);
        setDirtyTableIds(new Set());
        setDeletedTableIds(new Set());
      })
      .catch(() => setError('Không thể tải danh sách tầng/bàn'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (selectedFloor) {
      loadTables(selectedFloor);
    }
  }, [selectedFloor]);

  const markDirty = (id: string) => {
    setDirtyTableIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const checkOverlap = (table: FloorTableCanvas, x: number, y: number) => {
    const tw = table.width || 80;
    const th = table.height || 80;
    for (const t of tables) {
      if (t.id === table.id) continue;
      const ttw = t.width || 80;
      const tth = t.height || 80;
      const tx = t.coord_x ?? 0;
      const ty = t.coord_y ?? 0;
      if (x < tx + ttw && x + tw > tx && y < ty + tth && y + th > ty) {
        return true;
      }
    }
    return false;
  };

  const handleTableMove = (table: FloorTableCanvas, x: number, y: number) => {
    if (checkOverlap(table, x, y)) {
      showAlert('Vị trí bàn hoặc trang trí bị chồng chéo!', 'warning', 'Trùng vị trí');
      // revert to old position by triggering a re-render with old coords
      setTables(prev => [...prev]);
      return;
    }
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, coord_x: x, coord_y: y } : t));
    markDirty(table.id);
    if (selectedTable?.id === table.id) {
      setSelectedTable({ ...table, coord_x: x, coord_y: y });
    }
  };

  const handleDeleteTable = (id: string) => {
    showConfirm({
      title: 'Xác nhận xóa đối tượng',
      message: 'Bạn có chắc chắn muốn xóa đối tượng này khỏi sơ đồ?',
      confirmLabel: 'Xóa đối tượng',
      cancelLabel: 'Hủy',
      onConfirm: () => {
        setTables(prev => prev.filter(t => t.id !== id));
        if (selectedTable?.id === id) setSelectedTable(null);
        if (!id.startsWith('new-')) {
          setDeletedTableIds(prev => new Set(prev).add(id));
          markDirty(id);
        } else {
          setDirtyTableIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }
    });
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
      shape: 'rectangle',
      capacity: 4
    };
    setTables([...tables, newTable]);
    setSelectedTable(newTable);
    markDirty(newId);
  };

  const handleAddDecorItem = (shape: 'door' | 'stairs' | 'plant' | 'window' | 'balcony' | 'wc' | 'counter' | 'aquarium') => {
    const newId = `new-${Date.now()}`;
    const defaultLabels: Record<string, string> = {
      door: 'Cửa ra vào',
      stairs: 'Cầu thang',
      plant: 'Bồn hoa',
      window: 'View đẹp',
      balcony: 'Ban công',
      wc: 'Nhà vệ sinh',
      counter: 'Quầy Order',
      aquarium: 'Bể cá'
    };
    const defaultSizes: Record<string, { w: number; h: number }> = {
      door: { w: 120, h: 40 },
      stairs: { w: 100, h: 80 },
      plant: { w: 140, h: 40 },
      window: { w: 180, h: 30 },
      balcony: { w: 250, h: 50 },
      wc: { w: 100, h: 80 },
      counter: { w: 220, h: 60 },
      aquarium: { w: 140, h: 60 },
    };

    const size = defaultSizes[shape] || { w: 100, h: 50 };
    const newTable: FloorTableCanvas = {
      id: newId,
      name: defaultLabels[shape] || 'Trang trí',
      status: 'AVAILABLE',
      coord_x: 120,
      coord_y: 120,
      width: size.w,
      height: size.h,
      shape: shape,
      capacity: 0
    };
    setTables([...tables, newTable]);
    setSelectedTable(newTable);
    markDirty(newId);
  };

  const handleRotateSelectedTable = () => {
    if (!selectedTable) return;
    const currentRot = selectedTable.rotation || 0;
    const newRot = (currentRot + 90) % 360;
    const updated = { ...selectedTable, rotation: newRot };
    setSelectedTable(updated);
    setTables(prev => prev.map(t => t.id === selectedTable.id ? updated : t));
    markDirty(selectedTable.id);
  };

  const handleSave = async () => {
    if (!branchId) return setError('Tài khoản chưa được gán chi nhánh');
    if (dirtyTableIds.size === 0) return showAlert('Không có thay đổi nào để lưu', 'info', 'Thông báo');
    setIsSaving(true);
    setError('');
    
    try {
      const savePromises = Array.from(dirtyTableIds).map(id => {
        if (deletedTableIds.has(id)) {
          return apiClient.delete(`/tables/${id}`);
        }

        const table = tables.find(t => t.id === id);
        if (!table) return Promise.resolve();

        const shapePayload = table.rotation ? `${table.shape}:${table.rotation}` : table.shape;
        const payload = {
          table_code: table.name || 'Bàn',
          name: table.name || 'Bàn',
          pos_x: table.coord_x ?? 0,
          pos_y: table.coord_y ?? 0,
          width: table.width ?? 80,
          height: table.height ?? 80,
          shape: shapePayload,
          rotation: table.rotation || 0,
          capacity: table.capacity ?? 0
        };
        
        if (id.startsWith('new-')) {
          return apiClient.post('/tables', { ...payload, floor_id: selectedFloor, branch_id: branchId });
        } else {
          return apiClient.patch(`/tables/${id}`, payload);
        }
      });

      const results = await Promise.allSettled(savePromises);
      const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (errors.length > 0) {
        const firstErr = errors[0].reason?.response?.data?.message || errors[0].reason?.message || '';
        showAlert(`Có lỗi xảy ra khi lưu ${errors.length} đối tượng. ${firstErr}`, 'error', 'Lỗi lưu dữ liệu');
      } else {
        showAlert('Đã lưu sơ đồ bàn & trang trí thành công!', 'success', 'Thành công');
      }
      setDeletedTableIds(new Set());
      loadTables(selectedFloor);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    showConfirm({
      title: 'Hủy bỏ thay đổi',
      message: 'Bạn có chắc chắn muốn hủy bỏ tất cả các thay đổi chưa lưu?',
      confirmLabel: 'Hủy thay đổi',
      cancelLabel: 'Quay lại',
      onConfirm: () => {
        loadTables(selectedFloor);
      }
    });
  };

  const [isAddFloorOpen, setIsAddFloorOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');

  const handleAddFloor = () => {
    if (!branchId) return setError('Tài khoản chưa được gán chi nhánh');
    setNewFloorName('');
    setIsAddFloorOpen(true);
  };

  const handleConfirmAddFloor = () => {
    if (!newFloorName.trim()) return;
    setIsAddFloorOpen(false);
    setIsLoading(true);
    apiClient.post('/floors', { name: newFloorName.trim(), branch_id: branchId })
      .then(() => {
        return apiClient.get(`/floors?branch_id=${branchId}`);
      })
      .then((res: any) => {
        const floorList = res.data?.data || res.data || res || [];
        setFloors(floorList);
        if (floorList.length > 0) {
          const lastFloor = floorList[floorList.length - 1];
          setSelectedFloor(lastFloor.id);
        }
      })
      .catch((e: any) => setError(e.response?.data?.message || 'Không thể tạo tầng mới'))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF7F3]">
      {/* Header */}
      <header className="bg-[#543310] text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Floor Editor (Quản lý sơ đồ bàn & trang trí quán)</h1>

        <div className="flex gap-4 items-center">
          {dirtyTableIds.size > 0 && (
            <span className="text-sm font-medium bg-[#FED8B1] text-[#543310] px-3 py-1 rounded-full animate-pulse">
              Có {dirtyTableIds.size} thay đổi chưa lưu
            </span>
          )}
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
        {/* Floor Selector Sidebar */}
        <div className="w-64 bg-white border-r border-[#E8DED5] flex flex-col">
          <div className="p-4 border-b border-[#E8DED5] flex justify-between items-center">
            <h2 className="font-bold text-[#543310]">Danh sách Tầng</h2>
            <button className="text-xl font-bold text-[#D67D3E]" title="Thêm tầng" onClick={handleAddFloor}>+</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {floors.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">Chưa có tầng nào</div>
            ) : floors.map(f => (
              <button 
                key={f.id}
                onClick={() => setSelectedFloor(f.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 font-medium transition ${selectedFloor === f.id ? 'bg-[#FAF7F3] text-[#D67D3E] border-l-4 border-l-[#D67D3E]' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-4 relative flex flex-col">
          <div className="mb-4">
            <TableStatusLegend />
          </div>
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
          
          {/* Floating Toolbar to add items */}
          <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-[#E8DED5]">
            <button
              onClick={handleAddTable}
              disabled={isLoading || !selectedFloor}
              className="bg-[#543310] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#D67D3E] transition flex items-center gap-1 shadow"
            >
              ➕ Thêm Bàn
            </button>
            <button
              onClick={() => handleAddDecorItem('door')}
              disabled={isLoading || !selectedFloor}
              className="bg-[#F5E6D3] text-[#543310] px-3 py-2 rounded-xl text-xs font-bold border border-[#8C5A2B] hover:bg-[#E8DED5] transition flex items-center gap-1 shadow"
            >
              🚪 Cửa
            </button>
            <button
              onClick={() => handleAddDecorItem('stairs')}
              disabled={isLoading || !selectedFloor}
              className="bg-[#E2E8F0] text-[#1E293B] px-3 py-2 rounded-xl text-xs font-bold border border-[#475569] hover:bg-[#CBD5E1] transition flex items-center gap-1 shadow"
            >
              🪜 Cầu thang
            </button>
            <button
              onClick={() => handleAddDecorItem('plant')}
              disabled={isLoading || !selectedFloor}
              className="bg-[#DCFCE7] text-[#14532D] px-3 py-2 rounded-xl text-xs font-bold border border-[#16A34A] hover:bg-[#BBF7D0] transition flex items-center gap-1 shadow"
            >
              🌿 Bồn hoa
            </button>
            <button
              onClick={() => handleAddDecorItem('window')}
              disabled={isLoading || !selectedFloor}
              className="bg-[#E0F2FE] text-[#0369A1] px-3 py-2 rounded-xl text-xs font-bold border border-[#0284C7] hover:bg-[#BAE6FD] transition flex items-center gap-1 shadow"
            >
              🪟 View đẹp
            </button>
            <button
              onClick={() => handleAddDecorItem('balcony')}
              disabled={isLoading || !selectedFloor}
              className="bg-[#FEF3C7] text-[#78350F] px-3 py-2 rounded-xl text-xs font-bold border border-[#D97706] hover:bg-[#FDE68A] transition flex items-center gap-1 shadow"
            >
              ☕ Ban công
            </button>
            <button
              onClick={() => handleAddDecorItem('wc')}
              disabled={isLoading || !selectedFloor}
              className="bg-[#E0E7FF] text-[#3730A3] px-3 py-2 rounded-xl text-xs font-bold border border-[#4338CA] hover:bg-[#C7D2FE] transition flex items-center gap-1 shadow"
            >
              🚻 WC
            </button>
            <button
              onClick={() => handleAddDecorItem('counter')}
              disabled={isLoading || !selectedFloor}
              className="bg-[#FDE68A] text-[#78350F] px-3 py-2 rounded-xl text-xs font-bold border border-[#B45309] hover:bg-[#FCD34D] transition flex items-center gap-1 shadow"
            >
              🍹 Quầy Order
            </button>
            <button
              onClick={() => handleAddDecorItem('aquarium')}
              disabled={isLoading || !selectedFloor}
              className="bg-[#CCFBF1] text-[#115E59] px-3 py-2 rounded-xl text-xs font-bold border border-[#0D9488] hover:bg-[#99F6E4] transition flex items-center gap-1 shadow"
            >
              🐠 Bể cá
            </button>
            {selectedTable && (
              <button
                onClick={handleRotateSelectedTable}
                className="bg-[#D67D3E] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#b86428] transition flex items-center gap-1 shadow ml-2 animate-bounce-short"
                title="Xoay đối tượng đang chọn 90 độ"
              >
                🔄 Xoay 90° ({selectedTable.rotation || 0}°)
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Properties */}
        <div className="w-80 bg-white border-l border-[#E8DED5] p-6 overflow-y-auto">
          <h2 className="text-lg font-bold text-[#543310] mb-6">Thuộc tính Đối tượng</h2>
          
          {selectedTable ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đối tượng / Nhãn</label>
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
              
              {!['door', 'stairs', 'plant', 'window', 'balcony', 'wc', 'counter', 'aquarium'].includes(selectedTable.shape || '') && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số ghế (Capacity)</label>
                    <input 
                      type="number" 
                      className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
                      value={selectedTable.capacity ?? 4}
                      onChange={(e) => {
                        const capacity = Number(e.target.value);
                        setSelectedTable({...selectedTable, capacity});
                        setTables(tables.map(t => t.id === selectedTable.id ? {...t, capacity} : t));
                        markDirty(selectedTable.id);
                      }}
                    />
                  </div>
                </div>
              )}
              
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Góc xoay (Rotation)</label>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={handleRotateSelectedTable}
                    className="flex-1 bg-[#F5E6D3] text-[#543310] font-bold py-2 px-3 rounded-lg border border-[#8C5A2B] hover:bg-[#E8DED5] transition flex items-center justify-center gap-2 text-sm shadow-sm"
                  >
                    🔄 Xoay 90°
                  </button>
                  <span className="text-sm font-bold text-[#543310] px-3 py-2 bg-gray-100 rounded-lg min-w-[70px] text-center border border-gray-200">
                    {selectedTable.rotation || 0}°
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại đối tượng</label>
                <select 
                  className="w-full border rounded p-2 outline-none font-medium"
                  value={selectedTable.shape || 'rectangle'}
                  onChange={(e) => {
                    const shape = e.target.value as any;
                    setSelectedTable({...selectedTable, shape});
                    setTables(tables.map(t => t.id === selectedTable.id ? {...t, shape} : t));
                    markDirty(selectedTable.id);
                  }}
                >
                  <optgroup label="Bàn Ăn">
                    <option value="rectangle">Chữ nhật</option>
                    <option value="square">Vuông</option>
                    <option value="circle">Tròn</option>
                  </optgroup>
                  <optgroup label="Vật Dụng Trang Trí">
                    <option value="door">🚪 Cửa ra vào</option>
                    <option value="stairs">🪜 Cầu thang</option>
                    <option value="plant">🌿 Bồn hoa</option>
                    <option value="window">🪟 View đẹp / Cửa sổ</option>
                    <option value="balcony">☕ Ban công</option>
                    <option value="wc">🚻 Nhà vệ sinh (WC)</option>
                    <option value="counter">🍹 Quầy Order / Thu ngân</option>
                    <option value="aquarium">🐠 Bể cá trang trí</option>
                  </optgroup>
                </select>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100">
                <button
                  onClick={() => handleDeleteTable(selectedTable.id)}
                  className="w-full bg-red-50 text-red-600 font-bold py-2 rounded border border-red-200 hover:bg-red-100 transition"
                >
                  Xóa đối tượng này
                </button>
              </div>

            </div>
          ) : (
            <div className="text-gray-500 text-center mt-10">
              Nhấp chọn một đối tượng (Bàn hoặc Vật trang trí) trên sơ đồ để chỉnh sửa thuộc tính.
            </div>
          )}
        </div>
      </div>

      {/* Add Floor Modal */}
      {isAddFloorOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8DED5] shadow-2xl p-6 w-full max-w-md animate-fade-in">
            <h3 className="text-xl font-bold text-[#543310] mb-2">Tạo tầng / Khu vực mới</h3>
            <p className="text-xs text-[#6B625B] mb-4">Nhập tên tầng hoặc khu vực kinh doanh của quán</p>
            <input
              type="text"
              autoFocus
              value={newFloorName}
              onChange={(e) => setNewFloorName(e.target.value)}
              placeholder="Ví dụ: Tầng 2, Sân thượng..."
              className="w-full px-4 py-3 border border-[#E8DED5] rounded-xl outline-none focus:ring-2 focus:ring-[#D67D3E] text-sm text-[#543310] font-medium mb-6"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmAddFloor();
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddFloorOpen(false)}
                className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 bg-gray-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAddFloor}
                disabled={!newFloorName.trim()}
                className="px-5 py-2.5 text-sm font-bold text-white bg-[#D67D3E] hover:bg-[#b86428] rounded-xl shadow transition disabled:opacity-50"
              >
                Tạo tầng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorEditor;
