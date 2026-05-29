import React, { useState } from 'react';
import { VanglamNavbar } from './VanglamNavbar';
import { VanglamFooter } from './VanglamFooter';
import { COLOR_FAMILIES, PRODUCT_LINES, APPLICATIONS } from './vanglamData';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Layers, BookOpen, CheckCircle } from 'lucide-react';
import './vanglam.css';

export const VanglamHome: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFinish, setSelectedFinish] = useState<string>('TACTILE');

  // Parallax calculations for interactive Hero sheets
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const transformX1 = useTransform(mouseX, [-200, 200], [-10, 10]);
  const transformY1 = useTransform(mouseY, [-200, 200], [-10, 10]);
  const transformX2 = useTransform(mouseX, [-200, 200], [-20, 20]);
  const transformY2 = useTransform(mouseY, [-200, 200], [-20, 20]);
  const transformX3 = useTransform(mouseX, [-200, 200], [-30, 30]);
  const transformY3 = useTransform(mouseY, [-200, 200], [-30, 30]);

  // Surface Lab details text matching high fidelity
  const surfaceDetails: Record<string, { title: string; desc: string; bgClass: string }> = {
    TACTILE: { title: "TACTILE / 触感", desc: "如同丝绒、肌肤般温润细腻，为指尖留下深刻温度的特种触感涂层。", bgClass: "shadow-[0_0_40px_rgba(255,255,255,0.05)] border-white/5" },
    PEARL: { title: "PEARL / 珠光", desc: "散发幽微如贝壳、珍珠的矿物偏光，光影流动间彰显低调奢华。", bgClass: "shadow-[0_0_40px_rgba(255,250,230,0.15)] bg-gradient-to-br from-white/5 via-[#FFF5E6]/5 to-transparent border-amber-300/10" },
    EMBOSSING: { title: "EMBOSSING / 压纹", desc: "精密钢模压入纸张，呈现触手可及的颗粒及纤维纹理结构。", bgClass: "shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] border border-white/10" },
    COATING: { title: "COATING / 涂布", desc: "均匀细腻的微孔白土涂布，完美兼容各种数码及高精细商业印刷需求。", bgClass: "shadow-[0_0_20px_rgba(255,255,255,0.05)] border-white/5" },
    FOIL: { title: "FOIL / 烫金", desc: "高温电化铝转移工艺，与纸张纤维深度融合，呈现璀璨的熔金与烫银反光。", bgClass: "shadow-[0_0_45px_rgba(218,165,32,0.3)] bg-gradient-to-r from-amber-500/5 to-yellow-600/5 border border-amber-500/20" },
    UV: { title: "UV / 局部UV", desc: "局部透明高光树脂固化，与哑光纸面产生强烈的亮哑虚实视觉反差。", bgClass: "shadow-[0_0_30px_rgba(56,189,248,0.2)] border-sky-400/10" }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0F241F] pt-[72px] paper-texture overflow-x-hidden">
      <VanglamNavbar />

      {/* 01 HERO SECTION */}
      <section
        className="max-w-7xl mx-auto px-6 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center border-b border-[#0F241F]/10"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left Info Column */}
        <div className="lg:col-span-7 space-y-10">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-amber-800 tracking-[0.2em] block uppercase">01 HERO</span>
            <h1 className="text-5xl md:text-7xl font-serif font-extrabold tracking-tight text-[#0F241F] leading-[1.1]">
              Color, Paper & Surface for Premium Packaging
            </h1>
            <p className="text-[#0F241F]/80 text-base md:text-lg font-light tracking-wide mt-4">
              为高端包装、印刷与品牌视觉提供特种纸颜色与表面工艺系统
            </p>
          </div>

          {/* Highlights Capsules Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="flex items-center gap-3 px-4 py-3 bg-[#E5DFD5]/40 rounded-full border border-[#0F241F]/5">
              <CheckCircle size={14} className="text-amber-800" />
              <span className="text-xs font-semibold">3-Day Sample | 3天打样</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-[#E5DFD5]/40 rounded-full border border-[#0F241F]/5">
              <Layers size={14} className="text-amber-800" />
              <span className="text-xs font-semibold">MOQ 3,000 Sheets | 起订量 3000张</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-[#E5DFD5]/40 rounded-full border border-[#0F241F]/5">
              <BookOpen size={14} className="text-amber-800" />
              <span className="text-xs font-semibold">80-1300 gsm | 克重覆盖</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-[#E5DFD5]/40 rounded-full border border-[#0F241F]/5">
              <Sparkles size={14} className="text-amber-800" />
              <span className="text-xs font-semibold">Custom Color | 颜色与表面定制</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => navigate('/vanglam-42')}
              className="px-8 py-4 bg-[#0F241F] text-white rounded-full font-bold hover:bg-[#183932] hover:scale-105 transition-all shadow-lg tracking-widest text-xs uppercase"
            >
              EXPLORE VANGLAM 42
            </button>
            <a
              href="#request"
              className="px-8 py-4 bg-[#E5DFD5] text-[#0F241F] rounded-full font-bold hover:bg-[#d5cebf] hover:scale-105 transition-all tracking-widest text-xs uppercase"
            >
              REQUEST SAMPLE BOOK
            </a>
            <a
              href="#request"
              className="px-6 py-4 border border-[#0F241F]/30 hover:border-[#0F241F] rounded-full font-bold hover:bg-[#FAF8F5]/50 transition-all tracking-widest text-xs uppercase"
            >
              START A PROJECT
            </a>
          </div>
        </div>

        {/* Right Stacked Paper Animation */}
        <div className="lg:col-span-5 flex items-center justify-center relative aspect-square w-full max-w-md mx-auto h-[450px]">
          {/* Card 4 - Deep Green */}
          <motion.div
            style={{ x: transformX3, y: transformY3, rotate: 10 }}
            className="absolute w-[80%] h-[75%] rounded-[2rem] bg-[#0F241F] shadow-2xl border border-white/5 flex flex-col justify-end p-8 text-white paper-texture"
          >
            <div className="space-y-1">
              <span className="text-[9px] font-mono tracking-widest text-amber-500 font-bold">COLOR & PATTERN</span>
              <h3 className="text-3xl font-serif font-extrabold tracking-wide uppercase">VANGLAM</h3>
              <p className="text-[10px] text-white/50 tracking-[0.2em]">COLOR · PAPER · SURFACE</p>
            </div>
          </motion.div>

          {/* Card 3 - Golden Ochre */}
          <motion.div
            style={{ x: transformX2, y: transformY2, rotate: 4 }}
            className="absolute w-[80%] h-[75%] rounded-[2rem] bg-[#B0883E] shadow-2xl border border-white/10 flex flex-col justify-between p-8 text-white"
          >
            <div className="w-full flex justify-between items-start">
              <span className="text-[9px] font-mono tracking-widest uppercase">Select Deck</span>
              <span className="text-xs font-serif font-bold tracking-widest">QiLi</span>
            </div>
            <h3 className="text-xl font-serif tracking-wider font-semibold">Premium Texture Cards</h3>
          </motion.div>

          {/* Card 2 - Muted Sand */}
          <motion.div
            style={{ x: transformX1, y: transformY1, rotate: -4 }}
            className="absolute w-[80%] h-[75%] rounded-[2rem] bg-[#E5DFD5] shadow-2xl border border-black/5 flex flex-col justify-between p-8 text-[#0F241F]"
          >
            <div className="w-full flex justify-between items-start">
              <span className="text-[9px] font-mono tracking-widest uppercase font-bold">Gilded Earth</span>
              <span className="text-xs font-serif font-bold tracking-widest">B04</span>
            </div>
            <h3 className="text-xl font-serif tracking-wider font-semibold">OXIDE CLAY MATTE</h3>
          </motion.div>
        </div>
      </section>

      {/* 02 VANGLAM 42 COLOR SYSTEM */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-b border-[#0F241F]/10">
        <div className="space-y-2 mb-16">
          <span className="text-[10px] font-bold text-amber-800 tracking-[0.2em] block uppercase">02 VANGLAM 42 COLOR SYSTEM</span>
          <h2 className="text-3xl md:text-4xl font-serif font-extrabold tracking-tight">42色核心标准体系</h2>
          <p className="text-xs text-gray-500 font-medium tracking-wider">6 families / 42 colors / 3 signature colors</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {COLOR_FAMILIES.map((family) => (
            <motion.div
              key={family.id}
              whileHover={{ y: -8 }}
              onClick={() => navigate(`/vanglam-42?family=${family.id}`)}
              className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-md flex items-stretch h-48 cursor-pointer group transition-all duration-300"
            >
              {/* Info Area */}
              <div className="w-1/2 p-8 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 font-mono tracking-wider">FAMILY</span>
                  <h3 className="text-lg font-bold font-serif text-[#0F241F] group-hover:text-amber-800 transition-colors leading-tight">{family.nameEn}</h3>
                  <p className="text-xs text-gray-500 font-medium">{family.nameZh} 色族</p>
                </div>
                <span className="text-[9px] font-bold text-amber-800 font-mono tracking-widest uppercase">Explore →</span>
              </div>
              {/* Slanted Color Slice */}
              <div className="w-1/2 relative overflow-hidden">
                <div className={`absolute inset-y-0 -left-8 right-0 slash-cut-${family.id} transition-transform duration-500 group-hover:scale-105`} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 03 SEVEN PRODUCT LINES */}
      <section id="products" className="max-w-7xl mx-auto px-6 py-24 border-b border-[#0F241F]/10">
        <div className="space-y-2 mb-16">
          <span className="text-[10px] font-bold text-amber-800 tracking-[0.2em] block uppercase">03 SEVEN PRODUCT LINES</span>
          <h2 className="text-3xl md:text-4xl font-serif font-extrabold tracking-tight">七大核心产品线</h2>
          <p className="text-xs text-gray-500 font-medium tracking-wider">Color Print / Touch / Pearl / Surface / Bag / Label / Bespoke Lab</p>
        </div>

        {/* Asymmetric Layout Grid */}
        <div className="space-y-6">
          {/* Row 1 (4 items) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRODUCT_LINES.slice(0, 4).map((line) => (
              <div key={line.id} className="bg-[#FAF8F5] p-8 rounded-[2rem] border border-[#0F241F]/5 shadow-sm space-y-6 hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-3xl font-serif font-light text-gray-300">{line.num}</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-800" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-serif text-[#0F241F] tracking-wide">{line.nameEn}</h4>
                  <p className="text-xs text-gray-500 font-medium">{line.nameZh}</p>
                </div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-mono border-t border-gray-100 pt-3">{line.subtitle}</p>
              </div>
            ))}
          </div>
          {/* Row 2 (3 items) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRODUCT_LINES.slice(4).map((line) => (
              <div key={line.id} className="bg-[#FAF8F5] p-8 rounded-[2rem] border border-[#0F241F]/5 shadow-sm space-y-6 hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-3xl font-serif font-light text-gray-300">{line.num}</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-800" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-serif text-[#0F241F] tracking-wide">{line.nameEn}</h4>
                  <p className="text-xs text-gray-500 font-medium">{line.nameZh}</p>
                </div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-mono border-t border-gray-100 pt-3">{line.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04 APPLICATIONS */}
      <section id="applications" className="max-w-7xl mx-auto px-6 py-24 border-b border-[#0F241F]/10">
        <div className="space-y-2 mb-16">
          <span className="text-[10px] font-bold text-amber-800 tracking-[0.2em] block uppercase">04 APPLICATIONS</span>
          <h2 className="text-3xl md:text-4xl font-serif font-extrabold tracking-tight">按应用场景选纸</h2>
          <p className="text-xs text-gray-500 font-medium tracking-wider">Find the right paper by application</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {APPLICATIONS.map((app, index) => (
            <div
              key={index}
              className="rounded-[2rem] p-10 flex flex-col justify-between aspect-[4/3] relative overflow-hidden border border-black/5 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 shadow-sm"
              style={{ backgroundColor: app.bgHex }}
            >
              <div className="space-y-2 relative z-10">
                <h4 className={`text-2xl font-serif font-extrabold leading-tight tracking-wide ${app.textLight ? 'text-white' : 'text-[#0F241F]'}`}>
                  {app.titleEn}
                </h4>
                <p className={`text-[10px] uppercase tracking-wider font-semibold ${app.textLight ? 'text-white/50' : 'text-[#0F241F]/50'}`}>{app.subEn}</p>
              </div>

              <div className="space-y-1 relative z-10 pt-6 border-t border-white/10">
                <span className={`text-base font-bold block ${app.textLight ? 'text-white' : 'text-[#0F241F]'}`}>{app.titleZh}</span>
                <p className={`text-xs ${app.textLight ? 'text-white/40' : 'text-[#0F241F]/40'}`}>{app.subZh}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 05 SURFACE LAB */}
      <section id="surface-lab" className="w-full bg-[#0B1714] text-white py-28 px-6 relative paper-texture overflow-hidden border-b border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Info Details */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-amber-500 tracking-[0.2em] block uppercase">05 SURFACE LAB</span>
              <h2 className="text-3xl md:text-4xl font-serif font-extrabold tracking-tight">表面，决定颜色触感知的方式。</h2>
              <p className="text-xs text-amber-500/70 font-medium tracking-wider">Tactile / Pearl / Embossing / Coating / Foil / UV / Screen Printing</p>
            </div>

            <p className="text-gray-400 text-sm md:text-base font-light leading-relaxed">
              触觉、反射率、折射率、深浅颗粒纹理……我们不仅赋予纸张极致完美的中国古典色彩体系，更专注于为每一片材料匹配最适宜的表面微工艺处理，让品牌与消费者的接触充满难忘的视觉与触觉惊喜。
            </p>

            {/* Simulated Live Renderer */}
            <div className={`p-10 bg-black/50 rounded-[2.5rem] border border-white/10 ${surfaceDetails[selectedFinish].bgClass} transition-all duration-500 relative min-h-[220px] flex flex-col justify-end overflow-hidden`}>
              <div className="space-y-3 relative z-10">
                <h4 className="text-xl font-bold font-serif text-amber-500 tracking-wide">{surfaceDetails[selectedFinish].title}</h4>
                <p className="text-xs text-gray-300 leading-relaxed font-light">{surfaceDetails[selectedFinish].desc}</p>
              </div>
            </div>
          </div>

          {/* Interactive Buttons Grid */}
          <div className="lg:col-span-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(surfaceDetails).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedFinish(key)}
                className={`py-10 px-4 rounded-[2rem] border text-center font-bold tracking-wider text-xs transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                  selectedFinish === key
                    ? 'bg-[#FAF8F5] text-[#0B1714] border-white shadow-2xl scale-105 font-extrabold'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <span className="font-mono text-sm tracking-widest">{key}</span>
                <span className="text-[10px] font-medium opacity-60">
                  {key === 'TACTILE' && '触感'}
                  {key === 'PEARL' && '珠光'}
                  {key === 'EMBOSSING' && '压纹'}
                  {key === 'COATING' && '涂布'}
                  {key === 'FOIL' && '烫金/烫银'}
                  {key === 'UV' && '局部UV'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <VanglamFooter />
    </div>
  );
};
export default VanglamHome;
