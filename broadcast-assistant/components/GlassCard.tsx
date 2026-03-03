import React from 'react';

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`backdrop-blur-2xl bg-white/70 dark:bg-white/10 border border-white/40 dark:border-white/20 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.05)] ${className}`}>
        {children}
    </div>
);

export default GlassCard;
