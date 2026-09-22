import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Package,
  Layers,
  Zap,
  Info
} from 'lucide-react';
import { CardItem, StoreConfig } from '../types';
import { formatBRL, getConditionDetails, getGameMeta } from '../utils/formatters';
import { getCardPricing } from '../utils/pricing';
import { CardFallbackPlaceholder } from './CardFallbackPlaceholder';

interface CardDetailModalProps {
  card: CardItem | null;
  config?: StoreConfig;
  pixDiscountPercent?: number;
  onClose: () => void;
  onAddToCart: (card: CardItem, quantity: number) => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  config,
  pixDiscountPercent = 0,
  onClose,
  onAddToCart,
}) => {
  if (!card) return null;

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'shipping' | 'conditionGuide'>('details');
  const [currentImgSrc, setCurrentImgSrc] = useState<string>(card.imageUrl || '');
  const [retryStage, setRetryStage] = useState<number>(0);
  const [imageError, setImageError] = useState<boolean>(!card.imageUrl);

  React.useEffect(() => {
    setCurrentImgSrc(card.imageUrl || '');
    setRetryStage(0);
    setImageError(!card.imageUrl);
  }, [card.imageUrl]);

  const handleImageError = () => {
    if (!currentImgSrc) {
      setImageError(true);
      return;
    }

    if (retryStage === 0) {
      if (!currentImgSrc.includes('wsrv.nl')) {
        setRetryStage(1);
        const rawToProxy = currentImgSrc.includes('/api/card-image-proxy?url=')
          ? decodeURIComponent(currentImgSrc.split('/api/card-image-proxy?url=')[1])
          : currentImgSrc;
        setCurrentImgSrc(`https://wsrv.nl/?url=${encodeURIComponent(rawToProxy)}&output=webp`);
        return;
      } else {
        setRetryStage(1);
        const original = decodeURIComponent(currentImgSrc.split('url=')[1]?.split('&')[0] || currentImgSrc);
        setCurrentImgSrc(`/api/card-image-proxy?url=${encodeURIComponent(original)}`);
        return;
      }
    } else if (retryStage === 1) {
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

  const handleAdd = () => {
    onAddToCart(card, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Card Artwork Display */}
        <div className="md:w-5/12 bg-slate-950 p-6 sm:p-8 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-800">
          <div className="relative w-full max-w-[280px] aspect-[1/1.4] rounded-2xl overflow-hidden shadow-2xl shadow-slate-950 border border-slate-800 flex items-center justify-center">
            {!imageError && currentImgSrc ? (
              <>
                <img
                  src={currentImgSrc}
                  alt={card.name}
                  onError={handleImageError}
                  className={`w-full h-full object-contain ${card.isFoil ? 'foil-shine' : ''}`}
                />
                {card.isFoil && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    FOIL
                  </div>
                )}
              </>
            ) : (
              <CardFallbackPlaceholder card={card} variant="card" />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${conditionMeta.badgeClass}`}>
              Condição: {card.condition}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300">
              Idioma: {card.language}
            </span>
            {card.finishType && (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-950/60 border border-purple-800/80 text-amber-300">
                {card.finishType}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Details & Actions */}
        <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Game Badge & Set */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider border ${gameMeta.accentBg}`}>
                {gameMeta.title}
              </span>
              <span className="text-xs text-slate-400">
                {card.setCode} • #{card.cardNumber}
              </span>
            </div>

            <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              {card.name}
            </h2>
            <p className="text-sm text-slate-400 font-medium mt-1">
              {card.setName} ({card.rarity})
            </p>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 border-b border-slate-800 mt-6 pb-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 px-1 transition-colors relative ${
                  activeTab === 'details' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Detalhes do Card
                {activeTab === 'details' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />}
              </button>

              <button
                onClick={() => setActiveTab('shipping')}
                className={`pb-2 px-1 transition-colors relative flex items-center gap-1.5 ${
                  activeTab === 'shipping' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Envio & Proteção</span>
                {activeTab === 'shipping' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />}
              </button>

              <button
                onClick={() => setActiveTab('conditionGuide')}
                className={`pb-2 px-1 transition-colors relative ${
                  activeTab === 'conditionGuide' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Guia de Conservação
                {activeTab === 'conditionGuide' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="mt-4">
              {activeTab === 'details' && (
                <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                  {card.description && (
                    <p className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 leading-relaxed">
                      "{card.description}"
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block font-medium">Tipo de Card</span>
                      <span className="font-semibold text-white">{card.cardType || 'Card Colecionável'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block font-medium">Cor / Atributo</span>
                      <span className="font-semibold text-white">{card.colorOrAttribute || 'Padrão'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block font-medium">Raridade</span>
                      <span className="font-semibold text-amber-300">{card.rarity}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block font-medium">Proteção</span>
                      <span className="font-semibold text-cyan-300">Sleeve Protetor</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <Package className="w-4 h-4" />
                      <span>Padrão Galera Geek de Envio Seguro</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Sabemos o valor da sua coleção. Por isso, cada card avulso comprado na <strong>Galera Geek</strong> é embalado com rigor profissional:
                    </p>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-400 pt-1">
                      <li><strong>Sleeve protetor individual</strong></li>
                      <li><strong>Proteção reforçada</strong> contra dobras e impactos</li>
                      <li><strong>Envelope seguro</strong> e fita de proteção</li>
                      <li>Código de rastreamento direto nos Correios</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'conditionGuide' && (
                <div className="space-y-2 text-xs text-slate-300 max-h-48 overflow-y-auto pr-1">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-emerald-400 block">NM (Near Mint)</span>
                    <span className="text-slate-400">Estado impecável. Card direto do booster ou com imperfeições quase imperceptíveis.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-blue-400 block">SP (Slightly Played)</span>
                    <span className="text-slate-400">Leves sinais de manuseio ou bordas minimamente esbranquiçadas.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-amber-400 block">MP (Moderately Played)</span>
                    <span className="text-slate-400">Desgaste aparente nas bordas ou cantos, marcas leves de embaralhamento.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-bold text-rose-400 block">HP (Heavily Played) / D (Damaged)</span>
                    <span className="text-slate-400">Desgaste severo, dobras ou vincos visíveis.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Pricing & Checkout Box */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-bold text-slate-400">Preço Galera Geek</span>
                {pricing.isGlobalPromo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-sm">
                    🎉 {pricing.promoTitle} (-{pricing.discountPercent}%)
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                {pricing.hasDiscount && pricing.originalPrice && (
                  <span className="text-base sm:text-lg text-slate-500 line-through">
                    {formatBRL(pricing.originalPrice)}
                  </span>
                )}
                <span className="font-display font-black text-3xl text-white">
                  {formatBRL(pricing.effectivePrice)}
                </span>
                {hasPixDiscount && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-0.5">
                    <Zap className="w-3.5 h-3.5" />
                    {formatBRL(pricing.pixPrice)} no PIX ({effectiveConfig.pixDiscountPercent}% OFF)
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                {card.stockQuantity > 0 ? `Estoque disponível: ${card.stockQuantity} un.` : 'Card esgotado no momento'}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {card.stockQuantity > 0 && (
                <div className="flex items-center border border-slate-700 bg-slate-950 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg hover:bg-slate-800 text-white font-bold flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span className="w-9 text-center font-bold text-sm text-white">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(card.stockQuantity, quantity + 1))}
                    className="w-8 h-8 rounded-lg hover:bg-slate-800 text-white font-bold flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={card.stockQuantity <= 0}
                className={`flex-1 sm:flex-initial px-6 py-3 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  added 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:scale-[1.02] active:scale-[0.98]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    Adicionado!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    {card.stockQuantity > 0 ? 'Adicionar ao Carrinho' : 'Sem Estoque'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
