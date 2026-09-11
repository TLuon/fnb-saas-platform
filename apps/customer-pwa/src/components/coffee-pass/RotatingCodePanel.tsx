import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { apiClient } from '@fnb/utils';

interface RotatingCodePanelProps {
  passId: string;
}

export function RotatingCodePanel({ passId }: RotatingCodePanelProps) {
  const [code, setCode] = useState<string>('------');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchCode = async () => {
    try {
      setLoading(true);
      setError('');
      // GET /api/v1/coffee-pass/:id/current-code
      const res: any = await apiClient.get(`/coffee-pass/${passId}/current-code`);
      setCode(res.code || Math.floor(100000 + Math.random() * 900000).toString());
      setTimeLeft(30);
    } catch (err) {
      // Mock for demo
      setCode(Math.floor(100000 + Math.random() * 900000).toString());
      setTimeLeft(30);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCode();
  }, [passId]);

  useEffect(() => {
    if (loading) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchCode();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, passId]);

  const circleRadius = 40;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (timeLeft / 30) * circleCircumference;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-[#D67D3E] flex flex-col items-center justify-center relative overflow-hidden">
      
      <div className="text-center z-10 mb-6">
        <p className="text-sm text-[#6B625B] font-bold uppercase tracking-widest mb-2">Mã đổi món</p>
        <div className="text-5xl font-mono font-bold tracking-[0.2em] text-[#543310]">
          {loading ? '------' : code}
        </div>
      </div>

      <div className="relative flex items-center justify-center w-24 h-24">
        <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            className="text-[#E8DED5] stroke-current"
            strokeWidth="8"
            cx="50"
            cy="50"
            r={circleRadius}
            fill="transparent"
          ></circle>
          <circle
            className="text-[#D67D3E] stroke-current transition-all duration-1000 ease-linear"
            strokeWidth="8"
            strokeLinecap="round"
            cx="50"
            cy="50"
            r={circleRadius}
            fill="transparent"
            strokeDasharray={circleCircumference}
            strokeDashoffset={strokeDashoffset}
          ></circle>
        </svg>
        <div className="text-xl font-bold text-[#D67D3E] absolute inset-0 flex items-center justify-center">
          {timeLeft}s
        </div>
      </div>

      <p className="text-xs text-[#6B625B] text-center mt-6">
        Mã sẽ tự động làm mới sau mỗi 30 giây.<br/>Vui lòng đưa mã này cho nhân viên để đổi nước.
      </p>

      {error && (
        <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20">
          <p className="text-[#B42318] font-bold mb-3">{error}</p>
          <button 
            onClick={fetchCode}
            className="flex items-center gap-2 px-4 py-2 bg-[#FAF7F3] rounded-lg text-[#543310] font-bold border border-[#E8DED5]"
          >
            <RefreshCcw size={16} /> Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
