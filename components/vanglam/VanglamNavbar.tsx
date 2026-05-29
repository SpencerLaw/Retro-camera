import React from 'react';
import { Link } from 'react-router-dom';

// Smooth scroll helper that works reliably regardless of fixed navbar offset
const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};

export const VanglamNavbar: React.FC = () => {
  return (
    <nav className="fixed top-0 inset-x-0 h-[72px] bg-white/90 backdrop-blur-md border-b border-[#0F241F]/10 z-50 transition-all">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/vanglam" className="font-serif text-lg md:text-xl font-bold text-[#0F241F] tracking-wide flex items-center">
          <span>QiLi Paper</span>
          <span className="font-sans font-light mx-2 text-[#0F241F]/30">|</span>
          <span className="font-semibold text-amber-800 tracking-[0.1em] text-sm md:text-base">VANGLAM</span>
        </Link>

        {/* Nav Links — use JS scroll to ensure fixed-header offset works */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/vanglam-42"
            className="text-[11px] font-bold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase"
          >
            VANGLAM 42
          </Link>
          <button
            onClick={() => scrollToSection('products')}
            className="text-[11px] font-bold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase bg-transparent border-none cursor-pointer"
          >
            PRODUCTS
          </button>
          <button
            onClick={() => scrollToSection('surface-lab')}
            className="text-[11px] font-bold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase bg-transparent border-none cursor-pointer"
          >
            SURFACE LAB
          </button>
          <button
            onClick={() => scrollToSection('applications')}
            className="text-[11px] font-bold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase bg-transparent border-none cursor-pointer"
          >
            APPLICATIONS
          </button>
          <button
            onClick={() => scrollToSection('request')}
            className="text-[11px] font-bold text-[#0F241F]/70 hover:text-[#0F241F] tracking-[0.2em] transition-colors uppercase bg-transparent border-none cursor-pointer"
          >
            SAMPLE BOOK
          </button>
        </div>

        {/* Right Request Button */}
        <button
          onClick={() => scrollToSection('request')}
          className="px-5 py-2 border border-[#0F241F] rounded-full text-xs font-bold text-[#0F241F] hover:bg-[#0F241F] hover:text-white transition-all uppercase tracking-wider cursor-pointer"
        >
          REQUEST
        </button>
      </div>
    </nav>
  );
};
export default VanglamNavbar;
