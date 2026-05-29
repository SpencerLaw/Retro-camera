import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { VanglamNavbar } from './VanglamNavbar';
import { VanglamFooter } from './VanglamFooter';
import { COLOR_FAMILIES } from './vanglamData';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './vanglam.css';

export const VanglamColorDeck: React.FC = () => {
  const location = useLocation();
  const familyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    window.scrollTo(0, 0);
    const params = new URLSearchParams(location.search);
    const familyId = params.get('family');
    if (familyId && familyRefs.current[familyId]) {
      setTimeout(() => {
        familyRefs.current[familyId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const el = familyRefs.current[familyId];
        if (el) {
          el.classList.add('ring-[8px]', 'ring-amber-800/10', 'bg-amber-800/5');
          setTimeout(() => {
            el.classList.remove('ring-[8px]', 'ring-amber-800/10', 'bg-amber-800/5');
          }, 2500);
        }
      }, 500);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0F241F] pt-24 paper-texture overflow-x-hidden">
      <VanglamNavbar />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Back Link */}
        <Link to="/vanglam" className="inline-flex items-center gap-2 text-[10px] font-bold text-[#0F241F]/60 hover:text-[#0F241F] mb-10 transition-colors uppercase tracking-[0.25em]">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        {/* 01 Header & 3 Large Chips */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-24 border-b border-[#0F241F]/10 pb-16">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-[10px] font-bold text-amber-800 tracking-[0.2em] block uppercase">VANGLAM 42 SYSTEM</span>
            <h1 className="text-6xl md:text-8xl font-serif font-extrabold tracking-tight">VANGLAM 42</h1>
            <p className="text-base md:text-lg text-[#0F241F]/80 leading-relaxed font-light font-serif max-w-xl">
              A 42-color material system created for specialty paper, premium packaging and surface finishing.<br/>
              <span className="font-sans text-xs text-[#0F241F]/60 block mt-3 font-normal leading-normal">一套为特种纸、高端包装与表面工艺建立的42色材料系统。</span>
            </p>
          </div>

          {/* Three large signature colors */}
          <div className="lg:col-span-6 grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="aspect-[3/4] rounded-2xl shadow-xl border border-black/5" style={{ backgroundColor: '#1E5A44' }} />
              <div className="text-center">
                <span className="block text-[10px] font-bold text-gray-400 font-mono">D06</span>
                <span className="text-xs font-semibold block">石绿</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Mineral Green</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="aspect-[3/4] rounded-2xl shadow-xl border border-black/5" style={{ backgroundColor: '#9C8A3B' }} />
              <div className="text-center">
                <span className="block text-[10px] font-bold text-gray-400 font-mono">B03</span>
                <span className="text-xs font-semibold block">秋香</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Aged Citron</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="aspect-[3/4] rounded-2xl shadow-xl border border-black/5" style={{ backgroundColor: '#1E3F66' }} />
              <div className="text-center">
                <span className="block text-[10px] font-bold text-gray-400 font-mono">E04</span>
                <span className="text-xs font-semibold block">钴蓝</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Cobalt Glaze</span>
              </div>
            </div>
          </div>
        </section>

        {/* 02 Six Families Color Catalog */}
        <section className="space-y-24 mb-28">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-amber-800 tracking-[0.2em] block uppercase">MATERIAL ARCHIVE</span>
            <h2 className="text-3xl md:text-4xl font-serif font-extrabold tracking-tight">Six Families / 六大色族</h2>
          </div>
          
          {COLOR_FAMILIES.map((family) => {
            // Determine columns representation matching Page 3 grids precisely
            let gridColClass = "grid grid-cols-2 md:grid-cols-4 gap-6";
            if (family.id === 'cask-reserve' || family.id === 'mineral-sea') {
              // 5 chips in 1 row
              gridColClass = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6";
            }

            return (
              <div
                key={family.id}
                ref={(el) => { familyRefs.current[family.id] = el; }}
                className="space-y-8 p-8 rounded-3xl transition-all duration-700 border border-transparent"
              >
                <div className="border-l-4 pl-4 border-[#B0883E] space-y-1">
                  <h3 className="text-2xl font-bold font-serif tracking-wide">{family.nameEn}</h3>
                  <p className="text-xs text-gray-500 font-medium tracking-wider">{family.nameZh} 色族 · {family.chips.length} 色</p>
                </div>

                <div className={gridColClass}>
                  {family.chips.map((chip) => (
                    <motion.div
                      key={chip.id}
                      whileHover={{ y: -6, scale: 1.02 }}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 flex flex-col transition-all duration-300"
                    >
                      {/* Color Fill */}
                      <div className="w-full aspect-[4/3] relative shadow-inner" style={{ backgroundColor: chip.hex }}>
                        {/* Subtle fiber simulation overlay */}
                        <div className="absolute inset-0 opacity-10 bg-radial-gradient pointer-events-none" />
                      </div>
                      {/* Labels */}
                      <div className="p-4 bg-white flex flex-col gap-1 border-t border-gray-50/50">
                        <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wider">{chip.id}</span>
                        <span className="text-sm font-bold text-[#0F241F] tracking-wide">{chip.nameZh}</span>
                        <span className="text-[9px] text-gray-400 uppercase tracking-widest font-sans font-medium">{chip.nameEn}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* 03 Recommended Surface Direction */}
        <section className="bg-[#FAF8F5] rounded-[3rem] p-8 md:p-16 mb-24 border border-[#0F241F]/10 paper-texture">
          <div className="space-y-12">
            <div className="space-y-2 border-b border-[#0F241F]/10 pb-6">
              <span className="text-[10px] font-bold text-amber-800 tracking-[0.2em] block uppercase">SURFACE RECOMMENDER</span>
              <h2 className="text-3xl font-serif font-extrabold tracking-tight">Recommended Surface Direction</h2>
              <p className="text-xs text-[#0F241F]/60">每个颜色只设一个主推表面，工艺是放大颜色气质，不是覆盖颜色本身。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-full bg-[#E5DFD5]/40 flex items-center justify-center text-[10px] font-bold font-mono">01</div>
                <h4 className="text-xs font-bold text-amber-800 tracking-widest uppercase">Light Neutrals</h4>
                <p className="text-[11px] text-gray-400 font-serif italic">Pearl / Matte Print / Letterpress</p>
                <p className="text-xs font-medium text-gray-700 leading-relaxed pt-2 border-t border-gray-50">浅色适合微珠光、压凹、数码印刷</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-gray-100 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-full bg-[#E5DFD5]/40 flex items-center justify-center text-[10px] font-bold font-mono">02</div>
                <h4 className="text-xs font-bold text-amber-800 tracking-widest uppercase">Earth Tones</h4>
                <p className="text-[11px] text-gray-400 font-serif italic">Tactile / Fine Texture / Foil</p>
                <p className="text-xs font-medium text-gray-700 leading-relaxed pt-2 border-t border-gray-50">暖色适合触感、细微纹理、熔金</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-gray-100 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-full bg-[#E5DFD5]/40 flex items-center justify-center text-[10px] font-bold font-mono">03</div>
                <h4 className="text-xs font-bold text-amber-800 tracking-widest uppercase">Greens & Blues</h4>
                <p className="text-[11px] text-gray-400 font-serif italic">Tactile / Embossed / Local UV</p>
                <p className="text-xs font-medium text-gray-700 leading-relaxed pt-2 border-t border-gray-50">青绿蓝适合触感、压纹、局部UV</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-gray-100 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-full bg-[#E5DFD5]/40 flex items-center justify-center text-[10px] font-bold font-mono">04</div>
                <h4 className="text-xs font-bold text-amber-800 tracking-widest uppercase">Deep Colors</h4>
                <p className="text-[11px] text-gray-400 font-serif italic">Foil / White Ink / Deep Process</p>
                <p className="text-xs font-medium text-gray-700 leading-relaxed pt-2 border-t border-gray-50">深色适合烫金银、白墨、局部UV</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <VanglamFooter />
    </div>
  );
};
export default VanglamColorDeck;
