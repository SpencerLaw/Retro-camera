import React from 'react';
import { Link } from 'react-router-dom';

export const VanglamNavbar: React.FC = () => {
  return (
    <nav className="fixed top-0 inset-x-0 h-[72px] bg-white/80 backdrop-blur-md border-b border-[#0F241F]/10 z-50 transition-all paper-texture">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/vanglam" className="font-serif text-lg md:text-xl font-bold text-[#0F241F] tracking-wide flex items-center">
          <span>QiLi Paper</span>
          <span className="font-sans font-light mx-2 text-[#0F241F]/30">|</span>
          <span className="font-semibold text-amber-800 tracking-[0.1em] text-sm md:text-base">VANGLAM</span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/vanglam-42" className="text-[11px] font-semibold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase">
            VANGLAM 42
          </Link>
          <a href="#products" className="text-[11px] font-semibold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase">
            Products
          </a>
          <a href="#surface-lab" className="text-[11px] font-semibold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase">
            Surface Lab
          </a>
          <a href="#applications" className="text-[11px] font-semibold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase">
            Applications
          </a>
          <a href="#request" className="text-[11px] font-semibold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase">
            Sample Book
          </a>
        </div>

        {/* Right Request Button */}
        <div>
          <a
            href="#request"
            className="px-5 py-2 border border-[#0F241F] rounded-full text-xs font-semibold text-[#0F241F] hover:bg-[#0F241F] hover:text-white transition-all uppercase tracking-wider"
          >
            Request
          </a>
        </div>
      </div>
    </nav>
  );
};
export default VanglamNavbar;
