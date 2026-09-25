'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { PublicHeader } from '../components/PublicHeader';
import { BranchInfoBar } from '../components/BranchInfoBar';
import { FeaturedMenuSection } from '../components/FeaturedMenuSection';
import { ContactFooter } from '../components/ContactFooter';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Coffee } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

export default function Home() {
  const router = useRouter();
  const { requireAuth } = useAuthGuard();
  const container = useRef<HTMLElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from('.hero-title', { y: 50, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.2 })
      .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6')
      .from('.hero-btn', { scale: 0.9, opacity: 0, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.1 }, '-=0.4')
      .from('.floating-bean', { y: 100, opacity: 0, duration: 1.5, ease: 'power2.out', stagger: 0.2 }, '-=1');

    gsap.to('.floating-bean', {
      y: 'random(-20, 20)',
      x: 'random(-10, 10)',
      rotation: 'random(-15, 15)',
      duration: 'random(3, 5)',
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      stagger: 0.5,
    });
  }, { scope: container });

  const handleReservation = () => {
    requireAuth(() => {
      router.push('/floors');
    });
  };

  return (
    <main ref={container} className="min-h-screen bg-[var(--color-brand-neutral)] flex flex-col relative overflow-hidden">
      {/* Background gradients for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand-neutral)] via-[#FFF] to-[var(--color-brand-accent)]/30 z-0"></div>
      
      {/* Abstract background blobs for glassmorphism effect */}
      <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-[var(--color-brand-secondary)]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-[25rem] h-[25rem] bg-[var(--color-brand-primary)]/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: '2s' }}></div>
      <div className="absolute -bottom-32 left-1/2 w-[40rem] h-[40rem] bg-[var(--color-brand-accent)]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob" style={{ animationDelay: '4s' }}></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="backdrop-blur-xl bg-white/60 sticky top-0 z-50 border-b border-white/40 shadow-sm">
          <PublicHeader />
          <BranchInfoBar />
        </div>
        
        {/* Hero Area */}
        <section className="relative py-20 px-4 md:py-32 flex-1 flex flex-col items-center justify-center text-center">
          {/* Floating beans decor */}
          <Coffee className="floating-bean absolute top-20 left-[10%] text-[var(--color-brand-primary)]/20 w-12 h-12" />
          <Coffee className="floating-bean absolute bottom-32 right-[15%] text-[var(--color-brand-secondary)]/20 w-16 h-16" />
          <Coffee className="floating-bean absolute top-1/2 left-[25%] text-[var(--color-brand-accent)] w-8 h-8" />
          <Coffee className="floating-bean absolute top-[30%] right-[20%] text-[var(--color-brand-primary)]/10 w-20 h-20" />

          <div className="relative z-10 max-w-screen-xl mx-auto px-4">
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-serif text-[var(--color-brand-primary)] mb-4 leading-tight drop-shadow-sm">
              <span className="hero-title block text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)] pb-2">
                The F&B SaaS Coffee
              </span>
            </h1>
            
            <p className="hero-subtitle text-[var(--color-brand-primary)]/80 max-w-2xl mx-auto mb-4 text-xl md:text-2xl font-bold leading-relaxed tracking-wide">
              ✨ Hương vị tuyệt hảo, trải nghiệm khó quên.
            </p>

            <div className="hero-subtitle flex flex-wrap justify-center gap-4 md:gap-8 mt-2 mb-10 text-[var(--color-brand-primary)]/90 font-bold text-sm md:text-base">
              <span className="flex items-center gap-1.5"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Cà phê nguyên chất</span>
              <span className="flex items-center gap-1.5"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Không gian yên tĩnh</span>
              <span className="flex items-center gap-1.5"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Chỗ ngồi thoải mái</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => router.push('/menu')}
                className="hero-btn group relative px-8 py-4 bg-[var(--color-brand-primary)] text-white font-bold rounded-2xl overflow-hidden shadow-xl hover:shadow-[0_8px_30px_rgb(84,51,16,0.3)] transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2 text-lg">
                  Xem thực đơn
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-brand-secondary)] to-[var(--color-brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              
              <button 
                onClick={handleReservation}
                className="hero-btn group px-8 py-4 backdrop-blur-md bg-white/50 text-[var(--color-brand-primary)] font-bold text-lg border-2 border-white/80 rounded-2xl hover:bg-white/80 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                Đặt bàn ngay
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="relative z-10 backdrop-blur-2xl bg-white/70 border-t border-white/60 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <FeaturedMenuSection />
        <ContactFooter />
      </div>
    </main>
  );
}
