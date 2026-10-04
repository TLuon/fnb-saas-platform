import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function CartHeader() {
  const router = useRouter();

  return (
    <div className="bg-[#FFFFFF] border-b border-[#E8DED5] p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => router.back()}
          className="p-2 -ml-2 text-[#543310] hover:bg-[#FAF7F3] rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold font-serif text-[#543310]">Giỏ hàng</h1>
      </div>
      <Link href="/menu" className="text-sm font-bold text-[#D67D3E] hover:text-[#543310] transition-colors">
        Thêm món
      </Link>
    </div>
  );
}
