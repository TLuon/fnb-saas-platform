import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface CSATPromptProps {
  hasRated: boolean;
  onSubmit: (score: number, note: string) => Promise<void>;
}

export function CSATPrompt({ hasRated, onSubmit }: CSATPromptProps) {
  const [score, setScore] = useState(5);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (hasRated) {
    return (
      <div className="bg-[#FFFFFF] p-6 rounded-xl shadow-sm border border-[#E8DED5] text-center">
        <div className="w-12 h-12 bg-[#E2F3E5] text-[#237A57] rounded-full flex items-center justify-center mx-auto mb-3">
          <Star size={24} className="fill-current" />
        </div>
        <h3 className="font-bold text-[#543310] mb-1">Cảm ơn bạn đã đánh giá!</h3>
        <p className="text-[#6B625B] text-sm">Phản hồi của bạn giúp chúng tôi phục vụ tốt hơn.</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onSubmit(score, note);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] p-6 rounded-xl shadow-sm border border-[#E8DED5]">
      <h3 className="font-bold text-[#543310] mb-4 text-center">Đánh giá trải nghiệm</h3>
      
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            onClick={() => setScore(s)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
          >
            <Star 
              size={32} 
              className={`transition-colors ${s <= score ? 'text-[#D67D3E] fill-current' : 'text-[#E8DED5]'}`} 
            />
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Chia sẻ thêm cảm nhận của bạn (không bắt buộc)..."
        className="w-full bg-[#FAF7F3] border border-[#E8DED5] rounded-xl p-3 text-sm text-[#222222] focus:outline-none focus:border-[#D67D3E] focus:ring-1 focus:ring-[#D67D3E] transition-all resize-none h-24 mb-4 placeholder:text-[#6B625B]"
      />

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full py-3 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
      </button>
    </div>
  );
}
