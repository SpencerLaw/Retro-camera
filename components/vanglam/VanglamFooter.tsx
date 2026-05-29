import React from 'react';

export const VanglamFooter: React.FC = () => {
  return (
    <footer id="request" className="w-full bg-[#0A1A14] text-white py-20 px-6 relative paper-texture">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/10 pb-16">
        <div className="space-y-3 text-center md:text-left">
          <span className="text-[10px] font-bold text-amber-500 tracking-[0.2em] uppercase">FINAL CTA</span>
          <h2 className="text-3xl md:text-4xl font-serif tracking-wide font-bold">Request the VANGLAM 42 Color Deck</h2>
          <p className="text-gray-400 text-sm font-light">申请 42 色卡与表面工艺样册，开始您的材料项目。</p>
        </div>
        <button className="px-8 py-4 bg-[#FAF8F5] text-[#0A1A14] rounded-full font-bold hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-2xl tracking-widest text-xs uppercase">
          REQUEST SAMPLE BOOK
        </button>
      </div>
      <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row justify-between text-[11px] text-gray-500 gap-4">
        <p>© 2026 QiLi Paper | VANGLAM. All Rights Reserved. 齐力纸业有限公司 版权所有.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
        </div>
      </div>
    </footer>
  );
};
export default VanglamFooter;
