import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  MessageCircle, 
  Copy, 
  Check, 
  Sparkles, 
  Truck, 
  QrCode,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { CartItem, StoreConfig } from '../types';
import { formatBRL, generateWhatsAppOrderMessage, getConditionDetails } from '../utils/formatters';
import { calculateCartSummary, getCardPricing } from '../utils/pricing';
import { CardImageWithFallback } from './CardImageWithFallback';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  config: StoreConfig;
  onUpdateQuantity: (cardId: string, quantity: number) => void;
  onRemoveItem: (cardId: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  config,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  if (!isOpen) return null;

  const [shippingType, setShippingType] = useState<'carta' | 'pac' | 'sedex' | 'retirada'>('carta');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao'>('pix');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  // Totals calculation using storewide promo and payment rules
  const summary = calculateCartSummary(items, config, shippingType, paymentMethod);
  const subtotal = summary.subtotalEffective;
  const shippingCost = summary.shippingCost;
  const isFreeShipping = summary.isFreeShipping;
  const hasPixDiscount = paymentMethod === 'pix' && typeof config.pixDiscountPercent === 'number' && config.pixDiscountPercent > 0;
  const discountAmount = summary.pixDiscountAmount;
  const totalFinal = summary.totalFinal;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(config.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleFinishWhatsApp = () => {
    const encodedMsg = generateWhatsAppOrderMessage(
      items,
      config,
      shippingType,
      shippingCost,
      paymentMethod,
      totalFinal,
      customerName,
      customerAddress,
      customerNotes
    );
    const cleanPhone = config.whatsapp.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <h2 className="font-display font-bold text-lg text-white">
                Seu Carrinho ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content Scrollable */}
          <div className="p-5 overflow-y-auto flex-1 space-y-6">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 text-slate-500 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-base font-bold text-slate-300">Seu carrinho está vazio</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Explore nosso catálogo exclusivo de TCG e adicione seus cards favoritos!
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Explorar Cards
                </button>
              </div>
            ) : (
              <>
                {/* Global Store Promo Banner if active */}
                {summary.isGlobalPromoActive && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-red-950/70 via-purple-950/70 to-amber-950/70 border border-red-500/40 text-amber-200 text-xs flex items-center gap-2.5 shadow-md">
                    <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                    <div>
                      <span className="font-extrabold text-white block">
                        🎉 {summary.globalPromoTitle} Ativa!
                      </span>
                      <span className="text-[11px] text-amber-200/90">
                        Desconto de -{summary.globalPromoPercent}% aplicado em todos os cards do carrinho!
                      </span>
                    </div>
                  </div>
                )}

                {/* List of items */}
                <div className="space-y-3">
                  {items.map((item) => {
                    const conditionMeta = getConditionDetails(item.card.condition);
                    const itemPricing = getCardPricing(item.card, config);
                    return (
                      <div
                        key={item.card.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 relative group"
                      >
                        <div className="w-14 h-18 shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 relative">
                          <CardImageWithFallback
                            card={item.card}
                            variant="thumbnail"
                            imgClassName="w-full h-full object-cover"
                          />
                          {item.card.isFoil && (
                            <span className="absolute bottom-0 inset-x-0 bg-amber-400 text-slate-950 text-[8px] font-black text-center z-10">
                              FOIL
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-white truncate" title={item.card.name}>
                            {item.card.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.card.setName}
                          </p>

                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${conditionMeta.badgeClass}`}>
                              {item.card.condition}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                              {item.card.language}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5">
                              {itemPricing.hasDiscount && itemPricing.originalPrice && (
                                <span className="text-[10px] text-slate-500 line-through">
                                  {formatBRL(itemPricing.originalPrice * item.quantity)}
                                </span>
                              )}
                              <span className="font-extrabold text-xs text-amber-400">
                                {formatBRL(itemPricing.effectivePrice * item.quantity)}
                              </span>
                              {itemPricing.isGlobalPromo && (
                                <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-1 rounded">
                                  -{itemPricing.discountPercent}%
                                </span>
                              )}
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center border border-slate-800 rounded-lg bg-slate-900">
                              <button
                                onClick={() => onUpdateQuantity(item.card.id, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(item.card.id, Math.min(item.card.stockQuantity, item.quantity + 1))}
                                className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Remove item */}
                        <button
                          onClick={() => onRemoveItem(item.card.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors self-start"
                          title="Remover card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Shipping Selection */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-cyan-400" />
                      Opções de Envio
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shipping"
                          checked={shippingType === 'carta'}
                          onChange={() => setShippingType('carta')}
                          className="text-amber-500 focus:ring-amber-500"
                        />
                        <span>Carta Registrada (Seguro TCG)</span>
                      </div>
                      <span className="font-bold text-slate-200">
                        {isFreeShipping ? 'Grátis' : formatBRL(config.shippingCartaRegistrada)}
                      </span>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shipping"
                          checked={shippingType === 'sedex'}
                          onChange={() => setShippingType('sedex')}
                          className="text-amber-500 focus:ring-amber-500"
                        />
                        <span>SEDEX Correios (Mais rápido)</span>
                      </div>
                      <span className="font-bold text-slate-200">
                        {formatBRL(config.shippingSedex)}
                      </span>
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shipping"
                          checked={shippingType === 'retirada'}
                          onChange={() => setShippingType('retirada')}
                          className="text-amber-500 focus:ring-amber-500"
                        />
                        <span>Retirada em Mãos / Evento</span>
                      </div>
                      <span className="font-bold text-emerald-400">Grátis</span>
                    </label>
                  </div>
                </div>

                {/* Payment Selection */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    Forma de Pagamento
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`p-2.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentMethod === 'pix'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span>PIX Imediato</span>
                      {config.pixDiscountPercent > 0 ? (
                        <span className="text-[10px] text-emerald-400 font-extrabold">
                          {config.pixDiscountPercent}% de Desconto
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400/80 font-medium">
                          Pagamento Direto
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cartao')}
                      className={`p-2.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        paymentMethod === 'cartao'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span>Cartão / Combinar</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Via WhatsApp
                      </span>
                    </button>
                  </div>

                  {paymentMethod === 'pix' && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Chave PIX da Loja ({config.pixKeyType}):</span>
                        <button
                          onClick={handleCopyPix}
                          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                        >
                          {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedPix ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div className="p-2 bg-slate-950 rounded-lg text-emerald-300 font-mono text-[11px] break-all select-all border border-slate-800">
                        {config.pixKey}
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Info Form */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  <span className="font-bold text-white block">Dados para Envio</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Cidade / Estado / CEP ou Endereço"
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Observação (opcional: mandar foto dos cards, etc)"
                    className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Checkout Bottom Action Bar */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-800 bg-slate-950 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-400">
                {summary.isGlobalPromoActive && summary.globalPromoDiscount > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal (Preço Base)</span>
                      <span className="text-slate-400 line-through">{formatBRL(summary.subtotalBase)}</span>
                    </div>
                    <div className="flex justify-between text-red-400 font-bold">
                      <span className="flex items-center gap-1">
                        <span>🎉 {summary.globalPromoTitle} (-{summary.globalPromoPercent}%)</span>
                      </span>
                      <span>-{formatBRL(summary.globalPromoDiscount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-white font-semibold">{formatBRL(subtotal)}</span>
                  </div>
                )}

                {hasPixDiscount && discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Desconto PIX ({config.pixDiscountPercent}%)</span>
                    <span>-{formatBRL(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Frete</span>
                  <span className="text-white font-semibold">
                    {shippingCost === 0 ? 'Grátis' : formatBRL(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold text-white">
                  <span>Total Final</span>
                  <span className="text-amber-400 font-display font-black text-lg">
                    {formatBRL(totalFinal)}
                  </span>
                </div>
              </div>

              {/* Action Button: WhatsApp Order */}
              <button
                onClick={handleFinishWhatsApp}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-display font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <MessageCircle className="w-5 h-5 text-slate-950" />
                <span>Finalizar Pedido pelo WhatsApp</span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Compra segura & envio protegido
                </span>
                <button
                  onClick={onClearCart}
                  className="hover:text-rose-400 transition-colors"
                >
                  Esvaziar Carrinho
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
