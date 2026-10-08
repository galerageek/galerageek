import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  SlidersHorizontal, 
  X, 
  DollarSign, 
  Tag, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  RotateCcw,
  Check
} from 'lucide-react';
import { TCGGame, CardCondition, CardLanguage } from '../types';

export interface CardTypeOption {
  id: string;
  label: string;
  count: number;
}

interface CardFiltersProps {
  selectedGame: TCGGame | 'all';
  onSelectGame: (game: TCGGame | 'all') => void;
  // General search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Card Type filter
  selectedCardType: string;
  onCardTypeChange: (type: string) => void;
  availableCardTypes: CardTypeOption[];
  // Price filter
  minPrice: number | '';
  maxPrice: number | '';
  onMinPriceChange: (val: number | '') => void;
  onMaxPriceChange: (val: number | '') => void;
  pricePreset: string;
  onPricePresetChange: (preset: string) => void;
  // Card Text / Effect filter
  cardTextQuery: string;
  onCardTextQueryChange: (query: string) => void;
  // Secondary filters
  selectedCondition: CardCondition | 'all';
  onConditionChange: (cond: CardCondition | 'all') => void;
  selectedFoil: 'all' | 'foil' | 'non-foil';
  onFoilChange: (foil: 'all' | 'foil' | 'non-foil') => void;
  selectedLanguage: CardLanguage | 'all';
  onLanguageChange: (lang: CardLanguage | 'all') => void;
  sortBy: 'price-asc' | 'price-desc' | 'name-asc' | 'featured';
  onSortChange: (sort: 'price-asc' | 'price-desc' | 'name-asc' | 'featured') => void;
  gameCounts: Record<string, number>;
  onResetFilters: () => void;
  activeFilterCount: number;
}

