import React from 'react';
import { Camera, Sparkles, Heart } from 'lucide-react';

interface HomePageProps {
  onSelectProject: (project: 'camera' | 'fortune' | 'couple') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectProject }) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#dfd3c3] via-[#c9b99b] to-[#b8a082] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("https://www.transparenttextures.com/patterns/cork-board.png")`,
        }}
      />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 border-4 border-[#8b4513] rotate-12 opacity-30"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 border-4 border-[#8b4513] -rotate-12 opacity-30"></div>
      
      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="font-marker text-7xl md:text-9xl text-[#8b4513] mb-4 drop-shadow-lg">
            My Studio
          </h1>
          <p className="text-2xl md:text-3xl text-[#5c4033] font-marker opacity-80">
            Choose Your Experience
          </p>
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {/* Retro Camera Card */}
          <div 
            onClick={() => onSelectProject('camera')}
            className="group relative bg-white rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl border-4 border-[#8b4513] shadow-xl"
          >
            {/* Card Background Pattern */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-10"
              style={{
                backgroundImage: `url("https://www.transparenttextures.com/patterns/cork-board.png")`,
              }}
            />
            
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-[#ff6b6b] to-[#ee5a6f] rounded-full flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
                <Camera size={64} className="text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-marker text-4xl text-[#8b4513] mb-3">Retro Camera</h2>
              <p className="text-lg text-[#5c4033] mb-4 opacity-80">
                复古相机 • 即时拍照
              </p>
              <p className="text-sm text-[#5c4033] opacity-70 leading-relaxed">
                Capture moments with vintage filters and create your own photo wall
              </p>
              
              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-2 border-dashed border-[#8b4513] opacity-30">
                <div className="inline-block px-4 py-2 bg-[#8b4513] text-white rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300">
                  Enter →
                </div>
              </div>
            </div>

            {/* Hover Effect Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#ff6b6b]/0 via-[#ff6b6b]/20 to-[#ff6b6b]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>

          {/* Fortune Sticks Card */}
          <div 
            onClick={() => onSelectProject('fortune')}
            className="group relative bg-gradient-to-br from-[#2b0a0a] to-[#1a0202] rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl border-4 border-[#d4af37] shadow-xl"
          >
            {/* Card Background Pattern */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-[#d4af37] to-[#bf953f] rounded-full flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
                <Sparkles size={64} className="text-[#2b0a0a]" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-serif text-4xl text-[#ffd700] mb-3 font-bold">靈簽 Fortune</h2>
              <p className="text-lg text-[#e6cca0] mb-4 opacity-90">
                诚心祈求 • 指点迷津
              </p>
              <p className="text-sm text-[#e6cca0] opacity-80 leading-relaxed">
                Draw a fortune stick and receive AI-powered guidance for your future
              </p>
              
              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-2 border-dashed border-[#d4af37] opacity-30">
                <div className="inline-block px-4 py-2 bg-[#d4af37] text-[#2b0a0a] rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300">
                  Enter →
                </div>
              </div>
            </div>

            {/* Hover Effect Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#d4af37]/0 via-[#d4af37]/20 to-[#d4af37]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>

          {/* Couple Game Card */}
          <div 
            onClick={() => onSelectProject('couple')}
            className="group relative bg-gradient-to-br from-[#FF00C0] via-[#8000FF] to-[#00C0FF] rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl border-4 border-white/30 shadow-xl"
          >
            {/* Card Background Pattern */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Icon */}
            <div className="relative z-10 flex justify-center mb-6">
              <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-300 border-2 border-white/30">
                <Heart size={64} className="text-white" fill="white" />
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h2 className="font-bold text-4xl text-white mb-3 drop-shadow-lg">心跳契约</h2>
              <p className="text-lg text-white/90 mb-4 opacity-90">
                Heartbeat Pact
              </p>
              <p className="text-sm text-white/80 opacity-90 leading-relaxed">
                Couple's game with fun challenges and slot machine animation
              </p>
              
              {/* Decorative Border */}
              <div className="mt-6 pt-6 border-t-2 border-dashed border-white/30 opacity-50">
                <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-bold transform group-hover:scale-110 transition-transform duration-300 border border-white/30">
                  Enter →
                </div>
              </div>
            </div>

            {/* Hover Effect Glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 space-y-3">
          <p className="text-[#5c4033] opacity-60 text-sm font-marker">
            Click on a card to begin your journey
          </p>
          
          {/* Version Badge with Glow Effect */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full blur opacity-75 group-hover:opacity-100 animate-pulse"></div>
              <div className="relative px-6 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full">
                <span className="text-white font-bold text-sm tracking-wider drop-shadow-lg">
                  v1.0.0
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

