import React from 'react';

export function Logo({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm font-serif">GK</span>
        </div>
        <span className="font-serif italic text-xl">GrooveKit</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
        <span className="text-primary-foreground font-bold text-lg font-serif">GK</span>
      </div>
      <div>
        <span className="font-serif italic text-2xl leading-none">The Groove Kit</span>
      </div>
    </div>
  );
}
