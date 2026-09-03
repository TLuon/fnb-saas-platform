'use client';

import dynamic from 'next/dynamic';

/**
 * Dynamic wrapper cho sơ đồ bàn — ssr: false vì Canvas/Grid dùng DOM API.
 * 
 * Khi F1 bàn giao FloorMapCanvas:
 *   1. Đặt component Canvas vào packages/ui-shared/ hoặc components/
 *   2. Đổi import bên dưới từ './FloorMapGrid' sang FloorMapCanvas
 *   3. Không cần đụng gì ở page.tsx
 */
const FloorMapDynamic = dynamic(() => import('./FloorMapGrid'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 animate-pulse">Đang tải sơ đồ bàn...</p>
    </div>
  ),
});

export default FloorMapDynamic;
