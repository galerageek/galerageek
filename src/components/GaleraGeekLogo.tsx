import React from 'react';

interface GaleraGeekLogoProps {
  className?: string;
  customLogoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  inBadge?: boolean;
}

export const GaleraGeekLogo: React.FC<GaleraGeekLogoProps> = ({
  className = 'w-11 h-11',
  customLogoUrl,
  inBadge = false,
}) => {
  if (customLogoUrl) {
    if (inBadge) {
      return (
        <div className={`p-1.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-md overflow-hidden ${className}`}>
          <img
            src={customLogoUrl}
            alt="Galera Geek"
            className="w-full h-full object-contain select-none"
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    return (
      <img
        src={customLogoUrl}
        alt="Galera Geek"
        className={`object-contain select-none ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Exact original Galera Geek logo emblem (GG gradient badge)
  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-amber-500 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-950/50 select-none shrink-0 ${className}`}
    >
      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-display font-black text-amber-400 tracking-tighter">
        <span>GG</span>
      </div>
    </div>
  );
};
