import React from 'react';
import { 
  ShoppingBag, 
  Instagram, 
  MessageCircle, 
  Settings, 
  Package, 
  HelpCircle,
  Sparkles,
  Lock,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { StoreConfig, CartItem } from '../types';
import { formatBRL } from '../utils/formatters';
import { getCardPricing } from '../utils/pricing';
import { GaleraGeekLogo } from './GaleraGeekLogo';

interface NavbarProps {
  config: StoreConfig;
  cart: CartItem[];
  isAdminAuthenticated: boolean;
  cartAnimationTrigger?: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onLogoutAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  cart,
  isAdminAuthenticated,
  cartAnimationTrigger,
  onOpenCart,
  onOpenAdmin,
  onLogoutAdmin,
}) => {
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cart.reduce((sum, item) => {
    const pricing = getCardPricing(item.card, config);
    return sum + pricing.effectivePrice * item.quantity;
  }, 0);

  const [isShaking, setIsShaking] = React.useState(false);
  const prevCountRef = React.useRef(totalCartCount);

  // Trigger shake & pulse animation when cartAnimationTrigger updates or total items increase
  React.useEffect(() => {
    if (cartAnimationTrigger && cartAnimationTrigger > 0) {
      setIsShaking(false);
      const frame = requestAnimationFrame(() => {
        setIsShaking(true);
      });
      const timer = setTimeout(() => {
        setIsShaking(false);
      }, 700);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [cartAnimationTrigger]);

  React.useEffect(() => {
    if (totalCartCount > prevCountRef.current) {
      setIsShaking(false);
      const frame = requestAnimationFrame(() => {
        setIsShaking(true);
      });
      const timer = setTimeout(() => {
        setIsShaking(false);
      }, 700);
      prevCountRef.current = totalCartCount;
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
    prevCountRef.current = totalCartCount;
  }, [totalCartCount]);

  const instagramUrl = config.instagram.startsWith('http')
    ? config.instagram
    : `https://www.instagram.com/${config.instagram.replace('@', '').trim()}`;
  const instagramDisplay = config.instagram.includes('instagram.com')
    ? '@galerageeksjn'
    : (config.instagram.startsWith('@') ? config.instagram : `@${config.instagram}`);

  const cleanWhatsapp = config.whatsapp.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}`;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo & Store Identity */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <GaleraGeekLogo 
                className="w-12 h-12 shrink-0 group-hover:scale-105 transition-transform" 
                customLogoUrl={config.logoUrl} 
              />
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight leading-none group-hover:text-amber-400 transition-colors">
                    {config.storeName}
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    TCG
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Loja Oficial
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <span>Magic</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>Pokémon</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>Lorcana</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>Riftbound</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>One Piece</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links & Navigation Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Instagram Link */}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-pink-400 border border-pink-500/20 hover:border-pink-500/40 transition-colors shadow-sm"
              title={`Acessar Instagram ${instagramDisplay}`}
            >
              <Instagram className="w-4 h-4 text-pink-400" />
              <span className="hidden md:inline">{instagramDisplay}</span>
            </a>

            {/* WhatsApp Contact */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors shadow-sm"
              title="Falar no WhatsApp Galera Geek (32) 99813-6130"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline">(32) 99813-6130</span>
              <span className="hidden lg:inline xl:hidden">WhatsApp</span>
            </a>

            {/* Admin Dedicated Page Access - Only visible if already authenticated */}
            {isAdminAuthenticated && (
              <div className="inline-flex items-center rounded-xl bg-slate-900 border border-amber-500/50 p-0.5 shadow-sm">
                <button
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 hover:bg-slate-800 transition-colors"
                  title="Abrir Página de Administração (Estoque & Configurações)"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>Painel ADM</span>
                </button>

                <button
                  onClick={onLogoutAdmin}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Sair do Modo Administrador"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Cart Button with Micro-Interaction Animation */}
            <button
              onClick={onOpenCart}
              className={`relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isShaking ? 'animate-cart-shake animate-cart-pulse-ring ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-950' : ''
              }`}
              title="Abrir carrinho de compras"
              aria-label="Abrir carrinho de compras"
            >
              <div className={`transition-transform flex items-center justify-center ${isShaking ? 'animate-cart-icon-wobble' : ''}`}>
                <ShoppingBag className="w-4 h-4 text-slate-950" />
              </div>
              <span className="hidden sm:inline">{totalCartPrice > 0 ? formatBRL(totalCartPrice) : 'Carrinho'}</span>
              {totalCartCount > 0 && (
                <span
                  key={totalCartCount}
                  className={`w-5 h-5 rounded-full bg-slate-950 text-amber-400 text-[11px] font-extrabold flex items-center justify-center transition-all ${
                    isShaking ? 'animate-cart-badge-bounce bg-slate-950 text-amber-300 ring-2 ring-amber-400/80 shadow-md' : ''
                  }`}
                >
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
