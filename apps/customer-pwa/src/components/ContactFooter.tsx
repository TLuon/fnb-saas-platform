import React from 'react';
import { Phone, Mail, MapPin, Globe, MessageCircle } from 'lucide-react';

export function ContactFooter() {
  return (
    <footer className="bg-transparent border-t border-white/40 pt-12 pb-8 mt-12">
      <div className="max-w-screen-xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <h3 className="text-xl font-bold font-serif text-[#543310] mb-4">F&B SaaS</h3>
          <p className="text-sm text-[#6B625B] leading-relaxed">
            Hệ thống quản lý chuỗi nhà hàng và chuỗi cà phê chuyên nghiệp, mang đến trải nghiệm tuyệt vời cho khách hàng và vận hành mượt mà cho nhân viên.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold text-[#222222] mb-4">Liên Hệ</h4>
          <ul className="space-y-3 text-sm text-[#6B625B]">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-[#D67D3E] shrink-0 mt-0.5" />
              <span>123 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-[#D67D3E] shrink-0" />
              <span>Hotline: 1900 1234</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-[#D67D3E] shrink-0" />
              <span>Email: contact@fnbsaas.vn</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-[#222222] mb-4">Mạng Xã Hội</h4>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-[#FAF7F3] flex items-center justify-center text-[#543310] hover:bg-[#D67D3E] hover:text-white transition-colors">
              <Globe size={20} />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-[#FAF7F3] flex items-center justify-center text-[#543310] hover:bg-[#D67D3E] hover:text-white transition-colors">
              <MessageCircle size={20} />
            </a>
          </div>
        </div>
      </div>
      
      <div className="max-w-screen-xl mx-auto px-4 pt-8 border-t border-black/10 text-center text-sm text-[#6B625B]">
        <p>&copy; {new Date().getFullYear()} F&B SaaS Platform. All rights reserved.</p>
      </div>
    </footer>
  );
}
