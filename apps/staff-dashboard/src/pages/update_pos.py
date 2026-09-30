import re

file_path = r"d:\CNPM\fnb-saas-platform\apps\staff-dashboard\src\pages\POS.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useEffect after openPaymentModalForOrder
content = content.replace(
"""    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || 'Không thể lấy thông tin đơn hàng', 'error', 'Lỗi Thanh Toán');
    }
  };""",
"""    } catch (err: any) {
      showAlert(err.response?.data?.message || err.message || 'Không thể lấy thông tin đơn hàng', 'error', 'Lỗi Thanh Toán');
    }
  };

  useEffect(() => {
    if (searchParams.get('action') === 'pay' && activeOrderId && !paymentModalOpen) {
      openPaymentModalForOrder(activeOrderId);
      navigate(`/pos?floor_id=${selectedFloor}&table_id=${initialTableId}`, { replace: true });
    }
  }, [searchParams, activeOrderId, paymentModalOpen, selectedFloor, initialTableId, navigate]);"""
)

# 2. Remove posMainTab from useState
content = content.replace(
"  const [posMainTab, setPosMainTab] = useState<'MENU' | 'TABLES'>('MENU');",
"  // posMainTab removed"
)

# 3. Header switcher
content = re.sub(
r'(\s*<div className="flex bg-gray-100 p-1 rounded-xl">\s*<button\s*className=\{`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 \$\{posMainTab === \'MENU\' \? \'bg-\[\#543310\] text-white shadow\' : \'text-gray-600 hover:text-gray-800\'\}`\}\s*onClick=\{\(\) => setPosMainTab\(\'MENU\'\)\}\s*>\s*<span>🍔</span>\s*<span>Thực đơn gọi món</span>\s*</button>[\s\S]*?</div>)',
"""            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                className="px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 bg-[#543310] text-white shadow"
              >
                <span>🍔</span>
                <span>Thực đơn gọi món</span>
              </button>
            </div>""",
content, count=1
)

# 4. Takeaway remove setPosMainTab
content = content.replace(
"""                  onClick={() => {
                    setOrderType('TAKEAWAY');
                    setPosMainTab('MENU');
                  }}""",
"""                  onClick={() => {
                    setOrderType('TAKEAWAY');
                  }}"""
)

# 5. Remove {posMainTab === 'MENU' && (
content = content.replace(
"""          {/* VIEW MODE 1: 🍔 GỌI MÓN (MENU) */}
          {posMainTab === 'MENU' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">""",
"""          {/* VIEW MODE 1: 🍔 GỌI MÓN (MENU) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">"""
)

# 6. Change setPosMainTab('TABLES') to navigate
content = content.replace(
"""                      onClick={() => setPosMainTab('TABLES')}""",
"""                      onClick={() => navigate('/floor-map')}"""
)

# 7. Remove the closing bracket of MENU block and the entire TABLES block
# The MENU block ends around line 800 with:
#                 )}
#               </div>
#             </div>
#           )}
#
#           {/* VIEW MODE 2: 📍 SƠ ĐỒ BÀN (TABLE MAP) */}

content = re.sub(
r'(?P<pre>                 \)}\s*</div>\s*</div>)\s*\)}\s*\{\/\* VIEW MODE 2: 📍 SƠ ĐỒ BÀN \(TABLE MAP\) \*\/\}[\s\S]*?\{\/\* Column 3: Cart \(Right\) \*\/\}',
r'\g<pre>\n\n      {/* Column 3: Cart (Right) */}',
content, count=1
)

# 8. Cart header button change
content = content.replace(
"""          {orderType === 'DINE_IN' ? (
            <span className="bg-white text-[#543310] px-3 py-1 rounded text-sm font-bold">
              {selectedTable ? `Bàn: ${selectedTable.name}` : 'Chưa chọn bàn'}
            </span>
          ) : (""",
"""          {orderType === 'DINE_IN' ? (
            <button 
              onClick={() => navigate('/floor-map')}
              className="bg-white text-[#543310] px-3 py-1 rounded text-sm font-bold hover:bg-gray-100 transition cursor-pointer"
            >
              {selectedTable ? `Bàn: ${selectedTable.name}` : 'Chưa chọn bàn'}
            </button>
          ) : ("""
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
