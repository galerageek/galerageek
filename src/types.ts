export type TCGGame = 'magic' | 'pokemon' | 'lorcana' | 'riftbound' | 'onepiece';

export type CardCondition = 'NM' | 'SP' | 'MP' | 'HP' | 'D';

export type CardLanguage = 'PT' | 'EN' | 'JP';

export type CardRarity = 
  | 'Comum' 
  | 'Incomum' 
  | 'Rara' 
  | 'Mítica' 
  | 'Ultra Rara' 
  | 'Secret Rare' 
  | 'Enchanted' 
  | 'Promo' 
  | 'Special';

export interface CardItem {
  id: string;
  name: string;
  game: TCGGame;
  setName: string;
  setCode: string;
  cardNumber: string;
  imageUrl: string;
  condition: CardCondition;
  language: CardLanguage;
  isFoil: boolean;
  finishType?: string;
  rarity: CardRarity;
  price: number; // Store selling price in BRL
  originalPrice?: number; // Optional original strike-through price
  stockQuantity: number;
  description?: string;
  cardType?: string;
  colorOrAttribute?: string;
  featured?: boolean;
}

export interface CartItem {
  card: CardItem;
  quantity: number;
}

export interface StoreConfig {
  storeName: string;
  instagram: string;
  whatsapp: string;
  pixKey: string;
  pixKeyType: 'Email' | 'CPF/CNPJ' | 'Telefone' | 'Chave Aleatória';
  logoUrl?: string;
  bannerNotice: string;
  heroDescription?: string;
  pixDiscountPercent: number;
  shippingCartaRegistrada: number;
  shippingPac: number;
  shippingSedex: number;
  freeShippingThreshold: number;
  adminPassword?: string;
  adminSlug?: string;
}
