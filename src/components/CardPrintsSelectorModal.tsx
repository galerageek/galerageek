import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  Loader2, 
  Check, 
  Upload, 
  Camera, 
  Globe, 
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { TCGGame } from '../types';
import { optimizeImageForAnalysis } from '../utils/imageOptimizer';

export interface CardPrintOption {
  id: string;
  name: string;
  printedName?: string;
  setName: string;
  setCode: string;
  cardNumber: string;
  rarity: string;
  imageUrl: string;
  language?: string;
  finishes?: string;
  isPromo?: boolean;
}

interface CardPrintsSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  game: TCGGame;
  currentImageUrl?: string;
  onSelectPrint: (selected: {
    imageUrl: string;
    setName?: string;
    setCode?: string;
    cardNumber?: string;
    rarity?: string;
    language?: string;
    isFoil?: boolean;
  }) => void;
}

export const CardPrintsSelectorModal: React.FC<CardPrintsSelectorModalProps> = ({
  isOpen,
  onClose,
  cardName,
  game: initialGame,
  currentImageUrl,
  onSelectPrint,
}) => {
  const [searchTerm, setSearchTerm] = useState(cardName);
  const [selectedGame, setSelectedGame] = useState<TCGGame>(initialGame || 'magic');
  const [prints, setPrints] = useState<CardPrintOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'official' | 'upload' | 'url'>('official');
  const [customUrl, setCustomUrl] = useState('');
  const [urlPreviewValid, setUrlPreviewValid] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<'all' | 'pt' | 'en'>('all');

  // Load prints when modal opens or cardName changes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(cardName);
      setSelectedGame(initialGame || 'magic');
      fetchPrints(cardName, initialGame || 'magic');
    }
  }, [isOpen, cardName, initialGame]);

  const fetchPrints = async (query: string, g: TCGGame) => {
    if (!query || query.trim().length < 2) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/search-card-prints?q=${encodeURIComponent(query.trim())}&game=${g}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.prints)) {
        setPrints(data.prints);
        if (data.prints.length === 0) {
          setErrorMsg('Nenhuma impressão encontrada para este nome nessa categoria. Tente pesquisar pelo nome em inglês ou cole o link direto.');
        }
      } else {
        setErrorMsg(data.error || 'Erro ao buscar imagens do card.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha de conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPrints(searchTerm, selectedGame);
  };

  const handleSelectPrintItem = (item: CardPrintOption) => {
    const isFoil = item.isPromo || (item.finishes && item.finishes.toLowerCase().includes('foil'));
    onSelectPrint({
      imageUrl: item.imageUrl,
      setName: item.setName,
      setCode: item.setCode,
      cardNumber: item.cardNumber,
      rarity: item.rarity,
      language: item.language?.includes('PT') ? 'PT' : item.language?.includes('JP') ? 'JP' : 'EN',
      isFoil: Boolean(isFoil),
    });
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const optimized = await optimizeImageForAnalysis(file);
      setUploadedPreview(optimized);
    } catch (err) {
      console.error('Error optimizing photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleConfirmUploaded = () => {
    if (uploadedPreview) {
      onSelectPrint({ imageUrl: uploadedPreview });
      onClose();
    }
  };

  const handleConfirmCustomUrl = () => {
    if (customUrl && customUrl.startsWith('http')) {
      onSelectPrint({ imageUrl: customUrl });
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredPrints = prints.filter((p) => {
    if (languageFilter === 'pt') {
      return p.language?.toUpperCase().includes('PT') || p.printedName !== p.name;
    }
    if (languageFilter === 'en') {
      return p.language?.toUpperCase().includes('EN');
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-white text-base sm:text-lg flex items-center gap-2">
                Edições & Imagem Real do Card
              </h3>
              <p className="text-xs text-slate-400">
                Escolha entre as impressões oficiais físicas em alta definição, tire foto real ou use URL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-800/80 bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('official')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'official'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Galeria de Edições Oficiais ({prints.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto Real da Carta (Upload)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'url'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Colar Link / URL</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
          {activeTab === 'official' && (
            <>
              {/* Search & Filter Controls */}
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nome do card ou código (Ex: Sheoldred, Sol Ring, Charizard, OP05-119)..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={selectedGame}
                  onChange={(e) => {
                    const g = e.target.value as TCGGame;
                    setSelectedGame(g);
                    fetchPrints(searchTerm, g);
                  }}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="magic">Magic: The Gathering</option>
                  <option value="pokemon">Pokémon TCG</option>
                  <option value="onepiece">One Piece Card Game</option>
                  <option value="lorcana">Disney Lorcana</option>
                  <option value="riftbound">Riftbound TCG</option>
                </select>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Buscar</span>
                </button>
              </form>

              {/* Language toggles for Magic/Pokemon */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Scans originais em alta definição com acabamento físico real</span>
                </span>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500">Filtrar:</span>
                  <button
                    type="button"
                    onClick={() => setLanguageFilter('all')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      languageFilter === 'all'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas ({prints.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguageFilter('pt')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      languageFilter === 'pt'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Português (PT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguageFilter('en')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      languageFilter === 'en'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Inglês (EN)
                  </button>
                </div>
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
                  <p className="text-white text-xs font-semibold">Consultando arquivos oficiais e impressões...</p>
                  <p className="text-slate-500 text-[11px] mt-1">Carregando versões normais, foil, alternativas e promocionais</p>
                </div>
              )}

              {/* Error state */}
              {!isLoading && errorMsg && (
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs text-center">
                  {errorMsg}
                </div>
              )}

              {/* Grid of real printed editions */}
              {!isLoading && filteredPrints.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {filteredPrints.map((p) => {
                    const isSelected = currentImageUrl === p.imageUrl;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPrintItem(p)}
                        className={`group relative rounded-xl bg-slate-950 border p-2 text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                          isSelected
                            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {/* Selected Indicator Badge */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 z-10 p-1 rounded-full bg-amber-500 text-slate-950 shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}

                        {/* Card Image */}
                        <div className="relative aspect-[63/88] w-full rounded-lg overflow-hidden bg-slate-900 mb-2 border border-slate-800">
                          <img
                            src={p.imageUrl}
                            alt={p.printedName || p.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80';
                            }}
                          />
                        </div>

                        {/* Card Info */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-amber-400 font-mono">
                              {p.setCode} #{p.cardNumber}
                            </span>
                            {p.language && (
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                p.language.includes('PT')
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {p.language}
                              </span>
                            )}
                          </div>

                          <p className="text-white text-xs font-bold line-clamp-1 group-hover:text-amber-300 transition-colors">
                            {p.printedName || p.name}
                          </p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">
                            {p.setName}
                          </p>

                          {p.finishes && (
                            <span className="inline-block text-[9px] text-slate-500 line-clamp-1 italic">
                              {p.finishes}
                            </span>
                          )}

                          <button
                            type="button"
                            className="w-full mt-2 py-1.5 px-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 text-[11px] font-bold transition-all text-center"
                          >
                            Usar Esta Arte
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'upload' && (
            <div className="max-w-md mx-auto py-6 space-y-4 text-center">
              <div className="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/50 transition-colors">
                {uploadedPreview ? (
                  <div className="space-y-4">
                    <img
                      src={uploadedPreview}
                      alt="Prévia da foto real"
                      className="max-h-64 mx-auto rounded-xl shadow-lg border border-slate-700 object-contain"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer">
                        Trocar Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleConfirmUploaded}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Confirmar Imagem
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-white text-sm font-bold block">Tirar foto ou enviar imagem</span>
                      <p className="text-xs text-slate-400 mt-1">
                        Ideal para mostrar a foto do card físico real no toploader ou pasta
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="max-w-md mx-auto py-6 space-y-4">
              <label className="text-slate-300 block text-xs font-semibold">
                Cole a URL direta da imagem (ex: link do Scryfall, Liga, Google Imagens):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value);
                    setUrlPreviewValid(true);
                  }}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleConfirmCustomUrl}
                  disabled={!customUrl.startsWith('http')}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl disabled:opacity-40 whitespace-nowrap"
                >
                  Aplicar
                </button>
              </div>

              {customUrl.startsWith('http') && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <p className="text-slate-400 text-[11px]">Prévia da Imagem:</p>
                  <img
                    src={customUrl}
                    alt="Prévia"
                    className="max-h-60 mx-auto rounded-lg border border-slate-800 object-contain shadow-md"
                    onError={() => setUrlPreviewValid(false)}
                  />
                  {!urlPreviewValid && (
                    <p className="text-red-400 text-xs">Não foi possível carregar a imagem deste endereço.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 text-xs text-slate-500">
          <span>Galera Geek TCG — Banco de Imagens Oficiais de Cards</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
