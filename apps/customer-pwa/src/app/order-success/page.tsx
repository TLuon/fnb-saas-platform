'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastProvider';

export default function OrderSuccessPage() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const router = useRouter();
  const { showInfo } = useToast();

  const handleSubmit = () => {
    if (rating === 0) {
      showInfo('Vui lòng chọn số sao');
      return;
    }
    showInfo('Cảm ơn bạn đã đánh giá!');
    setTimeout(() => {
      router.push('/menu');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#FED8B1] w-full max-w-md text-center">
        <div className="w-20 h-20 bg-[#FED8B1] text-[#543310] rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-[#543310] mb-2">Thanh toán thành công!</h1>
        <p className="text-gray-600 mb-8">Đơn hàng của bạn đang được chuẩn bị.</p>
        
        <div className="border-t pt-6">
          <h2 className="font-bold text-[#543310] mb-4">Trải nghiệm của bạn thế nào?</h2>
          
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star}
                onClick={() => setRating(star)}
                className={`text-4xl transition ${star <= rating ? 'text-[#D67D3E]' : 'text-gray-200 hover:text-[#FED8B1]'}`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea 
            className="w-full border border-gray-200 rounded-xl p-4 mb-6 focus:outline-none focus:ring-2 focus:ring-[#D67D3E] resize-none text-[#543310]"
            rows={3}
            placeholder="Để lại góp ý cho chúng tôi nhé..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          ></textarea>

          <button 
            onClick={handleSubmit}
            className="w-full bg-[#543310] text-[#FAF7F3] py-3 rounded-xl font-bold hover:bg-opacity-90 transition"
          >
            Gửi đánh giá
          </button>
        </div>
      </div>
    </div>
  );
}
