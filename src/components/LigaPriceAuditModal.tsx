import React, { useState, useMemo } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Search, 
  Check, 
  ArrowRight,
  Sparkles,
  Zap,
  Sliders,
  DollarSign
} from 'lucide-react';
import { CardItem, CardLigaAuditItem, TCGGame } from '../types';
import { formatBRL, getGameMeta } from '../utils/formatters';

interface LigaPriceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditItems: CardLigaAuditItem[];
  isLoading: boolean;
  onRefreshAudit: () => void;
  onApplySinglePrice: (cardId: string, newPrice: number) => void;
  onApplyBatchPrices: (updates: { cardId: string; newPrice: number }[]) => void;
}

export const LigaPriceAuditModal: React.FC<LigaPriceAuditModalProps> = ({
  isOpen,
  onClose,
  auditItems,
  isLoading,
  onRefreshAudit,
  onApplySinglePrice,
  onApplyBatchPrices,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'outdated' | 'above' | 'below' | 'aligned' | 'all'>('all');
  const [gameFilter, setGameFilter] = useState<TCGGame | 'all'>('all');
  const [appliedCards, setAppliedCards] = useState<Set<string>>(new Set());

  // Metrics
  const totalAnalyzed = auditItems.length;
  const outdatedItems = useMemo(() => auditItems.filter((i) => i.isOutdated), [auditItems]);
  const aboveItems = useMemo(() => auditItems.filter((i) => i.status === 'above'), [auditItems]);
  const belowItems = useMemo(() => auditItems.filter((i) => i.status === 'below'), [auditItems]);
  const alignedItems = useMemo(() => auditItems.filter((i) => i.status === 'aligned'), [auditItems]);

  // Adjust default tab when opened: if there are outdated items, show 'outdated', otherwise show 'all'
  React.useEffect(() => {
    if (isOpen) {
      if (outdatedItems.length > 0) {
        setFilterTab('outdated');
      } else {
        setFilterTab('all');
      }
    }
  }, [isOpen, outdatedItems.length]);

  // Filtered Cards with null-safe access
  const displayedItems = useMemo(() => {
    return auditItems.filter((item) => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = 
        !q ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.setName || '').toLowerCase().includes(q) ||
        (item.cardNumber || '').toLowerCase().includes(q);

      const matchesGame = gameFilter === 'all' || item.game === gameFilter;

      let matchesTab = true;
      if (filterTab === 'outdated') matchesTab = item.isOutdated;
      else if (filterTab === 'above') matchesTab = item.status === 'above';
      else if (filterTab === 'below') matchesTab = item.status === 'below';
      else if (filterTab === 'aligned') matchesTab = item.status === 'aligned';

      return matchesSearch && matchesGame && matchesTab;
    });
  }, [auditItems, searchQuery, gameFilter, filterTab]);

  const handleApplySingle = (cardId: string, newPrice: number) => {
    onApplySinglePrice(cardId, newPrice);
    setAppliedCards((prev) => new Set(prev).add(cardId));
    setTimeout(() => {
      setAppliedCards((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }, 2500);
  };

  const handleApplyAllLowest = () => {
    const targets = displayedItems.length > 0 ? displayedItems : outdatedItems;
    if (targets.length === 0) return;
    const updates = targets.map((t) => ({ cardId: t.id, newPrice: t.menorPrecoLiga }));
    onApplyBatchPrices(updates);
  };

  const handleApplyAllAvg = () => {
    const targets = displayedItems.length > 0 ? displayedItems : outdatedItems;
    if (targets.length === 0) return;
    const updates = targets.map((t) => ({ cardId: t.id, newPrice: t.precoMedioLiga }));
    onApplyBatchPrices(updates);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950/90 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-display font-black text-white tracking-tight">
                  Auditoria de Preços das Ligas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Margem de ±10%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Monitoramento automático em relação aos menores preços da <strong className="text-white">LigaMagic</strong>, <strong className="text-white">LigaLorcana</strong>, <strong className="text-white">LigaOnePiece</strong>, <strong className="text-white">LigaPokemon</strong> e <strong className="text-white">LigaRiftbound</strong>. Cards com diferença superior a 10% (para cima ou para baixo) são alertados abaixo para reajuste.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Badges Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950/40 border-b border-slate-800/80 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Total Analisado</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-white">{totalAnalyzed} cards</span>
              <button 
                onClick={onRefreshAudit}
                disabled={isLoading}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 active:scale-95 disabled:opacity-50"
                title="Recalcular todas as cotações com as Ligas"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Desatualizados (&gt;10%)
            </span>
            <span className="text-lg font-black text-amber-300 mt-1">
              {outdatedItems.length} cards
            </span>
          </div>

          <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Acima da Liga (&gt;+10%)
            </span>
            <span className="text-lg font-black text-red-300 mt-1">
              {aboveItems.length} cards
            </span>
          </div>

          <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              Abaixo da Liga (&gt;-10%)
            </span>
            <span className="text-lg font-black text-blue-300 mt-1">
              {belowItems.length} cards
            </span>
          </div>
        </div>

        {/* Global Batch Action Bar */}
        {outdatedItems.length > 0 && (
          <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-amber-200 font-semibold">
                Reajuste Rápido em Lote:
              </span>
              <span className="text-amber-400 font-bold">
                {displayedItems.length} cards no filtro atual
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyAllLowest}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                Atualizar Todos p/ Menor Preço da Liga
              </button>
              <button
                type="button"
                onClick={handleApplyAllAvg}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
              >
                Atualizar Todos p/ Preço Médio da Liga
              </button>
            </div>
          </div>
        )}

        {/* Controls: Search & Tabs */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, set ou número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: 'outdated', label: `Desatualizados (${outdatedItems.length})` },
              { id: 'above', label: `Acima (${aboveItems.length})` },
              { id: 'below', label: `Abaixo (${belowItems.length})` },
              { id: 'aligned', label: `Alinhados (${alignedItems.length})` },
              { id: 'all', label: `Todos (${totalAnalyzed})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  filterTab === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Game Filter Bar */}
        <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-bold shrink-0">Filtrar por Liga:</span>
          {[
            { id: 'all', label: 'Todas as Ligas' },
            { id: 'magic', label: 'LigaMagic' },
            { id: 'lorcana', label: 'LigaLorcana' },
            { id: 'onepiece', label: 'LigaOnePiece' },
            { id: 'pokemon', label: 'LigaPokemon' },
            { id: 'riftbound', label: 'LigaRiftbound' },
          ].map((gf) => (
            <button
              key={gf.id}
              onClick={() => setGameFilter(gf.id as any)}
              className={`px-2.5 py-0.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                gameFilter === gf.id
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {gf.label}
            </button>
          ))}
        </div>

        {/* Card List Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-white text-sm font-semibold">Consultando cotações das Ligas em tempo real...</p>
              <p className="text-xs text-slate-500">Calculando menor preço, preço médio e margens de 10%</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-white font-bold text-base">
                {filterTab === 'outdated' && totalAnalyzed > 0
                  ? 'Nenhum card desatualizado no momento!'
                  : 'Nenhum card encontrado para este filtro.'}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {filterTab === 'outdated' && totalAnalyzed > 0
                  ? `Excelente! Todos os ${totalAnalyzed} cards cadastrados na loja estão com preços dentro da margem oficial das Ligas (±10%).`
                  : 'Todos os cards selecionados estão com preço alinhado com as cotações oficiais das Ligas.'}
              </p>
              {totalAnalyzed > 0 && filterTab !== 'all' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterTab('all');
                      setSearchQuery('');
                      setGameFilter('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow"
                  >
                    <span>Ver todos os {totalAnalyzed} cards auditados</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {totalAnalyzed === 0 && !isLoading && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onRefreshAudit}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Executar Auditoria Agora</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            displayedItems.map((item) => {
              const gameMeta = getGameMeta(item.game);
              const isApplied = appliedCards.has(item.id);
              const isAbove = item.status === 'above';
              const isBelow = item.status === 'below';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                    isApplied 
                      ? 'bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : item.isOutdated
                      ? isAbove
                        ? 'bg-slate-950/80 border-red-900/40 hover:border-red-700/60'
                        : 'bg-slate-950/80 border-blue-900/40 hover:border-blue-700/60'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Card Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="w-10 h-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[9px] font-black text-slate-600">TCG</span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border ${gameMeta.accentBg}`}>
                          {item.game === 'magic' ? 'LigaMagic' : item.game === 'lorcana' ? 'LigaLorcana' : item.game === 'onepiece' ? 'LigaOnePiece' : item.game === 'pokemon' ? 'LigaPokemon' : 'LigaRiftbound'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.setCode} #{item.cardNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.rarity}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.setName}
                      </p>
                    </div>
                  </div>

                  {/* Center: Prices Comparison */}
                  <div className="flex items-center gap-4 sm:gap-6 bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800/90 shrink-0 w-full md:w-auto justify-between md:justify-start text-xs">
                    {/* Current Store Price */}
                    <div className="text-left">
                      <span className="block text-[10px] text-slate-400 font-semibold">Preço na Loja</span>
                      <span className="text-sm font-black text-white">
                        {formatBRL(item.currentPrice)}
                      </span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0 hidden sm:block" />

                    {/* Menor da Liga */}
                    <div className="text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-emerald-400 font-bold">Menor Liga</span>
                        <a
                          href={item.ligaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-amber-400"
                          title="Abrir página oficial do card na Liga"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <span className="text-sm font-black text-emerald-400">
                        {formatBRL(item.menorPrecoLiga)}
                      </span>
                    </div>

                    {/* Preço Médio da Liga */}
                    <div className="text-left hidden sm:block">
                      <span className="block text-[10px] text-slate-400 font-semibold">Médio Liga</span>
                      <span className="text-xs font-bold text-slate-300">
                        {formatBRL(item.precoMedioLiga)}
                      </span>
                    </div>

                    {/* Divergence Tag */}
                    <div className="text-right sm:text-left">
                      <span className="block text-[10px] text-slate-500 font-semibold">Diferença</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                        item.isOutdated
                          ? isAbove
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {isAbove ? <TrendingUp className="w-2.5 h-2.5" /> : isBelow ? <TrendingDown className="w-2.5 h-2.5" /> : <CheckCircle className="w-2.5 h-2.5" />}
                        {item.diffPercent > 0 ? `+${item.diffPercent}%` : `${item.diffPercent}%`}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 w-full md:w-auto justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApplySingle(item.id, item.menorPrecoLiga)}
                      disabled={isApplied}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] shadow-sm flex items-center gap-1 active:scale-95 transition-all ${
                        isApplied 
                          ? 'bg-emerald-500 text-slate-950 font-black' 
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                      title="Ajustar preço da loja para o Menor Preço da Liga"
                    >
                      {isApplied ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                      <span>{isApplied ? 'Atualizado!' : 'Aplicar Menor'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplySingle(item.id, item.precoMedioLiga)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-[11px] active:scale-95 transition-all"
                      title="Ajustar preço da loja para o Preço Médio da Liga"
                    >
                      Aplicar Médio
                    </button>

                    <a
                      href={item.ligaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition-colors"
                      title="Conferir ofertas ativas na Liga"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">
            Conforme solicitado: Alerta disparado para qualquer card com mais de <strong>10%</strong> de diferença em relação às cotações oficiais das Ligas.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
