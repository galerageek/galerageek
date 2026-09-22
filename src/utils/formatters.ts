import { CardCondition, TCGGame, CartItem, StoreConfig } from '../types';

export const formatBRL = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

export const getConditionDetails = (condition: CardCondition) => {
  switch (condition) {
    case 'NM':
      return {
        label: 'Near Mint (NM)',
        short: 'NM',
        description: 'Card praticamente impecável, direto do booster ou com micro detalhes imperceptíveis.',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        dotColor: 'bg-emerald-400',
      };
    case 'SP':
      return {
        label: 'Slightly Played (SP)',
        short: 'SP',
        description: 'Leves marcas de manuseio ou bordas discretamente desgastadas.',
        badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        dotColor: 'bg-blue-400',
      };
    case 'MP':
      return {
        label: 'Moderately Played (MP)',
        short: 'MP',
        description: 'Desgaste moderado nas bordas ou cantos, sem dobras graves.',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        dotColor: 'bg-amber-400',
      };
    case 'HP':
      return {
        label: 'Heavily Played (HP)',
        short: 'HP',
        description: 'Desgaste severo visível, mas ainda legal para torneios se em sleeve opaco.',
        badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        dotColor: 'bg-orange-400',
      };
    case 'D':
      return {
        label: 'Damaged (D)',
        short: 'D',
        description: 'Card com danos estruturais (vincos, rasgos, manchas de água).',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        dotColor: 'bg-rose-400',
      };
    default:
      return {
        label: condition,
        short: condition,
        description: '',
        badgeClass: 'bg-slate-700 text-slate-300 border-slate-600',
        dotColor: 'bg-slate-400',
      };
  }
};

export const getGameMeta = (game: TCGGame) => {
  switch (game) {
    case 'magic':
      return {
        title: 'Magic: The Gathering',
        shortName: 'Magic (MTG)',
        color: 'from-amber-600 to-amber-800',
        accentBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dotColor: 'bg-amber-500',
        badge: 'MTG',
      };
    case 'pokemon':
      return {
        title: 'Pokémon TCG',
        shortName: 'Pokémon',
        color: 'from-yellow-500 to-amber-600',
        accentBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        dotColor: 'bg-yellow-400',
        badge: 'POKÉMON',
      };
    case 'lorcana':
      return {
        title: 'Disney Lorcana',
        shortName: 'Lorcana',
        color: 'from-purple-600 to-indigo-800',
        accentBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
        dotColor: 'bg-purple-400',
        badge: 'LORCANA',
      };
    case 'riftbound':
      return {
        title: 'Riftbound TCG',
        shortName: 'Riftbound',
        color: 'from-cyan-600 to-blue-800',
        accentBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        dotColor: 'bg-cyan-400',
        badge: 'RIFTBOUND',
      };
    case 'onepiece':
      return {
        title: 'One Piece Card Game',
        shortName: 'One Piece',
        color: 'from-red-600 to-rose-800',
        accentBg: 'bg-red-500/10 text-red-300 border-red-500/30',
        dotColor: 'bg-red-400',
        badge: 'ONE PIECE',
      };
    default:
      return {
        title: 'TCG Geral',
        shortName: 'TCG',
        color: 'from-slate-600 to-slate-800',
        accentBg: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
        dotColor: 'bg-slate-400',
        badge: 'TCG',
      };
  }
};

export const generateWhatsAppOrderMessage = (
  items: CartItem[],
  config: StoreConfig,
  shippingType: 'carta' | 'pac' | 'sedex' | 'retirada',
  shippingCost: number,
  paymentMethod: 'pix' | 'cartao',
  totalFinal: number,
  customerName: string,
  customerAddress: string,
  customerNotes?: string
): string => {
  const itemsText = items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.card.name}* (${item.card.setName} #${item.card.cardNumber})\n` +
        `   • Jogo: ${item.card.game.toUpperCase()} | Condição: ${item.card.condition} | Idioma: ${item.card.language}${item.card.isFoil ? ' | ✨ FOIL' : ''}\n` +
        `   • Qtd: ${item.quantity}x • Unit: ${formatBRL(item.card.price)} • Sub: ${formatBRL(item.card.price * item.quantity)}`
    )
    .join('\n\n');

  const shippingName =
    shippingType === 'carta'
      ? 'Carta Registrada (com seguro & toploader)'
      : shippingType === 'pac'
      ? 'PAC Correios'
      : shippingType === 'sedex'
      ? 'SEDEX Correios'
      : 'Retirada em Mãos / Presencial';

  const paymentName = paymentMethod === 'pix' 
    ? (config.pixDiscountPercent > 0 ? `PIX (${config.pixDiscountPercent}% de Desconto)` : 'PIX') 
    : 'Cartão / Negociar';

  const text = 
`👋 Olá, *${config.storeName}*!
Vim através do site e gostaria de fechar este pedido de cards:

📋 *ITENS DO PEDIDO:*
${itemsText}

🚚 *FORMA DE ENVIO:*
• ${shippingName}: ${shippingCost > 0 ? formatBRL(shippingCost) : 'Grátis'}

💳 *PAGAMENTO:*
• Forma: ${paymentName}
• *TOTAL A PAGAR: ${formatBRL(totalFinal)}*
${paymentMethod === 'pix' ? `• Chave PIX da loja: ${config.pixKey} (${config.pixKeyType})` : ''}

👤 *DADOS DO COMPRADOR:*
• Nome: ${customerName || 'A preencher'}
• Endereço/CEP: ${customerAddress || 'A combinar'}
${customerNotes ? `• Obs: ${customerNotes}` : ''}

Poderiam confirmar a disponibilidade para eu enviar o comprovante? Obrigado!`;

  return encodeURIComponent(text);
};
