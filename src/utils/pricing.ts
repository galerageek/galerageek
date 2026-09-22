import { CardItem, StoreConfig, CartItem } from '../types';

export interface CardPricingResult {
  /** Preço de venda efetivo na loja (após desconto global se ativo) */
  effectivePrice: number;
  /** Preço original de referência para efeito "de: R$ X por: R$ Y" */
  originalPrice: number | null;
  /** Se há algum desconto ativo (global ou individual) */
  hasDiscount: boolean;
  /** Porcentagem total de desconto exibida */
  discountPercent: number;
  /** Se o desconto decorre da promoção geral da loja */
  isGlobalPromo: boolean;
  /** Título da promoção ativa (ex: 'Promoção de Aniversário') */
  promoTitle: string;
  /** Preço à vista no PIX considerando o desconto do PIX sobre o preço efetivo */
  pixPrice: number;
}

/**
 * Calcula o preço efetivo de um card levando em consideração a promoção global da loja
 * (ex: -10% em tudo para aniversário) e o desconto à vista no PIX.
 */
export function getCardPricing(card: CardItem, config?: Partial<StoreConfig>): CardPricingResult {
  const isGlobalActive = Boolean(
    config?.globalPromoActive &&
    typeof config?.globalPromoPercent === 'number' &&
    config.globalPromoPercent > 0
  );

  const pixDiscountPercent = typeof config?.pixDiscountPercent === 'number' ? config.pixDiscountPercent : 0;

  if (isGlobalActive) {
    const promoPercent = config!.globalPromoPercent!;
    const promoTitle = config!.globalPromoTitle?.trim() || 'Promoção de Aniversário';

    // Se o card já tinha um originalPrice maior, preserva-o; caso contrário, usa o preço base como original
    const originalPrice = card.originalPrice && card.originalPrice > card.price 
      ? card.originalPrice 
      : card.price;

    // Aplica o percentual da promoção geral
    const discounted = card.price * (1 - promoPercent / 100);
    const effectivePrice = Math.max(0.01, Math.round(discounted * 100) / 100);

    const discountPercent = Math.max(
      promoPercent,
      Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
    );

    const pixPrice = pixDiscountPercent > 0
      ? Math.max(0.01, Math.round(effectivePrice * (1 - pixDiscountPercent / 100) * 100) / 100)
      : effectivePrice;

    return {
      effectivePrice,
      originalPrice,
      hasDiscount: true,
      discountPercent,
      isGlobalPromo: true,
      promoTitle,
      pixPrice,
    };
  }

  // Preço padrão normal sem promoção global
  const hasIndividualDiscount = Boolean(card.originalPrice && card.originalPrice > card.price);
  const effectivePrice = card.price;
  const originalPrice = hasIndividualDiscount ? card.originalPrice! : null;
  const discountPercent = hasIndividualDiscount
    ? Math.round(((card.originalPrice! - card.price) / card.originalPrice!) * 100)
    : 0;

  const pixPrice = pixDiscountPercent > 0
    ? Math.max(0.01, Math.round(effectivePrice * (1 - pixDiscountPercent / 100) * 100) / 100)
    : effectivePrice;

  return {
    effectivePrice,
    originalPrice,
    hasDiscount: hasIndividualDiscount,
    discountPercent,
    isGlobalPromo: false,
    promoTitle: '',
    pixPrice,
  };
}

export interface CartCalculationSummary {
  /** Subtotal base somando os preços normais cadastrados */
  subtotalBase: number;
  /** Subtotal efetivo somando os preços com desconto da promoção global */
  subtotalEffective: number;
  /** Valor total economizado pela promoção global */
  globalPromoDiscount: number;
  /** Se a promoção global está ativa */
  isGlobalPromoActive: boolean;
  globalPromoTitle: string;
  globalPromoPercent: number;
  /** Custo de frete */
  shippingCost: number;
  isFreeShipping: boolean;
  /** Desconto do pagamento via PIX */
  pixDiscountAmount: number;
  /** Total a pagar */
  totalFinal: number;
}

export function calculateCartSummary(
  items: CartItem[],
  config: StoreConfig,
  shippingType: 'carta' | 'pac' | 'sedex' | 'retirada',
  paymentMethod: 'pix' | 'cartao'
): CartCalculationSummary {
  const isGlobalPromoActive = Boolean(
    config.globalPromoActive &&
    typeof config.globalPromoPercent === 'number' &&
    config.globalPromoPercent > 0
  );
  const globalPromoTitle = config.globalPromoTitle || 'Promoção de Aniversário';
  const globalPromoPercent = config.globalPromoPercent || 0;

  let subtotalBase = 0;
  let subtotalEffective = 0;

  for (const item of items) {
    const pricing = getCardPricing(item.card, config);
    subtotalBase += item.card.price * item.quantity;
    subtotalEffective += pricing.effectivePrice * item.quantity;
  }

  const globalPromoDiscount = Math.max(0, subtotalBase - subtotalEffective);

  const isFreeShipping = subtotalEffective >= config.freeShippingThreshold && shippingType !== 'sedex';
  let shippingCost = 0;
  if (!isFreeShipping) {
    if (shippingType === 'carta') shippingCost = config.shippingCartaRegistrada;
    else if (shippingType === 'pac') shippingCost = config.shippingPac;
    else if (shippingType === 'sedex') shippingCost = config.shippingSedex;
  }

  const hasPixDiscount = paymentMethod === 'pix' && typeof config.pixDiscountPercent === 'number' && config.pixDiscountPercent > 0;
  const pixDiscountAmount = hasPixDiscount ? (subtotalEffective * config.pixDiscountPercent) / 100 : 0;

  const totalFinal = Math.max(0, subtotalEffective - pixDiscountAmount + shippingCost);

  return {
    subtotalBase,
    subtotalEffective,
    globalPromoDiscount,
    isGlobalPromoActive,
    globalPromoTitle,
    globalPromoPercent,
    shippingCost,
    isFreeShipping,
    pixDiscountAmount,
    totalFinal,
  };
}
