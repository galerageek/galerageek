import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Sparkles, 
  Check, 
  Zap, 
  Swords, 
  Shield, 
  ScrollText, 
  Tag,
  Edit3
} from 'lucide-react';
import { CardItem, StoreConfig } from '../types';
import { formatBRL, getConditionDetails, getGameMeta } from '../utils/formatters';
import { getCardPricing } from '../utils/pricing';
import { CardFallbackPlaceholder } from './CardFallbackPlaceholder';

interface CardDetailModalProps {
  card: CardItem | null;
  config?: StoreConfig;
  pixDiscountPercent?: number;
  isAdmin?: boolean;
  onUpdateCard?: (card: CardItem) => void;
  onEditCard?: (card: CardItem) => void;
  onClose: () => void;
  onAddToCart: (card: CardItem, quantity: number) => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  config,
  pixDiscountPercent = 0,
  isAdmin = false,
  onUpdateCard,
  onEditCard,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [currentImgSrc, setCurrentImgSrc] = useState<string>(card?.imageUrl || '');
  const [retryStage, setRetryStage] = useState<number>(0);
  const [imageError, setImageError] = useState<boolean>(!card?.imageUrl);
  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);
  const [editDescriptionText, setEditDescriptionText] = useState<string>(card?.description || '');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<boolean>(false);

  React.useEffect(() => {
    setCurrentImgSrc(card?.imageUrl || '');
    setRetryStage(0);
    setImageError(!card?.imageUrl);
    setQuantity(1);
    setAdded(false);
    setIsEditingDescription(false);
    setEditDescriptionText(card?.description || '');
    setSavedSuccessMsg(false);
  }, [card?.imageUrl, card?.id, card?.description]);

  if (!card) return null;

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

  // Infer cardType if missing so no card appears without type
  const getResolvedCardType = (): string => {
    if (card.cardType && card.cardType.trim().length > 0 && card.cardType !== 'Card Colecionável') {
      return card.cardType;
    }
    const nameNorm = (card.name || '').toLowerCase();
    const descNorm = (card.description || '').toLowerCase();
    if (nameNorm.includes('boifalo') || nameNorm.includes('bôifalo') || nameNorm.includes('bulvox')) {
      return 'Criatura — Besta';
    }
    if (card.game === 'magic') {
      if (descNorm.includes('criatura') || (card.power && card.toughness)) return 'Criatura';
      if (descNorm.includes('artefato lendário')) return 'Artefato Lendário';
      if (descNorm.includes('artefato')) return 'Artefato';
      if (descNorm.includes('encantamento')) return 'Encantamento';
      if (descNorm.includes('mágica instantânea') || descNorm.includes('instant')) return 'Mágica Instantânea';
      if (descNorm.includes('feitiço') || descNorm.includes('sorcery')) return 'Feitiço';
      if (descNorm.includes('planeswalker')) return 'Planeswalker';
      if (descNorm.includes('terreno') || descNorm.includes('land')) return 'Terreno';
      return 'Card de Magic';
    }
    if (card.game === 'pokemon') {
      if (nameNorm.includes(' ex') || descNorm.includes('fase 2')) return 'Pokémon Fase 2 — ex';
      if (nameNorm.includes(' v')) return 'Pokémon Básico — V';
      return 'Pokémon Básico';
    }
    if (card.game === 'lorcana') {
      return 'Character';
    }
    if (card.game === 'onepiece') {
      if (nameNorm.includes('zoro') && !nameNorm.includes('luffy')) return 'Líder Supernovas / Piratas do Chapéu de Palha';
      return 'Personagem Chapéu de Palha';
    }
    if (card.game === 'riftbound') {
      return 'Champion Unit';
    }
    return 'Card Colecionável';
  };

  const resolvedType = getResolvedCardType();
  const nameNorm = (card.name || '').toLowerCase();
  const isBoifalo = nameNorm.includes('boifalo') || nameNorm.includes('bôifalo') || nameNorm.includes('bulvox');
  
  const resolvedCost = card.manaCost || (isBoifalo ? '{6}{G}{G}' : undefined);
  const resolvedPower = card.power || (isBoifalo ? '7' : undefined);
  const resolvedToughness = card.toughness || (isBoifalo ? '4' : undefined);

  const handleAdd = () => {
    onAddToCart(card, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button & Admin Quick Edit Button */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {isAdmin && onEditCard && (
            <button
              onClick={() => onEditCard(card)}
              className="px-3 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg backdrop-blur"
              title="Editar card completo no Painel Admin"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editar Card</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Left Side: Card Artwork Display & Physical Attributes */}
        <div className="md:w-5/12 bg-slate-950 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
          <div className="relative w-full max-w-[270px] aspect-[1/1.4] rounded-2xl overflow-hidden shadow-2xl shadow-slate-950 border border-slate-800 flex items-center justify-center">
            {!imageError && currentImgSrc ? (
              <>
                <img
                  src={currentImgSrc}
                  alt={card.name}
                  onError={handleImageError}
                  className={`w-full h-full object-contain ${card.isFoil ? 'foil-shine' : ''}`}
                />
                {card.rarity === 'Enchanted' || (card.finishType && card.finishType.toLowerCase().includes('enchanted')) ? (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500 via-pink-400 to-amber-300 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    ENCHANTED
                  </div>
                ) : card.isFoil ? (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    FOIL
                  </div>
                ) : null}
              </>
            ) : (
              <CardFallbackPlaceholder card={card} variant="card" />
            )}
          </div>

          {/* Physical Single Attributes */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${conditionMeta.badgeClass}`}>
              Condição: {card.condition}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300">
              Idioma: {card.language}
            </span>
            {card.finishType && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-950/60 border border-purple-800/80 text-amber-300">
                {card.finishType}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Exact Card Information (Type, Cost, Power/Toughness, Rules Text & Purchase) */}
        <div className="md:w-7/12 p-6 sm:p-7 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            {/* Header: Game & Collection Info */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider border ${gameMeta.accentBg}`}>
                {gameMeta.title}
              </span>
              <span className="text-xs text-slate-400">
                {card.setName} ({card.setCode} • #{card.cardNumber})
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                {card.rarity}
              </span>
            </div>

            {/* Card Name */}
            <div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                {card.name}
              </h2>
            </div>

            {/* TCG Stats Bar: Tipo, Custo, Poder/Resistência */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5 shadow-inner">
              {/* Card Type Line */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Tipo do Card:
                </span>
                <span className="text-xs font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                  {resolvedType}
                </span>
              </div>

              {/* Stats Grid: Custo / Mana e Poder / Resistência / HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Cost / Mana Cost */}
                {resolvedCost && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      Custo / Mana:
                    </span>
                    <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                      {resolvedCost}
                    </span>
                  </div>
                )}

                {/* Power / Toughness (Combat Stats) */}
                {resolvedPower && resolvedToughness ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Swords className="w-3.5 h-3.5 text-amber-400" />
                      Poder / Resistência:
                    </span>
                    <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                      {resolvedPower} / {resolvedToughness}
                    </span>
                  </div>
                ) : resolvedPower ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      {card.game === 'pokemon' ? 'Pontos de Vida (HP):' : 'Poder:'}
                    </span>
                    <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                      {resolvedPower}
                    </span>
                  </div>
                ) : null}

                {/* Planeswalker Loyalty */}
                {card.loyalty && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      Lealdade:
                    </span>
                    <span className="font-mono font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                      {card.loyalty}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Efeitos & Habilidades (Texto do Card) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Efeitos e Habilidades:</span>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditDescriptionText(card.description || '');
                      setIsEditingDescription(!isEditingDescription);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-semibold"
                    title="Editar descrição e efeitos deste card diretamente"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditingDescription ? 'Fechar Edição' : 'Editar Texto'}</span>
                  </button>
                )}
              </div>

              {savedSuccessMsg && (
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5 font-semibold animate-in fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Descrição do card atualizada com sucesso!</span>
                </div>
              )}

              {isEditingDescription ? (
                <div className="space-y-2 p-3 rounded-2xl bg-slate-950 border border-amber-500/40 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Editor Rápido de Descrição:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditDescriptionText((prev) => prev + '\n')}
                        className="text-amber-400 hover:underline text-[10px]"
                      >
                        + Linha
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditDescriptionText('')}
                        className="text-rose-400 hover:underline text-[10px]"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={editDescriptionText}
                    onChange={(e) => setEditDescriptionText(e.target.value)}
                    placeholder="Digite os efeitos, habilidades, palavras-chave e texto de regras deste card..."
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs leading-relaxed focus:outline-none focus:border-amber-400 font-sans resize-y"
                  />
                  <div className="flex items-center justify-between pt-1">
                    {isAdmin && onEditCard && (
                      <button
                        type="button"
                        onClick={() => onEditCard(card)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                      >
                        Abrir Editor Completo no Painel
                      </button>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setIsEditingDescription(false)}
                        className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateCard) {
                            onUpdateCard({
                              ...card,
                              description: editDescriptionText,
                            });
                          }
                          setIsEditingDescription(false);
                          setSavedSuccessMsg(true);
                          setTimeout(() => setSavedSuccessMsg(false), 3000);
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Salvar Texto
                      </button>
                    </div>
                  </div>
                </div>
              ) : card.description && card.description.trim().length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {card.description.split('\n').filter(Boolean).map((paragraph, idx) => (
                    <p 
                      key={idx} 
                      className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-400 italic">
                    Texto de regras padrão da edição oficial.
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditDescriptionText('');
                        setIsEditingDescription(true);
                      }}
                      className="text-[11px] text-amber-400 hover:underline font-semibold"
                    >
                      + Adicionar texto
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Pricing & Checkout Box */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-bold text-slate-400">Preço</span>
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
