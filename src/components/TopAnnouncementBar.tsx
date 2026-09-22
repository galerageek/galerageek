import React, { useState, useEffect } from 'react';
import { Sparkles, X, Tag, ShieldCheck, ArrowRight, Flame } from 'lucide-react';
import { StoreConfig } from '../types';
import { formatBRL } from '../utils/formatters';

interface TopAnnouncementBarProps {
  config: StoreConfig;
  onActionClick?: () => void;
}

export const TopAnnouncementBar: React.FC<TopAnnouncementBarProps> = ({ config, onActionClick }) => {
  const [isVisible, setIsVisible] = useState(true);

  const hasGlobalPromo = Boolean(
    config.globalPromoActive &&
    typeof config.globalPromoPercent === 'number' &&
    config.globalPromoPercent > 0
  );
  const noticeText = config.bannerNotice ? config.bannerNotice.trim() : '';
  const promoTitle = config.globalPromoTitle?.trim() || 'Promoção de Aniversário';
  const promoPercent = config.globalPromoPercent || 0;

  const contentSignature = `${noticeText}_${hasGlobalPromo ? `${promoTitle}_${promoPercent}` : 'no-promo'}`;

  // Use a hash/key based on the announcement text so if admin changes it, it re-appears
  const storageKey = `galera_geek_announcement_dismissed_${encodeURIComponent(contentSignature)}`;

  useEffect(() => {
    if (!noticeText && !hasGlobalPromo) {
      setIsVisible(false);
      return;
    }
    try {
      const isDismissed = sessionStorage.getItem(storageKey);
      if (isDismissed === 'true') {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, [noticeText, hasGlobalPromo, storageKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(storageKey, 'true');
    } catch {
      // Ignore storage errors in private browsing
    }
  };

  // Se não houver nem texto nem promoção geral ativa, ou tiver sido dispensado, não renderiza
  if ((!noticeText && !hasGlobalPromo) || !isVisible) return null;

  return (
    <aside 
      aria-label="Aviso promocional e comunicados"
      className="relative z-50 bg-gradient-to-r from-red-600 via-purple-900 to-amber-600 text-white border-b border-amber-500/30 shadow-md transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          
          {/* Left / Main message area */}
          <div className="flex-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap min-w-0">
            {/* Storewide Global Promotion Badge */}
            {hasGlobalPromo ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-red-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-sm shrink-0 animate-pulse">
                <span>🎉</span>
                <span>{promoTitle} (-{promoPercent}% EM TUDO)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm shrink-0">
                <Sparkles className="w-3 h-3 text-slate-950" />
                <span>Promoção Ativa</span>
              </span>
            )}

            {/* Announcement Message */}
            {noticeText && (
              <span className="font-semibold text-amber-100 text-center sm:text-left truncate max-w-full">
                {noticeText}
              </span>
            )}

            {/* Extra highlights (PIX discount & Free Shipping if configured) */}
            {config.pixDiscountPercent > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-200 border border-purple-400/40 text-[10px] font-bold">
                <Flame className="w-2.5 h-2.5 text-amber-300" />
                <span>+ {config.pixDiscountPercent}% OFF no PIX</span>
              </span>
            )}

            {config.shippingCartaRegistrada > 0 && (
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-amber-200/90 font-medium">
                • Carta Registrada: {formatBRL(config.shippingCartaRegistrada)}
              </span>
            )}
          </div>

          {/* Right Actions: Optional quick link & Dismiss Close button */}
          <div className="flex items-center gap-2 shrink-0">
            {config.whatsapp && (
              <a
                href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Vi a promoção no site da Galera Geek e gostaria de tirar uma dúvida.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-200 hover:text-white underline underline-offset-2 transition-colors mr-2"
                title="Tirar dúvidas sobre promoções no WhatsApp"
              >
                <span>Falar no WhatsApp</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            )}

            {/* Close / Dismiss Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Fechar barra de aviso"
              title="Fechar barra de aviso"
              className="p-1 rounded-lg text-amber-200/80 hover:text-white hover:bg-black/20 active:scale-95 transition-all focus:outline-none focus:ring-1 focus:ring-amber-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </aside>
  );
};
