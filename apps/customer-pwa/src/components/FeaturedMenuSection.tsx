'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@fnb/utils';
import { EmptyState, LoadingSkeleton } from '@fnb/ui-shared';
import { normalizePublicCatalog, type CatalogProduct } from '../lib/catalog';

export function FeaturedMenuSection() {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const subdomain = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN || 'cafe-and-cake';
        const payload: any = await apiClient.get(`/public/catalog?tenant_subdomain=${subdomain}`);

        setItems(normalizePublicCatalog(payload).products.slice(0, 6));
      } catch (err) {
        console.error('Failed to fetch public catalog', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  if (loading) {
    return (
      <section className="py-12 px-4 max-w-screen-xl mx-auto">
        <h2 className="text-2xl font-bold text-[#543310] mb-8 relative inline-block">
          Món Nổi Bật
          <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#D67D3E] rounded"></span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-4 rounded-xl border border-[#E8DED5]">
              <LoadingSkeleton className="w-full h-[200px] rounded-lg mb-4" />
              <LoadingSkeleton className="w-[70%] h-[24px] mb-2" />
              <LoadingSkeleton className="w-[40%] h-[20px]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || items.length === 0) {
    return (
      <section className="py-12 px-4 max-w-screen-xl mx-auto">
        <h2 className="text-2xl font-bold text-[#543310] mb-8 relative inline-block">
          Món Nổi Bật
          <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#D67D3E] rounded"></span>
        </h2>
        <EmptyState 
          title="Chưa có món nào nổi bật" 
          message="Hiện tại quán chưa có món ăn nào được đánh dấu nổi bật. Vui lòng quay lại sau."
        />
      </section>
    );
  }

  return (
    <section className="py-12 px-4 max-w-screen-xl mx-auto">
      <h2 className="text-2xl font-bold text-[#543310] mb-8 relative inline-block">
        Món Nổi Bật
        <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#D67D3E] rounded"></span>
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map(item => (
          <div key={item.id} className="bg-[#FFFFFF] rounded-xl border border-[#E8DED5] overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
            <div className="h-48 bg-gray-100 relative overflow-hidden">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#6B625B]">
                  [Hình ảnh]
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-[#222222] mb-1 line-clamp-1">{item.name}</h3>
              <p className="text-sm text-[#6B625B] line-clamp-2 mb-4 h-10">
                {item.description || 'Hương vị tuyệt hảo từ nguyên liệu tươi ngon.'}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#543310] text-lg">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.base_price)}
                </span>
                <button className="text-[#D67D3E] font-medium text-sm hover:underline">
                  Xem chi tiết
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
