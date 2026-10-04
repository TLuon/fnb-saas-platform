import React from 'react';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: any[];
  onProductClick: (product: any) => void;
  onAddToCart: (product: any) => void;
}

export function ProductGrid({ products, onProductClick, onAddToCart }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#6B625B]">
        <p>Không tìm thấy món ăn nào.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 py-6 max-w-screen-xl mx-auto w-full">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onProductClick(product)}
          onAdd={() => onAddToCart(product)}
        />
      ))}
    </div>
  );
}