export const CardFilters: React.FC<CardFiltersProps> = ({
  selectedGame,
  onSelectGame,
  searchQuery,
  onSearchChange,
  selectedCardType,
  onCardTypeChange,
  availableCardTypes,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  pricePreset,
  onPricePresetChange,
  cardTextQuery,
  onCardTextQueryChange,
  selectedCondition,
  onConditionChange,
  selectedFoil,
  onFoilChange,
  selectedLanguage,
  onLanguageChange,
  sortBy,
  onSortChange,
  gameCounts,
  onResetFilters,
  activeFilterCount,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const gamesList: { id: TCGGame | 'all'; label: string; color: string }[] = [
    { id: 'all', label: 'Todos os TCGs', color: 'hover:border-slate-500' },
    { id: 'magic', label: 'Magic: The Gathering', color: 'hover:border-amber-500' },
    { id: 'pokemon', label: 'Pokémon TCG', color: 'hover:border-yellow-400' },
    { id: 'lorcana', label: 'Disney Lorcana', color: 'hover:border-purple-500' },
    { id: 'riftbound', label: 'Riftbound TCG', color: 'hover:border-cyan-500' },
    { id: 'onepiece', label: 'One Piece Card Game', color: 'hover:border-rose-500' },
  ];

  // Quick price presets list
  const pricePresets = [
    { id: 'all', label: 'Todos os Preços', min: '', max: '' },
    { id: 'under-25', label: 'Até R$ 25', min: '', max: 25 },
    { id: '25-100', label: 'R$ 25 a R$ 100', min: 25, max: 100 },
    { id: '100-300', label: 'R$ 100 a R$ 300', min: 100, max: 300 },
    { id: 'over-300', label: 'Acima de R$ 300', min: 300, max: '' },
  ];

  // Text search suggestion chips
  const textSuggestions = [
    'compre',
    'draw',
    'comprar cartas',
    'rampa',
    'destruir',
    'anular',
    'toque mortífero',
    'voar',
    'duplica marcadores',
  ];

  const handlePresetSelect = (presetId: string) => {
    onPricePresetChange(presetId);
    const found = pricePresets.find((p) => p.id === presetId);
    if (found) {
      onMinPriceChange(found.min as any);
      onMaxPriceChange(found.max as any);
    }
  };

  const hasPriceFilter = minPrice !== '' || maxPrice !== '' || pricePreset !== 'all';
  const hasTypeFilter = selectedCardType !== 'all';
  const hasTextFilter = cardTextQuery.trim() !== '';

  return (
    <div className="space-y-4 mb-8">
      {/* Game Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {gamesList.map((game) => {
          const isSelected = selectedGame === game.id;
          const count = gameCounts[game.id] || 0;
          return (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <span>{game.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Filter Hub Container */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 sm:p-5 backdrop-blur-md shadow-xl space-y-3.5">
        
        {/* Row 1: Primary Search + Filters (Name, Card Type, Price Preset, Sorting, and Advanced Toggle) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          
          {/* General Search Input (Nome, Coleção, #) */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nome, texto (compre, draw...), edição ou #..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro por Tipo de Card */}
          <div className="lg:col-span-3 relative">
            <div className="relative">
              <Tag className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCardType}
                onChange={(e) => onCardTypeChange(e.target.value)}
                className={`w-full pl-9.5 pr-8 py-2.5 bg-slate-950 border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-amber-500 transition-colors appearance-none cursor-pointer ${
                  hasTypeFilter
                    ? 'border-amber-500/80 text-amber-300 bg-amber-500/5 ring-1 ring-amber-500/30'
                    : 'border-slate-800 text-slate-200'
                }`}
                title="Filtrar por tipo do card (Criatura, Artefato, Encantamento, Pokémon, etc.)"
              >
                <option value="all">Tipo de Card (Todos)</option>
                {availableCardTypes.map((typeOpt) => (
                  <option key={typeOpt.id} value={typeOpt.id}>
                    {typeOpt.label} ({typeOpt.count})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Filtro por Preço (Preset) */}
          <div className="lg:col-span-3 relative">
            <div className="relative">
              <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={pricePreset}
                onChange={(e) => handlePresetSelect(e.target.value)}
                className={`w-full pl-9 pr-8 py-2.5 bg-slate-950 border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-amber-500 transition-colors appearance-none cursor-pointer ${
                  hasPriceFilter
                    ? 'border-emerald-500/80 text-emerald-300 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-slate-800 text-slate-200'
                }`}
                title="Filtrar por faixa de preço"
              >
                <option value="all">Faixa de Preço (Todas)</option>
                <option value="under-25">Até R$ 25 (Budget / Acessível)</option>
                <option value="25-100">R$ 25 a R$ 100 (Médio)</option>
                <option value="100-300">R$ 100 a R$ 300 (Staples / Raros)</option>
                <option value="over-300">Acima de R$ 300 (Colecionador)</option>
                <option value="custom">Faixa Personalizada (Mín / Máx)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Ordenação */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="featured">⭐ Destaques</option>
              <option value="price-asc">Menor Preço</option>
              <option value="price-desc">Maior Preço</option>
              <option value="name-asc">Nome (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Filtro por Texto do Card (Efeitos / Habilidades / Regras) + Botão de Mais Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-1 border-t border-slate-800/60">
          
          {/* Dedicated Card Text Search Field */}
          <div className="lg:col-span-8 relative">
            <div className="relative">
              <FileText className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={cardTextQuery}
                onChange={(e) => onCardTextQueryChange(e.target.value)}
                placeholder="Filtrar por regras/efeitos (ex: compre, draw, rampa, toque mortífero)..."
                className={`w-full pl-10 pr-9 py-2 bg-slate-950 border rounded-xl text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors ${
                  hasTextFilter
                    ? 'border-cyan-500/80 text-cyan-200 bg-cyan-500/5 ring-1 ring-cyan-500/30'
                    : 'border-slate-800 text-white'
                }`}
              />
              {cardTextQuery && (
                <button
                  onClick={() => onCardTextQueryChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded"
                  title="Limpar filtro de texto"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Toggle for Advanced Secondary Filters (Preço Min/Max inputs, Condição, Foil, Idioma) */}
          <div className="lg:col-span-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                showAdvanced || selectedCondition !== 'all' || selectedFoil !== 'all' || selectedLanguage !== 'all' || pricePreset === 'custom'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Ocultar Detalhes' : 'Filtros Detalhados'}</span>
              {(selectedCondition !== 'all' || selectedFoil !== 'all' || selectedLanguage !== 'all' || pricePreset === 'custom') && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {/* Quick Price Range Chips */}
            <div className="hidden sm:flex items-center gap-1">
              {pricePresets.slice(1, 4).map((p) => {
                const isActive = pricePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePresetSelect(isActive ? 'all' : p.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Text Suggestions Pill Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Sugestões de texto:
          </span>
          {textSuggestions.map((kw) => {
            const isCurrent = cardTextQuery.toLowerCase().trim() === kw;
            return (
              <button
                key={kw}
                onClick={() => onCardTextQueryChange(isCurrent ? '' : kw)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border ${
                  isCurrent
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-slate-950'
                }`}
              >
                "{kw}"
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters Drawer: Min/Max Price Inputs, Condition, Foil, Language */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Custom Min / Max Price Inputs */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90">
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  Preço Personalizado (R$)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="text-[10px] text-slate-500 absolute left-2 top-1/2 -translate-y-1/2">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Mín"
                      value={minPrice}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value));
                        onMinPriceChange(val);
                        onPricePresetChange('custom');
                      }}
                      className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-slate-500 text-xs">—</span>
                  <div className="relative flex-1">
                    <span className="text-[10px] text-slate-500 absolute left-2 top-1/2 -translate-y-1/2">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Máx"
                      value={maxPrice}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value));
                        onMaxPriceChange(val);
                        onPricePresetChange('custom');
                      }}
                      className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {(minPrice !== '' || maxPrice !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        onMinPriceChange('');
                        onMaxPriceChange('');
                        onPricePresetChange('all');
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                      title="Limpar faixa de preço"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Condition Filter */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90">
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Estado de Conservação
                </label>
                <select
                  value={selectedCondition}
                  onChange={(e) => onConditionChange(e.target.value as any)}
                  className="w-full py-1.5 px-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Todas Condições</option>
                  <option value="NM">Near Mint (NM) - Impecável</option>
                  <option value="SP">Slightly Played (SP) - Ótimo</option>
                  <option value="MP">Moderately Played (MP) - Bom</option>
                  <option value="HP">Heavily Played (HP) - Jogado</option>
                  <option value="D">Damaged (D) - Danificado</option>
                </select>
              </div>

              {/* Foil / Finish Filter */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90">
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Acabamento / Brilho
                </label>
                <select
                  value={selectedFoil}
                  onChange={(e) => onFoilChange(e.target.value as any)}
                  className="w-full py-1.5 px-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Acabamento (Todos)</option>
                  <option value="foil">✨ Somente Foil / Brilho</option>
                  <option value="non-foil">Normal / Não Foil</option>
                </select>
              </div>

              {/* Language Filter */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90">
                <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  Idioma da Carta
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => onLanguageChange(e.target.value as any)}
                  className="w-full py-1.5 px-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Idioma (Todos)</option>
                  <option value="PT">🇧🇷 Português (PT)</option>
                  <option value="EN">🇺🇸 Inglês (EN)</option>
                  <option value="JP">🇯🇵 Japonês (JP)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips and Reset Bar */}
        {activeFilterCount > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 flex items-center gap-1 text-[11px] font-medium mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                {activeFilterCount} filtro(s) ativo(s):
              </span>

              {/* Chip: Tipo de Card */}
              {hasTypeFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                  <Tag className="w-3 h-3" />
                  Tipo: {availableCardTypes.find((t) => t.id === selectedCardType)?.label || selectedCardType}
                  <button
                    onClick={() => onCardTypeChange('all')}
                    className="hover:text-white ml-0.5"
                    title="Remover filtro de tipo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Chip: Preço */}
              {hasPriceFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                  <DollarSign className="w-3 h-3" />
                  Preço: {minPrice !== '' && maxPrice !== '' 
                    ? `R$ ${minPrice} a R$ ${maxPrice}` 
                    : minPrice !== '' 
                    ? `A partir de R$ ${minPrice}` 
                    : maxPrice !== '' 
                    ? `Até R$ ${maxPrice}` 
                    : pricePresets.find((p) => p.id === pricePreset)?.label || 'Personalizado'}
                  <button
                    onClick={() => {
                      onMinPriceChange('');
                      onMaxPriceChange('');
                      onPricePresetChange('all');
                    }}
                    className="hover:text-white ml-0.5"
                    title="Remover filtro de preço"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Chip: Texto do Card */}
              {hasTextFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold">
                  <FileText className="w-3 h-3" />
                  Texto: "{cardTextQuery}"
                  <button
                    onClick={() => onCardTextQueryChange('')}
                    className="hover:text-white ml-0.5"
                    title="Remover filtro de texto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Chip: Busca Geral */}
              {searchQuery.trim() !== '' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-medium">
                  Busca: "{searchQuery}"
                  <button
                    onClick={() => onSearchChange('')}
                    className="hover:text-white ml-0.5"
                    title="Remover busca geral"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Chip: Condição */}
              {selectedCondition !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                  {selectedCondition}
                  <button onClick={() => onConditionChange('all')} className="hover:text-white ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Chip: Foil */}
              {selectedFoil !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                  {selectedFoil === 'foil' ? 'Somente Foil' : 'Não Foil'}
                  <button onClick={() => onFoilChange('all')} className="hover:text-white ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Chip: Idioma */}
              {selectedLanguage !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                  {selectedLanguage}
                  <button onClick={() => onLanguageChange('all')} className="hover:text-white ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={onResetFilters}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
