import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Wand2,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Sparkles,
  Link,
  Check
} from 'lucide-react';
import { CardItem, TCGGame } from '../types';
import { getGameMeta } from '../utils/formatters';
import {
  verifyImageUrl,
  batchVerifyCards,
  getOptimizedImageUrl,
  ImageVerificationResult,
  isSpecialRestrictedGame
} from '../utils/imageVerification';
import { CardFallbackPlaceholder } from './CardFallbackPlaceholder';

interface ImageAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CardItem[];
  onUpdateCardImage: (cardId: string, newImageUrl: string) => void;
  onOpenArtSelectorForCard: (card: CardItem) => void;
}

export const ImageAuditModal: React.FC<ImageAuditModalProps> = ({
  isOpen,
  onClose,
  cards,
  onUpdateCardImage,
  onOpenArtSelectorForCard
}) => {
  const [results, setResults] = useState<Map<string, ImageVerificationResult>>(new Map());
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [filterGame, setFilterGame] = useState<TCGGame | 'all' | 'restricted' | 'issues'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [previewFallbackCardId, setPreviewFallbackCardId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-run initial lightweight scan for One Piece and Riftbound on open
  useEffect(() => {
    if (isOpen && results.size === 0) {
      handleRunScan(true); // scan restricted games first
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunScan = async (onlyRestricted = false) => {
    setIsScanning(true);
    const targetCards = onlyRestricted
      ? cards.filter((c) => isSpecialRestrictedGame(c.game))
      : cards;

    setProgress({ current: 0, total: targetCards.length });

    const batchRes = await batchVerifyCards(targetCards, (curr, tot) => {
      setProgress({ current: curr, total: tot });
    });

    setResults((prev) => {
      const merged = new Map(prev);
      batchRes.forEach((val, key) => merged.set(key, val));
      return merged;
    });

    setIsScanning(false);
  };

  const handleTestSingleCard = async (card: CardItem) => {
    setResults((prev) => {
      const m = new Map(prev);
      m.set(card.id, {
        ok: false,
        status: 'checking',
        url: card.imageUrl || '',
        isOnePieceOrRiftbound: isSpecialRestrictedGame(card.game),
        testedAt: Date.now()
      });
      return m;
    });

    const res = await verifyImageUrl(card.imageUrl, card.game);
    setResults((prev) => {
      const m = new Map(prev);
      m.set(card.id, res);
      return m;
    });
  };

  const handleOptimizeUrl = (card: CardItem) => {
    const optimized = getOptimizedImageUrl(card.imageUrl, card.game);
    if (optimized && optimized !== card.imageUrl) {
      onUpdateCardImage(card.id, optimized);
      handleTestSingleCard({ ...card, imageUrl: optimized });
    }
  };

  const handleBatchAutoOptimize = () => {
    let count = 0;
    cards.forEach((card) => {
      const opt = getOptimizedImageUrl(card.imageUrl, card.game);
      if (opt && opt !== card.imageUrl) {
        onUpdateCardImage(card.id, opt);
        count++;
      }
    });
    if (count > 0) {
      // Re-scan
      setTimeout(() => handleRunScan(), 300);
    }
  };

  // Metrics computation
  const totalCards = cards.length;
  const restrictedCount = cards.filter((c) => isSpecialRestrictedGame(c.game)).length;
  let verifiedOkCount = 0;
  let fallbackActiveCount = 0;

  results.forEach((res) => {
    if (res.ok) verifiedOkCount++;
    else if (res.status === 'fallback_active') fallbackActiveCount++;
  });

  // Filter cards
  const filteredCards = cards.filter((card) => {
    // Game/issue filter
    if (filterGame === 'restricted' && !isSpecialRestrictedGame(card.game)) return false;
    if (filterGame === 'issues') {
      const res = results.get(card.id);
      if (res && res.ok) return false;
    } else if (filterGame !== 'all' && filterGame !== 'restricted') {
      if (card.game !== filterGame) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = card.name.toLowerCase().includes(q);
      const matchCode = (card.setCode || '').toLowerCase().includes(q);
      const matchNum = (card.cardNumber || '').toLowerCase().includes(q);
      return matchName || matchCode || matchNum;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Auditoria e Verificação de Imagens</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Proteção de Layout
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Monitore URLs de cards (com foco em One Piece & Riftbound) e assegure que o Fallback Visual temático proteja o layout da loja.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="p-4 sm:p-5 bg-slate-900/60 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total no Catálogo</span>
            <span className="text-xl font-black text-white mt-0.5">{totalCards} cards</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Imagens Online
            </span>
            <span className="text-xl font-black text-emerald-400 mt-0.5">{verifiedOkCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Fallback Ativo
            </span>
            <span className="text-xl font-black text-amber-400 mt-0.5">{fallbackActiveCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> One Piece & Rift
            </span>
            <span className="text-xl font-black text-cyan-400 mt-0.5">{restrictedCount} cards</span>
          </div>
        </div>

        {/* Scan & Batch Action Bar */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleRunScan(false)}
              disabled={isScanning}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? `Verificando (${progress.current}/${progress.total})...` : 'Verificar Todas as Imagens'}</span>
            </button>

            <button
              onClick={() => handleRunScan(true)}
              disabled={isScanning}
              className="px-3 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Testar apenas cards com proteção de hotlinking (One Piece e Riftbound)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verificar One Piece & Riftbound</span>
            </button>

            <button
              onClick={handleBatchAutoOptimize}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              title="Converter links diretos da Bandai/Riot para proxy seguro anti-bloqueio"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Otimizar com Proxy</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar card por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-500 font-semibold text-[11px] shrink-0 mr-1">Filtro:</span>
          {[
            { id: 'all', label: 'Todos os Cards' },
            { id: 'issues', label: 'Com Falha / Fallback' },
            { id: 'restricted', label: 'One Piece & Riftbound' },
            { id: 'onepiece', label: 'One Piece' },
            { id: 'riftbound', label: 'Riftbound' },
            { id: 'magic', label: 'Magic' },
            { id: 'pokemon', label: 'Pokémon' },
            { id: 'lorcana', label: 'Lorcana' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterGame(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterGame === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredCards.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Nenhum card encontrado com os filtros selecionados.
            </div>
          ) : (
            filteredCards.map((card) => {
              const gameMeta = getGameMeta(card.game);
              const res = results.get(card.id);
              const isChecking = res?.status === 'checking';
              const isRestricted = isSpecialRestrictedGame(card.game);
              const isEditing = editingCardId === card.id;
              const showFallbackPreview = previewFallbackCardId === card.id;

              return (
                <div
                  key={card.id}
                  className="p-3 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Visual Preview */}
                    <div
                      className="w-12 h-16 shrink-0 relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer shadow-sm group"
                      onClick={() => setPreviewFallbackCardId(showFallbackPreview ? null : card.id)}
                      title="Clique para alternar entre imagem carregada e prévia do Fallback Visual"
                    >
                      {showFallbackPreview || !card.imageUrl ? (
                        <CardFallbackPlaceholder card={card} variant="thumbnail" />
                      ) : (
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          onError={() => {
                            // Automatically note fallback
                            setResults((prev) => {
                              const m = new Map(prev);
                              m.set(card.id, {
                                ok: false,
                                status: 'fallback_active',
                                url: card.imageUrl,
                                isOnePieceOrRiftbound: isRestricted,
                                error: 'Erro de renderização no navegador'
                              });
                              return m;
                            });
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-amber-300 font-bold transition-opacity">
                        Ver
                      </div>
                    </div>

                    {/* Card Title & Game */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs truncate max-w-[240px]">
                          {card.name}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${gameMeta.accentBg}`}>
                          {gameMeta.badge}
                        </span>
                        {isRestricted && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                            CORS Especial
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="truncate max-w-[180px]">{card.setName}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">#{card.cardNumber}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-medium">R$ {card.price?.toFixed(2)}</span>
                      </div>

                      {/* URL Preview / Edit Form */}
                      {isEditing ? (
                        <div className="mt-2 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tempUrl}
                            onChange={(e) => setTempUrl(e.target.value)}
                            className="text-xs p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white w-full max-w-md focus:outline-none focus:border-amber-500 font-mono"
                            placeholder="https://..."
                          />
                          <button
                            onClick={() => {
                              onUpdateCardImage(card.id, tempUrl);
                              setEditingCardId(null);
                              handleTestSingleCard({ ...card, imageUrl: tempUrl });
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingCardId(null)}
                            className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500 font-mono truncate max-w-sm sm:max-w-md">
                          <span className="truncate">{card.imageUrl || 'Nenhuma URL informada'}</span>
                          {card.imageUrl && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(card.imageUrl);
                                setCopiedId(card.id);
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              className="text-slate-400 hover:text-amber-400 shrink-0"
                              title="Copiar URL"
                            >
                              {copiedId === card.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Link className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Pill & Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Status Pill */}
                    {isChecking ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Testando...
                      </span>
                    ) : res?.ok ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Imagem Válida
                      </span>
                    ) : res?.status === 'fallback_active' || !card.imageUrl ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1" title="Se a imagem falhar, a loja exibe o fallback temático sem quebrar o layout">
                        <AlertTriangle className="w-3 h-3" /> Fallback Visual Ativo
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" /> Não Verificado
                      </span>
                    )}

                    {/* Quick test button */}
                    <button
                      onClick={() => handleTestSingleCard(card)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                      title="Testar URL agora"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    {/* Optimize proxy button if applicable */}
                    {isRestricted && (
                      <button
                        onClick={() => handleOptimizeUrl(card)}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
                        title="Otimizar URL com Proxy Anti-Bloqueio"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Open prints selector */}
                    <button
                      onClick={() => onOpenArtSelectorForCard(card)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 border border-slate-700 transition-colors"
                      title="Trocar edição ou foto real"
                    >
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline">Edições</span>
                    </button>

                    {/* Edit URL */}
                    <button
                      onClick={() => {
                        setEditingCardId(card.id);
                        setTempUrl(card.imageUrl || '');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] font-semibold border border-slate-800 transition-colors"
                    >
                      Editar URL
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Qualquer imagem inacessível é automaticamente substituída na vitrine pelo <strong>Fallback Visual Temático TCG</strong> em tempo real.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
