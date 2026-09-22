import React from 'react';
import { Sparkles, Shield, Anchor, Zap, Compass, BookOpen } from 'lucide-react';
import { CardItem, TCGGame } from '../types';

interface CardFallbackPlaceholderProps {
  card: Pick<CardItem, 'name' | 'game' | 'setName' | 'setCode' | 'cardNumber' | 'rarity' | 'condition' | 'isFoil' | 'colorOrAttribute'>;
  variant?: 'card' | 'thumbnail' | 'modal';
  className?: string;
}

export const CardFallbackPlaceholder: React.FC<CardFallbackPlaceholderProps> = ({
  card,
  variant = 'card',
  className = ''
}) => {
  const isThumbnail = variant === 'thumbnail';
  const isModal = variant === 'modal';

  // Game-specific visual themes
  const getTheme = (game: TCGGame) => {
    switch (game) {
      case 'onepiece':
        return {
          bgGradient: 'from-amber-950/80 via-slate-950 to-blue-950/90',
          borderColor: 'border-amber-600/60',
          accentColor: 'text-amber-400',
          badgeBg: 'bg-red-950/90 text-amber-300 border-amber-500/40',
          subText: 'ONE PIECE CARD GAME',
          icon: Anchor,
          motif: '⚓ Piratas & Tesouros',
          pattern: 'radial-gradient(circle at 50% 30%, rgba(217, 119, 6, 0.15), transparent 70%)'
        };
      case 'riftbound':
        return {
          bgGradient: 'from-purple-950/90 via-slate-950 to-cyan-950/80',
          borderColor: 'border-cyan-500/50',
          accentColor: 'text-cyan-400',
          badgeBg: 'bg-purple-950/90 text-cyan-300 border-cyan-500/40',
          subText: 'RIFTBOUND TCG',
          icon: Zap,
          motif: '⚡ Runeterra Hextech',
          pattern: 'radial-gradient(circle at 50% 30%, rgba(6, 182, 212, 0.15), transparent 70%)'
        };
      case 'magic':
        return {
          bgGradient: 'from-slate-900 via-slate-950 to-amber-950/60',
          borderColor: 'border-amber-600/40',
          accentColor: 'text-amber-300',
          badgeBg: 'bg-slate-900 text-amber-300 border-amber-600/30',
          subText: 'MAGIC: THE GATHERING',
          icon: Compass,
          motif: '🔮 Multiverso',
          pattern: 'radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.12), transparent 70%)'
        };
      case 'pokemon':
        return {
          bgGradient: 'from-blue-950 via-slate-950 to-amber-950/50',
          borderColor: 'border-amber-400/60',
          accentColor: 'text-amber-400',
          badgeBg: 'bg-blue-950 text-amber-300 border-amber-400/40',
          subText: 'POKÉMON TCG',
          icon: Zap,
          motif: '⚡ Stadium Colecionável',
          pattern: 'radial-gradient(circle at 50% 30%, rgba(234, 179, 8, 0.15), transparent 70%)'
        };
      case 'lorcana':
      default:
        return {
          bgGradient: 'from-violet-950 via-slate-950 to-indigo-950',
          borderColor: 'border-purple-400/50',
          accentColor: 'text-purple-300',
          badgeBg: 'bg-purple-950 text-amber-300 border-purple-400/40',
          subText: 'DISNEY LORCANA',
          icon: BookOpen,
          motif: '✨ Tinta Encantada',
          pattern: 'radial-gradient(circle at 50% 30%, rgba(168, 85, 247, 0.18), transparent 70%)'
        };
    }
  };

  const theme = getTheme(card.game);
  const IconComponent = theme.icon;

  // 1. Thumbnail View (table rows or cart list)
  if (isThumbnail) {
    return (
      <div
        className={`w-full h-full relative rounded-lg border ${theme.borderColor} bg-gradient-to-b ${theme.bgGradient} flex flex-col items-center justify-between p-1 select-none overflow-hidden ${
          card.isFoil ? 'foil-shine' : ''
        } ${className}`}
        title={`${card.name} (${theme.subText} - Arte Temática)`}
      >
        <div className="w-full flex items-center justify-between text-[8px] font-black leading-none opacity-80">
          <span className="font-mono">{card.setCode || 'TCG'}</span>
          <IconComponent className={`w-2.5 h-2.5 ${theme.accentColor}`} />
        </div>

        <div className="text-center px-0.5 my-auto">
          <p className="text-[9px] font-black text-white leading-tight line-clamp-2">
            {card.name}
          </p>
        </div>

        <div className="w-full flex items-center justify-between text-[7px] font-mono font-bold text-slate-400">
          <span>#{card.cardNumber || '001'}</span>
          <span className="px-1 py-0.2 rounded bg-black/60 text-amber-300 text-[6px]">
            {card.condition || 'NM'}
          </span>
        </div>
      </div>
    );
  }

  // 2. Card Grid or Modal View (TCG Aspect Ratio 63:88)
  return (
    <div
      role="img"
      aria-label={`Fallback visual de ${card.name} - ${theme.subText}`}
      style={{ backgroundImage: theme.pattern }}
      className={`w-full h-full aspect-[63/88] relative rounded-xl sm:rounded-2xl border-2 ${
        theme.borderColor
      } bg-gradient-to-b ${theme.bgGradient} flex flex-col justify-between p-3.5 sm:p-4 select-none overflow-hidden shadow-2xl drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)] ${
        card.isFoil ? 'foil-shine' : ''
      } ${className}`}
    >
      {/* Subtle Inner Decorative Filigree Border */}
      <div className="absolute inset-1.5 rounded-lg sm:rounded-xl border border-white/10 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-1 border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded-md bg-white/5 border border-white/10 shrink-0">
            <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme.accentColor}`} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase text-slate-300 truncate">
            {theme.subText}
          </span>
        </div>

        <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold bg-black/60 text-slate-400 border border-white/5 shrink-0">
          {card.setCode || 'ED'} #{card.cardNumber || '---'}
        </span>
      </div>

      {/* Center Centerpiece: Game Crest & Title */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2 text-center px-1">
        {/* Animated Glow Crest Ring */}
        <div className="relative mb-2.5 sm:mb-3">
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-purple-500/20 rounded-full blur-md opacity-60 animate-pulse" />
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/80 border-2 border-white/15 flex items-center justify-center shadow-inner">
            <IconComponent className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.accentColor}`} />
          </div>
          {card.isFoil && (
            <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-gradient-to-r from-amber-400 to-pink-400 text-slate-950 shadow-md">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          )}
        </div>

        {/* Card Official Name */}
        <h3 className="font-extrabold text-white text-xs sm:text-sm line-clamp-2 px-1 tracking-tight leading-snug drop-shadow-md">
          {card.name}
        </h3>

        {/* Collection Subtitle */}
        <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1 line-clamp-1 max-w-[200px]">
          {card.setName || 'Coleção Oficial'}
        </p>

        {/* Motif Badge */}
        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-slate-300 font-semibold">
          <span>{theme.motif}</span>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="relative z-10 border-t border-white/10 pt-2 flex items-center justify-between text-[9px] sm:text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-amber-400/90 font-mono">
            {card.rarity || 'Rara'}
          </span>
          {card.colorOrAttribute && (
            <span className="text-slate-400 hidden sm:inline">• {card.colorOrAttribute}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 font-bold text-slate-300 text-[8px] sm:text-[9px]">
            {card.condition}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 font-bold text-slate-300 text-[8px] sm:text-[9px]">
            {card.language}
          </span>
        </div>
      </div>

      {/* Informational watermark at bottom */}
      <div className="relative z-10 text-center mt-1">
        <span className="text-[8px] text-slate-500/80 font-mono">
          Galera Geek • Card Original
        </span>
      </div>
    </div>
  );
};
