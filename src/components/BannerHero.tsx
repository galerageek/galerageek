import React from 'react';
import { ShieldCheck, Zap, Instagram, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { StoreConfig } from '../types';
import { GaleraGeekLogo } from './GaleraGeekLogo';

interface BannerHeroProps {
  config: StoreConfig;
  totalCardsCount: number;
}

export const BannerHero: React.FC<BannerHeroProps> = ({ config, totalCardsCount }) => {
  const instagramUrl = config.instagram.startsWith('http')
    ? config.instagram
    : `https://www.instagram.com/${config.instagram.replace('@', '').trim()}`;
  const instagramDisplay = config.instagram.includes('instagram.com')
    ? '@galerageeksjn'
    : (config.instagram.startsWith('@') ? config.instagram : `@${config.instagram}`);

  return (
    <div className="relative overflow-hidden border-b border-purple-950/60 bg-gradient-to-b from-purple-950/30 via-slate-950 to-slate-950 pt-8 pb-10">
      {/* Background ambient light effects with Galera Geek Purple & Gold */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Logo + Main Title & Story */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 max-w-2xl text-center sm:text-left">
            {/* Logo Display - Sem moldura */}
            <div className="shrink-0 flex items-center justify-center">
              <GaleraGeekLogo 
                className="w-24 h-24 sm:w-28 sm:h-28" 
                customLogoUrl={config.logoUrl} 
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-amber-500/30 text-xs font-semibold text-amber-300 mb-3 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Cards Selecionados • Pronta Entrega • Envio para Todo o Brasil</span>
              </div>

              <div className="space-y-1.5">
                <h1 className="font-display font-black text-4xl sm:text-6xl text-white tracking-tight leading-none">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-purple-300">
                    {config.storeName || 'Galera Geek'}
                  </span>
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="h-px w-6 bg-amber-500/60"></span>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-400">
                    Loja Oficial
                  </span>
                  <span className="h-px w-6 bg-amber-500/60"></span>
                </div>
              </div>

              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                {config.heroDescription || (
                  <>
                    Encontre seus singles favoritos de <strong className="text-white">Magic: The Gathering</strong>, <strong className="text-white">Pokémon</strong>, <strong className="text-white">Disney Lorcana</strong>, <strong className="text-white">Riftbound</strong> e <strong className="text-white">One Piece</strong> com estoque real, transparência e cuidado de quem também joga.
                  </>
                )}
              </p>

              {/* Feature Bullets */}
              <div className="mt-5 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-purple-900/40 text-amber-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Cards 100% Originais</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Envio com Toploader Rígido</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-emerald-400 font-semibold">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{config.pixDiscountPercent}% OFF no PIX</span>
                </div>
              </div>
            </div>
          </div>

          {/* Galera Geek Interactive Community Card */}
          <div className="w-full lg:w-96 bg-slate-900/90 rounded-2xl border border-slate-800/90 p-5 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Estoque Pronta Entrega</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                {totalCardsCount} cards disponíveis
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Instagram Oficial:</span>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  {instagramDisplay}
                </a>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Desconto Especial PIX:</span>
                <span className="font-bold text-emerald-400">{config.pixDiscountPercent}% de Desconto</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Frete Grátis:</span>
                <span className="font-semibold text-white">Acima de R$ {config.freeShippingThreshold.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Balcão de Coleções:</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Compramos & Trocamos
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-amber-500 hover:opacity-95 text-white font-bold text-xs transition-transform active:scale-95 shadow-md shadow-purple-950/50"
              >
                <Instagram className="w-4 h-4" />
                <span>Siga {instagramDisplay} no Instagram</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
