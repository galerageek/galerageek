import React from 'react';
import { Search, Sparkles, SlidersHorizontal, X } from 'lucide-react';
import { TCGGame, CardCondition, CardLanguage } from '../types';

interface CardFiltersProps {
  selectedGame: TCGGame | 'all';
  onSelectGame: (game: TCGGame | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
  const gamesList: { id: TCGGame | 'all'; label: string; color: string }[] = [
    { id: 'all', label: 'Todos os TCGs', color: 'hover:border-slate-500' },
    { id: 'magic', label: 'Magic: The Gathering', color: 'hover:border-amber-500' },
    { id: 'pokemon', label: 'Pokémon TCG', color: 'hover:border-yellow-400' },
    { id: 'lorcana', label: 'Disney Lorcana', color: 'hover:border-purple-500' },
    { id: 'riftbound', label: 'Riftbound TCG', color: 'hover:border-cyan-500' },
    { id: 'onepiece', label: 'One Piece Card Game', color: 'hover:border-rose-500' },
  ];

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

      {/* Search Bar & Secondary Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nome, edição, número (#)..."
              className="w-full pl-10 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Condition Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedCondition}
              onChange={(e) => onConditionChange(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todas Condições</option>
              <option value="NM">Near Mint (NM)</option>
              <option value="SP">Slightly Played (SP)</option>
              <option value="MP">Moderately Played (MP)</option>
              <option value="HP">Heavily Played (HP)</option>
              <option value="D">Damaged (D)</option>
            </select>
          </div>

          {/* Foil / Acabamento Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedFoil}
              onChange={(e) => onFoilChange(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Acabamento (Todos)</option>
              <option value="foil">✨ Somente Foil</option>
              <option value="non-foil">Normal / Não Foil</option>
            </select>
          </div>

          {/* Idioma */}
          <div className="lg:col-span-2">
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Idioma (Todos)</option>
              <option value="PT">🇧🇷 Português (PT)</option>
              <option value="EN">🇺🇸 Inglês (EN)</option>
              <option value="JP">🇯🇵 Japonês (JP)</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="featured">⭐ Destaques</option>
              <option value="price-asc">Menor Preço</option>
              <option value="price-desc">Maior Preço</option>
              <option value="name-asc">Nome (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Filter tags & Reset */}
        {activeFilterCount > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeFilterCount} filtro(s) ativo(s)</span>
            </div>
            <button
              onClick={onResetFilters}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline"
            >
              <X className="w-3.5 h-3.5" />
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
