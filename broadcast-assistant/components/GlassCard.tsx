import React from 'react';

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`backdrop-blur-[24px] bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 ${className}`}>
        {/* Subtle inner highlight to simulate light hitting the edge */}
        <div className="absolute inset-0 rounded-[2.5rem] border border-white/20 pointer-events-none" />
        {children}
    </div>
);

export default GlassCard;
