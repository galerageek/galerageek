import React, { useState } from 'react';
import { ShoppingBag, Eye, Sparkles, Check, Zap, PartyPopper } from 'lucide-react';
import { CardItem, StoreConfig } from '../types';
import { formatBRL, getConditionDetails, getGameMeta } from '../utils/formatters';
import { getCardPricing } from '../utils/pricing';
import { CardFallbackPlaceholder } from './CardFallbackPlaceholder';

interface CardItemViewProps {
  card: CardItem;
  config?: StoreConfig;
  pixDiscountPercent?: number;
  onAddToCart: (card: CardItem) => void;
  onViewDetails?: (card: CardItem) => void;
  onSelect?: (card: CardItem) => void;
}

export const CardItemView: React.FC<CardItemViewProps> = ({
  card,
  config,
  pixDiscountPercent = 0,
  onAddToCart,
  onViewDetails,
  onSelect,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [currentImgSrc, setCurrentImgSrc] = useState<string>(card.imageUrl || '');
  const [retryStage, setRetryStage] = useState<number>(0);

  // Sync image source if card prop changes
  React.useEffect(() => {
    setCurrentImgSrc(card.imageUrl || '');
    setImageError(false);
    setRetryStage(0);
  }, [card.imageUrl]);

  const handleImageError = () => {
    if (!currentImgSrc) {
      setImageError(true);
      return;
    }

    if (retryStage === 0) {
      // 1st fallback: If not already using wsrv.nl, try wsrv.nl WebP converter
      if (!currentImgSrc.includes('wsrv.nl')) {
        setRetryStage(1);
        const rawToProxy = currentImgSrc.includes('/api/card-image-proxy?url=')
          ? decodeURIComponent(currentImgSrc.split('/api/card-image-proxy?url=')[1])
          : currentImgSrc;
        setCurrentImgSrc(`https://wsrv.nl/?url=${encodeURIComponent(rawToProxy)}&output=webp`);
        return;
      } else {
        // If wsrv failed, try backend proxy directly
        setRetryStage(1);
        const original = decodeURIComponent(currentImgSrc.split('url=')[1]?.split('&')[0] || currentImgSrc);
        setCurrentImgSrc(`/api/card-image-proxy?url=${encodeURIComponent(original)}`);
        return;
      }
    } else if (retryStage === 1) {
      // 2nd fallback: try backend proxy or raw
      setRetryStage(2);
      if (!currentImgSrc.includes('/api/card-image-proxy')) {
        const raw = currentImgSrc.includes('wsrv.nl')
          ? decodeURIComponent(currentImgSrc.split('url=')[1]?.split('&')[0] || '')
          : currentImgSrc;
        if (raw) {
          setCurrentImgSrc(`/api/card-image-proxy?url=${encodeURIComponent(raw)}`);
          return;
        }
      }
      setImageError(true);
    } else {
      setImageError(true);
    }
  };

  const gameMeta = getGameMeta(card.game);
  const conditionMeta = getConditionDetails(card.condition);

  const effectiveConfig = config || { pixDiscountPercent };
  const pricing = getCardPricing(card, effectiveConfig);
  const hasPixDiscount = (effectiveConfig.pixDiscountPercent || 0) > 0;

  const handleOpenDetails = () => {
    if (onViewDetails) {
      onViewDetails(card);
    } else if (onSelect) {
      onSelect(card);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.stockQuantity <= 0) return;
    onAddToCart(card);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  return (
    <div
      className="group relative h-full bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:shadow-xl hover:shadow-amber-950/20 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Media: Card Artwork with Standard TCG Aspect Ratio (63mm x 88mm) */}
      <div 
        className="relative w-full aspect-[63/88] bg-slate-950/80 overflow-hidden cursor-pointer flex items-center justify-center p-2 sm:p-2.5 select-none"
        onClick={handleOpenDetails}
      >
        {/* Card Artwork */}
        {!imageError && currentImgSrc ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={currentImgSrc}
              alt={card.name}
              onError={handleImageError}
              className={`max-w-full max-h-full object-contain rounded-[6px] drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)] ring-1 ring-white/10 transition-transform duration-300 ease-out group-hover:scale-[1.03] ${
                card.isFoil ? 'foil-shine' : ''
              }`}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CardFallbackPlaceholder card={card} variant="card" />
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10 gap-1">
          {/* Game Pill */}
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md border shadow-sm ${gameMeta.accentBg}`}>
            {gameMeta.badge}
          </span>

          <div className="flex items-center gap-1">
            {/* Storewide Promotion Tag */}
            {pricing.isGlobalPromo && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-md animate-pulse">
                <PartyPopper className="w-2.5 h-2.5" />
                -{pricing.discountPercent}%
              </span>
            )}

            {/* Foil Tag */}
            {card.isFoil && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400 text-slate-950 shadow-md">
                <Sparkles className="w-2.5 h-2.5" />
                FOIL
              </span>
            )}
          </div>
        </div>

        {/* Condition & Language Pill at bottom of image */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border backdrop-blur-md shadow-sm ${conditionMeta.badgeClass}`}>
              {card.condition}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-950/85 text-slate-300 border border-slate-700/80 backdrop-blur-md">
              {card.language}
            </span>
          </div>

          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-950/85 text-slate-400 border border-slate-800 backdrop-blur-md">
            #{card.cardNumber}
          </span>
        </div>

        {/* Hover quick action overlay on Desktop */}
        <div className={`absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-200 hidden sm:flex items-center justify-center gap-2 z-20 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetails();
            }}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-xl transition-transform hover:scale-110 active:scale-95"
            title="Ver detalhes do card"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={handleAdd}
            disabled={card.stockQuantity <= 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              addedAnimation 
                ? 'bg-emerald-500 text-slate-950' 
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            {addedAnimation ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
            <span>{addedAnimation ? 'Pronto!' : card.stockQuantity > 0 ? '+ Adicionar' : 'Esgotado'}</span>
          </button>
        </div>
      </div>

      {/* Card Information Body: Rigorously Fixed Heights for 100% Uniform Alignment */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between bg-slate-900/90">
        <div>
          {/* Card Title (Locked to 2 lines max with minimum height for uniform alignment) */}
          <div className="min-h-[2.5rem] flex flex-col justify-start">
            <h3 
              onClick={handleOpenDetails}
              className="font-bold text-xs sm:text-sm text-white hover:text-amber-400 transition-colors line-clamp-2 leading-tight cursor-pointer" 
              title={card.name}
            >
              {card.name}
            </h3>
          </div>

          {/* Set Name (Locked to 1 line) */}
          <p className="text-[11px] text-slate-400 truncate mt-0.5 h-4" title={card.setName}>
            {card.setName} ({card.setCode})
          </p>

          {/* Attributes / Rarity Row (Locked height) */}
          <div className="mt-1.5 h-5 flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 font-semibold text-slate-300">
              {card.rarity}
            </span>
            {card.finishType ? (
              <span className="truncate text-slate-400">
                {card.finishType}
              </span>
            ) : (
              <span className="truncate text-slate-500">
                Normal
              </span>
            )}
          </div>
        </div>

        {/* Bottom Section: Uniform Price Baseline & Stock */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80">
          {/* Discount / Original price row (always reserves exact h-4 height to keep prices aligned) */}
          <div className="h-4 flex items-center gap-1.5">
            {pricing.hasDiscount && pricing.originalPrice ? (
              <>
                <span className="text-[11px] text-slate-500 line-through">
                  {formatBRL(pricing.originalPrice)}
                </span>
                <span className={`text-[10px] font-bold px-1 rounded ${
                  pricing.isGlobalPromo 
                    ? 'text-red-400 bg-red-500/10 border border-red-500/20' 
                    : 'text-amber-400 bg-amber-500/10'
                }`}>
                  -{pricing.discountPercent}%
                </span>
              </>
            ) : (
              <span className="text-[10px] text-slate-600 font-medium">À vista</span>
            )}
          </div>

          {/* Price and Stock Row */}
          <div className="flex items-end justify-between mt-0.5">
            <div>
              <div className="font-display font-black text-base sm:text-lg text-white leading-none">
                {formatBRL(pricing.effectivePrice)}
              </div>
              {hasPixDiscount && (
                <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-400 flex items-center gap-1 mt-1 leading-none">
                  <Zap className="w-3 h-3 shrink-0" />
                  <span>{formatBRL(pricing.pixPrice)} PIX</span>
                </div>
              )}
            </div>

            {/* Stock Indicator */}
            <div className="text-right">
              {card.stockQuantity > 0 ? (
                <span className="text-[10px] sm:text-[11px] font-medium text-emerald-400 flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {card.stockQuantity} un
                </span>
              ) : (
                <span className="text-[10px] sm:text-[11px] font-medium text-rose-400 flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Esgotado
                </span>
              )}
            </div>
          </div>

          {/* Mobile Add to Cart Button (uniform height and placement) */}
          <button
            onClick={handleAdd}
            disabled={card.stockQuantity <= 0}
            className={`mt-2.5 w-full sm:hidden h-8 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
              addedAnimation
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950'
            }`}
          >
            {addedAnimation ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
            <span>{addedAnimation ? 'Adicionado!' : card.stockQuantity > 0 ? 'Adicionar' : 'Esgotado'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
