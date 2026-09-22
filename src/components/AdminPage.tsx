import React, { useState } from 'react';
import { 
  Package, 
  Settings, 
  ArrowLeft, 
  LogOut, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  Image as ImageIcon, 
  MessageCircle, 
  Instagram, 
  KeyRound, 
  QrCode, 
  Truck, 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle,
  ExternalLink,
  Camera,
  Sparkles,
  Loader2,
  RefreshCw,
  Coins,
  Wand2,
  Palette,
  Layers,
  Zap
} from 'lucide-react';
import { CardItem, StoreConfig, TCGGame, CardCondition, CardLanguage, CardRarity } from '../types';
import { GaleraGeekLogo } from './GaleraGeekLogo';
import { formatBRL, getGameMeta } from '../utils/formatters';
import { exportCatalogJSON } from '../utils/storage';
import { CardCameraModal } from './CardCameraModal';
import { CardPrintsSelectorModal } from './CardPrintsSelectorModal';
import { optimizeImageForAnalysis } from '../utils/imageOptimizer';
import { removeWhiteBackground, detectWhiteBackground, matchPageBackgroundColor } from '../utils/imageTransparency';

interface AdminPageProps {
  cards: CardItem[];
  config: StoreConfig;
  onUpdatePriceAndStock: (cardId: string, price: number, stock: number) => void;
  onUpdateCard?: (updated: CardItem) => void;
  onDeleteCard: (cardId: string) => void;
  onAddCard: (card: CardItem) => void;
  onImportCards: (cards: CardItem[]) => void;
  onResetDefaultCards: () => void;
  onSaveConfig: (newConfig: StoreConfig) => void;
  onBackToStore: () => void;
  onLogout: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  cards,
  config,
  onUpdatePriceAndStock,
  onUpdateCard,
  onDeleteCard,
  onAddCard,
  onImportCards,
  onResetDefaultCards,
  onSaveConfig,
  onBackToStore,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'settings'>('stock');

  // Stock Tab States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameFilter, setSelectedGameFilter] = useState<TCGGame | 'all'>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Camera, Prints & Auto-lookup States
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [printsModalState, setPrintsModalState] = useState<{
    isOpen: boolean;
    cardId?: string;
    name: string;
    game: TCGGame;
    currentImageUrl?: string;
  }>({
    isOpen: false,
    name: '',
    game: 'magic',
  });
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [isMobileUploading, setIsMobileUploading] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoTolerance, setLogoTolerance] = useState(42);
  const [logoErosion, setLogoErosion] = useState(1);
  const [originalUploadedLogo, setOriginalUploadedLogo] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Liga price reference info for current card being added
  const [ligaPriceInfo, setLigaPriceInfo] = useState<{
    menorPreco: number;
    precoMedio: number;
    ligaUrl: string;
  } | null>(null);

  // In-UI Toast Notification
  const [adminToast, setAdminToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAdminToast({ message, type });
    setTimeout(() => {
      setAdminToast(null);
    }, 4000);
  };

  // New Card Form State
  const [newCard, setNewCard] = useState<Partial<CardItem>>({
    name: '',
    game: 'magic',
    setName: '',
    setCode: '',
    cardNumber: '',
    imageUrl: '',
    condition: 'NM',
    language: 'PT',
    isFoil: false,
    rarity: 'Rara',
    price: 35.00,
    originalPrice: 45.00,
    stockQuantity: 1,
    description: '',
  });

  // Settings Tab State
  const [configForm, setConfigForm] = useState<StoreConfig>({ ...config });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Calculated Metrics
  const totalCardsCount = cards.length;
  const totalStockUnits = cards.reduce((acc, c) => acc + c.stockQuantity, 0);
  const totalStockValue = cards.reduce((acc, c) => acc + (c.price * c.stockQuantity), 0);
  const outOfStockCount = cards.filter((c) => c.stockQuantity === 0).length;

  const filteredCards = cards.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.setName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cardNumber.includes(searchQuery);
    const matchesGame = selectedGameFilter === 'all' || c.game === selectedGameFilter;
    return matchesSearch && matchesGame;
  });

  // Callback when a card is recognized from the camera or photo
  const handleCardIdentified = (cardData: any) => {
    setIsAddingNew(true);

    let resolvedPrice = cardData.menorPrecoLiga !== undefined && cardData.menorPrecoLiga !== null
      ? cardData.menorPrecoLiga
      : (cardData.price !== undefined && cardData.price !== null ? cardData.price : 0.25);

    const isMagic = (cardData.game || 'magic') === 'magic';
    const normRarity = (cardData.rarity || 'Comum').toLowerCase();
    if (isMagic) {
      if (normRarity.includes('incomum') || normRarity.includes('uncommon')) {
        resolvedPrice = Math.max(0.50, resolvedPrice);
      } else if (normRarity.includes('comum') || normRarity.includes('common')) {
        resolvedPrice = Math.max(0.25, resolvedPrice);
      } else if (normRarity.includes('rara') || normRarity.includes('rare')) {
        resolvedPrice = Math.max(1.00, resolvedPrice);
      }
    }

    const resolvedMedio = cardData.precoMedioLiga !== undefined && cardData.precoMedioLiga !== null
      ? Math.max(resolvedPrice, cardData.precoMedioLiga)
      : Math.round(resolvedPrice * 1.35 * 100) / 100;

    setNewCard({
      name: cardData.name || '',
      game: cardData.game || 'magic',
      setName: cardData.setName || '',
      setCode: cardData.setCode || '',
      cardNumber: cardData.cardNumber || '',
      imageUrl: cardData.imageUrl || '',
      condition: cardData.condition || 'NM',
      language: cardData.language || 'PT',
      isFoil: Boolean(cardData.isFoil),
      rarity: cardData.rarity || 'Comum',
      price: resolvedPrice,
      originalPrice: resolvedMedio,
      stockQuantity: 1,
      description: `Card identificado via câmera. Coleção ${cardData.setName || ''} #${cardData.cardNumber || ''}.`,
    });

    setLigaPriceInfo({
      menorPreco: resolvedPrice,
      precoMedio: resolvedMedio,
      ligaUrl: cardData.ligaUrl || `https://www.ligamagic.com.br/?view=cards/card&card=${encodeURIComponent(cardData.originalName || cardData.name)}`,
    });

    showToast(`Card "${cardData.name}" reconhecido! Menor preço Liga: ${formatBRL(resolvedPrice)}`, 'success');
  };

  // Direct snapshot from cell phone camera via file input
  const handleDirectMobilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsMobileUploading(true);
    showToast('Otimizando e processando foto do card...', 'info');

    try {
      const optimizedDataUrl = await optimizeImageForAnalysis(file);

      const response = await fetch('/api/identify-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: optimizedDataUrl,
          mimeType: 'image/jpeg',
        }),
      });

      const data = await response.json();
      if (data.success && data.card) {
        handleCardIdentified(data.card);
      } else {
        showToast(data.error || 'Não foi possível reconhecer o card na foto. Tente novamente ou use a busca por nome.', 'error');
      }
    } catch (err: any) {
      showToast('Erro ao processar imagem: ' + (err.message || 'Falha de conexão'), 'error');
    } finally {
      setIsMobileUploading(false);
      // Reset input value so same photo can be re-triggered if needed
      e.target.value = '';
    }
  };

  // Open art selector modal for card being added
  const handleOpenArtSelectorForNewCard = () => {
    if (!newCard.name || newCard.name.trim().length < 2) {
      showToast('Digite o nome do card para buscar as impressões e artes oficiais.', 'info');
      return;
    }
    setPrintsModalState({
      isOpen: true,
      name: newCard.name.trim(),
      game: (newCard.game as TCGGame) || 'magic',
      currentImageUrl: newCard.imageUrl,
    });
  };

  // Open art selector modal for existing card in catalog
  const handleOpenArtSelectorForExistingCard = (card: CardItem) => {
    setPrintsModalState({
      isOpen: true,
      cardId: card.id,
      name: card.name,
      game: card.game,
      currentImageUrl: card.imageUrl,
    });
  };

  // When user picks a print from the modal
  const handleSelectCardPrint = (selected: {
    imageUrl: string;
    setName?: string;
    setCode?: string;
    cardNumber?: string;
    rarity?: string;
    language?: string;
    isFoil?: boolean;
  }) => {
    if (printsModalState.cardId) {
      const cardId = printsModalState.cardId;
      const existing = cards.find((c) => c.id === cardId);
      if (existing) {
        const updated: CardItem = {
          ...existing,
          imageUrl: selected.imageUrl,
          ...(selected.setName ? { setName: selected.setName } : {}),
          ...(selected.setCode ? { setCode: selected.setCode } : {}),
          ...(selected.cardNumber ? { cardNumber: selected.cardNumber } : {}),
          ...(selected.rarity ? { rarity: selected.rarity as any } : {}),
          ...(selected.language ? { language: selected.language as any } : {}),
          ...(selected.isFoil !== undefined ? { isFoil: selected.isFoil } : {}),
        };
        if (onUpdateCard) {
          onUpdateCard(updated);
        }
        showToast(`Imagem e edição de "${existing.name}" atualizadas com sucesso!`, 'success');
      }
    } else {
      setNewCard((prev) => ({
        ...prev,
        imageUrl: selected.imageUrl,
        setName: selected.setName || prev.setName,
        setCode: selected.setCode || prev.setCode,
        cardNumber: selected.cardNumber || prev.cardNumber,
        rarity: (selected.rarity as any) || prev.rarity,
        language: (selected.language as any) || prev.language,
        isFoil: selected.isFoil !== undefined ? selected.isFoil : prev.isFoil,
      }));
      showToast('Arte oficial aplicada ao formulário!', 'success');
    }
  };

  // Auto-search card details, high-res image, and Liga lowest price by name
  const handleAutoSearchCard = async () => {
    if (!newCard.name || newCard.name.trim().length < 2) {
      showToast('Digite o nome do card para buscar os dados.', 'info');
      return;
    }

    setIsAutoSearching(true);
    try {
      const res = await fetch(`/api/search-card-data?q=${encodeURIComponent(newCard.name.trim())}&game=${newCard.game || 'magic'}`);
      const result = await res.json();

      if (result.success && result.data) {
        const d = result.data;
        let resolvedPrice = d.menorPrecoLiga !== undefined && d.menorPrecoLiga !== null ? d.menorPrecoLiga : newCard.price;

        const isMagic = (newCard.game || 'magic') === 'magic';
        const normRarity = (d.rarity || newCard.rarity || 'Comum').toLowerCase();
        if (isMagic) {
          if (normRarity.includes('incomum') || normRarity.includes('uncommon')) {
            resolvedPrice = Math.max(0.50, resolvedPrice);
          } else if (normRarity.includes('comum') || normRarity.includes('common')) {
            resolvedPrice = Math.max(0.25, resolvedPrice);
          } else if (normRarity.includes('rara') || normRarity.includes('rare')) {
            resolvedPrice = Math.max(1.00, resolvedPrice);
          }
        }

        const resolvedMedio = d.precoMedioLiga !== undefined && d.precoMedioLiga !== null 
          ? Math.max(resolvedPrice, d.precoMedioLiga) 
          : Math.round(resolvedPrice * 1.35 * 100) / 100;

        setNewCard((prev) => ({
          ...prev,
          name: d.name || prev.name,
          setName: d.setName || prev.setName,
          setCode: d.setCode || prev.setCode,
          cardNumber: d.cardNumber || prev.cardNumber,
          rarity: d.rarity || prev.rarity,
          imageUrl: d.imageUrl || prev.imageUrl,
          price: resolvedPrice,
          originalPrice: resolvedMedio,
        }));

        setLigaPriceInfo({
          menorPreco: resolvedPrice,
          precoMedio: resolvedMedio,
          ligaUrl: d.ligaUrl || `https://www.ligamagic.com.br/?view=cards/card&card=${encodeURIComponent(d.originalName || d.name)}`,
        });

        showToast(`Card "${d.name}" localizado! Menor preço: ${formatBRL(resolvedPrice)}`, 'success');
      } else {
        showToast('Não encontramos dados automáticos para esse nome. Preencha manualmente.', 'error');
      }
    } catch (err: any) {
      showToast('Erro ao buscar dados: ' + (err.message || 'Falha de conexão'), 'error');
    } finally {
      setIsAutoSearching(false);
    }
  };

  // Handle Save New Card
  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.name || !newCard.setName) {
      showToast('Preencha o nome do card e a coleção.', 'error');
      return;
    }

    const cardToAdd: CardItem = {
      id: `card-${Date.now()}`,
      name: newCard.name || 'Novo Card',
      game: (newCard.game as TCGGame) || 'magic',
      setName: newCard.setName || 'Coleção',
      setCode: newCard.setCode?.toUpperCase() || 'SET',
      cardNumber: newCard.cardNumber || '001',
      imageUrl: newCard.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      condition: (newCard.condition as CardCondition) || 'NM',
      language: (newCard.language as CardLanguage) || 'PT',
      isFoil: Boolean(newCard.isFoil),
      finishType: newCard.isFoil ? 'Foil' : 'Normal',
      rarity: (newCard.rarity as CardRarity) || 'Rara',
      price: Number(newCard.price) || 10,
      originalPrice: newCard.originalPrice ? Number(newCard.originalPrice) : undefined,
      stockQuantity: Number(newCard.stockQuantity) || 1,
      description: newCard.description || '',
    };

    onAddCard(cardToAdd);
    setIsAddingNew(false);
    setLigaPriceInfo(null);
    setNewCard({
      name: '',
      game: 'magic',
      setName: '',
      setCode: '',
      cardNumber: '',
      imageUrl: '',
      condition: 'NM',
      language: 'PT',
      isFoil: false,
      rarity: 'Rara',
      price: 35.00,
      originalPrice: 45.00,
      stockQuantity: 1,
      description: '',
    });
    showToast(`Card "${cardToAdd.name}" adicionado ao catálogo com sucesso!`, 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onImportCards(parsed);
          showToast(`Catálogo importado com sucesso! ${parsed.length} cards carregados.`, 'success');
        } else {
          showToast('Arquivo JSON inválido. Deve conter uma lista de cards.', 'error');
        }
      } catch {
        showToast('Erro ao ler arquivo JSON.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalUploadedLogo(dataUrl);

      // Check if image has white background
      const isWhite = await detectWhiteBackground(dataUrl);
      if (isWhite) {
        try {
          // Auto-remove white background seamlessly with de-fringing
          const transparent = await removeWhiteBackground(dataUrl, { tolerance: 40, defringe: true, erosion: 1 });
          setConfigForm(prev => ({ ...prev, logoUrl: transparent }));
          showToast('Fundo branco detectado e removido! O logo agora combina com o fundo escuro da página.', 'success');
          return;
        } catch {
          // fallback to original if canvas processing fails
        }
      }

      setConfigForm(prev => ({ ...prev, logoUrl: dataUrl }));
      showToast('Imagem carregada! Clique em "Salvar Configurações" para aplicar.', 'info');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMakeLogoTransparent = async (customTolerance?: number, customErosion?: number) => {
    if (!configForm.logoUrl) return;
    setIsProcessingLogo(true);
    try {
      const srcToProcess = originalUploadedLogo || configForm.logoUrl;
      const tol = customTolerance ?? logoTolerance;
      const er = customErosion ?? logoErosion;
      const transparentDataUrl = await removeWhiteBackground(srcToProcess, {
        tolerance: tol,
        defringe: true,
        erosion: er,
      });
      setConfigForm(prev => ({ ...prev, logoUrl: transparentDataUrl }));
      showToast('Fundo branco e halos claros eliminados! Bordas perfeitamente integradas.', 'success');
    } catch (err: any) {
      showToast('Erro ao remover fundo: ' + (err.message || 'Falha no processamento'), 'error');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleApplyPageColorToLogo = async () => {
    if (!configForm.logoUrl) return;
    setIsProcessingLogo(true);
    try {
      const srcToProcess = originalUploadedLogo || configForm.logoUrl;
      const matchedDataUrl = await matchPageBackgroundColor(srcToProcess);
      setConfigForm(prev => ({ ...prev, logoUrl: matchedDataUrl }));
      showToast('Fundo e halos do logo mesclados com a cor exata da página (#020617)!', 'success');
    } catch (err: any) {
      showToast('Erro ao aplicar cor: ' + (err.message || 'Falha no processamento'), 'error');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleInvertLogo = async () => {
    if (!configForm.logoUrl) return;
    setIsProcessingLogo(true);
    try {
      const srcToProcess = configForm.logoUrl;
      const invertedDataUrl = await removeWhiteBackground(srcToProcess, {
        tolerance: logoTolerance,
        defringe: true,
        erosion: 0,
        invert: true,
      });
      setConfigForm(prev => ({ ...prev, logoUrl: invertedDataUrl }));
      showToast('Cores invertidas (excelente para transformar desenhos pretos em brancos/dourados)!', 'success');
    } catch (err: any) {
      showToast('Erro ao inverter: ' + (err.message || 'Falha'), 'error');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleRestoreOriginalUploadedLogo = () => {
    if (originalUploadedLogo) {
      setConfigForm(prev => ({ ...prev, logoUrl: originalUploadedLogo }));
      showToast('Logo original com fundo restaurado.', 'info');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(configForm);
    setSettingsSaved(true);
    showToast('Configurações da loja salvas com sucesso!', 'success');
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification Banner */}
      {adminToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200 ${
            adminToast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : adminToast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
              : 'bg-slate-900/90 text-amber-300 border-amber-500/40'
          }`}
        >
          {adminToast.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : adminToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{adminToast.message}</span>
        </div>
      )}

      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GaleraGeekLogo className="w-10 h-10" customLogoUrl={config.logoUrl} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg text-white">
                  {config.storeName || 'Galera Geek'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                  Painel ADM
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gestão de Estoque, IA de Reconhecimento & Cotações Liga
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Voltar para a Loja Virtual"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Ver Loja</span>
            </button>

            {/* Logout button: executes immediately and reliably without iframe-blocked dialogs */}
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Encerrar sessão de administrador imediatamente"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Sair do Admin</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'stock'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Gerenciar Estoque de Cards ({cards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações & Logotipo da Loja</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'stock' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Cards Cadastrados</span>
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-black text-2xl text-white">{totalCardsCount}</span>
                  <span className="text-[10px] text-amber-400 font-bold">Modelos Únicos</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Unidades em Estoque</span>
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-black text-2xl text-cyan-400">{totalStockUnits}</span>
                  <span className="text-[10px] text-slate-400">Total Físico</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Valor Total do Estoque</span>
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-black text-xl sm:text-2xl text-emerald-400">{formatBRL(totalStockValue)}</span>
                  <span className="text-[10px] text-emerald-500 font-bold">Acervo</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Itens Esgotados</span>
                <div className="flex items-baseline justify-between">
                  <span className={`font-display font-black text-2xl ${outOfStockCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {outOfStockCount}
                  </span>
                  <span className="text-[10px] text-slate-400">Qtd = 0</span>
                </div>
              </div>
            </div>

            {/* Action Bar & Filters */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search & Game Filter */}
              <div className="flex flex-1 flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, coleção, código..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={selectedGameFilter}
                  onChange={(e) => setSelectedGameFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Todos os Jogos</option>
                  <option value="magic">Magic: The Gathering</option>
                  <option value="pokemon">Pokémon TCG</option>
                  <option value="lorcana">Disney Lorcana</option>
                  <option value="riftbound">Riftbound TCG</option>
                  <option value="onepiece">One Piece Card Game</option>
                </select>
              </div>

              {/* Action Buttons: Camera Scanner, New Card, Import/Export */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Camera Scanner Button */}
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                  title="Abrir câmera para escanear card com IA e consultar preço na Liga"
                >
                  <Camera className="w-4 h-4" />
                  <span>Escanear Card</span>
                </button>

                {/* 2. Direct Cell Phone Camera Trigger */}
                <label
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                  title="Tirar foto com a câmera do celular"
                >
                  {isMobileUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span className="hidden sm:inline">Foto Celular</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={isMobileUploading}
                    onChange={handleDirectMobilePhoto}
                    className="hidden"
                  />
                </label>

                {/* 3. Manual New Card Button */}
                <button
                  onClick={() => {
                    setIsAddingNew(!isAddingNew);
                    setLigaPriceInfo(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingNew ? 'Fechar Formulário' : 'Novo Card'}</span>
                </button>

                {/* 4. Export JSON */}
                <button
                  onClick={() => {
                    exportCatalogJSON(cards);
                    showToast('Arquivo JSON do catálogo exportado com sucesso!', 'success');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                  title="Exportar backup completo em arquivo JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>

                {/* 5. Import JSON */}
                <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Importar</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>

                {/* 6. Restore Default Cards */}
                <button
                  onClick={() => {
                    onResetDefaultCards();
                    showToast('Catálogo padrão de demonstração restaurado com sucesso!', 'info');
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
                  title="Restaurar catálogo inicial da Galera Geek"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Create / Edit Card Drawer/Form */}
            {isAddingNew && (
              <form
                onSubmit={handleCreateCard}
                className="p-5 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-sm text-white">
                      Cadastrar Card com Auto-busca & Cotação Liga
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center gap-1 hover:bg-cyan-900/60"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Fotografar Card</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Card Name with Auto Search Button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold">Nome do Card *</label>
                      <button
                        type="button"
                        onClick={handleAutoSearchCard}
                        disabled={isAutoSearching || !newCard.name}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 disabled:opacity-40"
                        title="Buscar dados, imagem oficial e menor preço na Liga"
                      >
                        {isAutoSearching ? (
                          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-amber-400" />
                        )}
                        <span>{isAutoSearching ? 'Buscando...' : 'Buscar Dados & Imagem'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ex: Sheoldred, Charizard, Sol Ring..."
                        value={newCard.name}
                        onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAutoSearchCard();
                          }
                        }}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Game */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Jogo *</label>
                    <select
                      value={newCard.game}
                      onChange={(e) => setNewCard({ ...newCard, game: e.target.value as any })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="magic">Magic: The Gathering</option>
                      <option value="pokemon">Pokémon TCG</option>
                      <option value="lorcana">Disney Lorcana</option>
                      <option value="riftbound">Riftbound TCG</option>
                      <option value="onepiece">One Piece Card Game</option>
                    </select>
                  </div>

                  {/* Collection / Set */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Coleção / Edição *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Modern Horizons 3"
                      value={newCard.setName}
                      onChange={(e) => setNewCard({ ...newCard, setName: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Set Code and Collector Number */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Código e Número</label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        placeholder="SET"
                        value={newCard.setCode}
                        onChange={(e) => setNewCard({ ...newCard, setCode: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white uppercase focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="001"
                        value={newCard.cardNumber}
                        onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Price with Liga Lowest Price Integration */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold">Preço de Venda (R$) *</label>
                      {ligaPriceInfo && (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Coins className="w-2.5 h-2.5" />
                          Menor Liga: {formatBRL(ligaPriceInfo.menorPreco)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={newCard.price}
                        onChange={(e) => setNewCard({ ...newCard, price: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                      />
                      {ligaPriceInfo && (
                        <button
                          type="button"
                          onClick={() => setNewCard((prev) => ({ ...prev, price: ligaPriceInfo.menorPreco }))}
                          className="px-2.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] whitespace-nowrap active:scale-95"
                          title="Definir exatamente o menor preço encontrado na Liga"
                        >
                          Usar Liga
                        </button>
                      )}
                    </div>

                    {/* Quick pricing shortcuts for bulk / common cards */}
                    <div className="flex items-center gap-1 mt-1.5 overflow-x-auto py-0.5">
                      <span className="text-[9px] text-slate-500 font-medium mr-0.5">Mínimos:</span>
                      {[
                        { label: 'Comum', val: 0.25 },
                        { label: 'Incomum', val: 0.50 },
                        { label: 'Rara', val: 1.00 },
                        { label: 'R$ 2', val: 2.00 },
                        { label: 'R$ 5', val: 5.00 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setNewCard((prev) => ({ ...prev, price: item.val }))}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            newCard.price === item.val
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                          }`}
                          title={`Definir preço para ${item.label} (${formatBRL(item.val)})`}
                        >
                          {item.label}: {formatBRL(item.val)}
                        </button>
                      ))}
                    </div>
                    {ligaPriceInfo && (
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Médio: {formatBRL(ligaPriceInfo.precoMedio)}</span>
                        <a
                          href={ligaPriceInfo.ligaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 underline font-semibold"
                          title="Abrir página oficial de anúncios na Liga"
                        >
                          <span>Conferir na Liga</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Stock Quantity */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Estoque (Unidades) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newCard.stockQuantity}
                      onChange={(e) => setNewCard({ ...newCard, stockQuantity: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Estado de Conservação</label>
                    <select
                      value={newCard.condition}
                      onChange={(e) => setNewCard({ ...newCard, condition: e.target.value as any })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="NM">Near Mint (NM) - Impecável</option>
                      <option value="SP">Slightly Played (SP) - Ótimo</option>
                      <option value="MP">Moderately Played (MP) - Bom</option>
                      <option value="HP">Heavily Played (HP) - Jogado</option>
                      <option value="D">Damaged (D) - Danificado</option>
                    </select>
                  </div>

                  {/* Language and Foil */}
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Idioma & Acabamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newCard.language}
                        onChange={(e) => setNewCard({ ...newCard, language: e.target.value as any })}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="PT">Português (PT)</option>
                        <option value="EN">Inglês (EN)</option>
                        <option value="JP">Japonês (JP)</option>
                      </select>

                      <label className="flex items-center gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newCard.isFoil}
                          onChange={(e) => setNewCard({ ...newCard, isFoil: e.target.checked })}
                          className="rounded text-amber-500"
                        />
                        <span className="font-semibold">Foil</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Card Image URL with live preview and Prints Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Imagem Real do Card & Edições Oficiais</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenArtSelectorForNewCard}
                      className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 transition-colors active:scale-95"
                      title="Abrir galeria com todas as impressões físicas, scans oficiais e fotos reais"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Ver Edições & Artes Reais</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {newCard.imageUrl ? (
                      <div className="relative group/thumb cursor-pointer shrink-0" onClick={handleOpenArtSelectorForNewCard} title="Clique para trocar a arte oficial">
                        <img
                          src={newCard.imageUrl}
                          alt="Prévia"
                          className="w-10 h-14 object-cover rounded-lg border border-amber-500/40 bg-slate-950 shadow-md group-hover/thumb:opacity-75 transition-opacity"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 bg-black/60 rounded-lg text-[9px] text-amber-300 font-bold transition-opacity">
                          Trocar
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenArtSelectorForNewCard}
                        className="w-10 h-14 rounded-lg border border-dashed border-slate-700 bg-slate-950 text-slate-500 hover:text-amber-400 hover:border-amber-500/40 flex flex-col items-center justify-center shrink-0 transition-colors"
                        title="Escolher arte oficial ou foto real"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                    )}
                    <input
                      type="url"
                      placeholder="https://... (Preenchido automaticamente ao buscar nome ou selecionar arte)"
                      value={newCard.imageUrl}
                      onChange={(e) => setNewCard({ ...newCard, imageUrl: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setLigaPriceInfo(null);
                    }}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    Salvar Card no Catálogo
                  </button>
                </div>
              </form>
            )}

            {/* Cards Stock Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Card</th>
                      <th className="py-3.5 px-3">Coleção & Jogo</th>
                      <th className="py-3.5 px-3">Detalhes</th>
                      <th className="py-3.5 px-4 text-center">Preço (R$)</th>
                      <th className="py-3.5 px-4 text-center">Estoque</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredCards.map((card) => {
                      const gameMeta = getGameMeta(card.game);
                      const ligaSearchUrl = 
                        card.game === 'pokemon'
                          ? `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(card.name)}`
                          : card.game === 'onepiece'
                          ? `https://www.ligaonepiece.com.br/?view=cards/card&card=${encodeURIComponent(card.name)}`
                          : `https://www.ligamagic.com.br/?view=cards/card&card=${encodeURIComponent(card.name)}`;

                      const isDeletingThis = deleteConfirmId === card.id;

                      return (
                        <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Card Thumbnail & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                onClick={() => handleOpenArtSelectorForExistingCard(card)}
                                className="relative group/thumb cursor-pointer shrink-0"
                                title="Clique para trocar a imagem ou escolher outra edição oficial"
                              >
                                <img
                                  src={card.imageUrl}
                                  alt={card.name}
                                  className="w-10 h-14 object-cover rounded-lg border border-slate-700 bg-slate-950 group-hover/thumb:border-amber-500 transition-colors shadow-sm"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80';
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 bg-black/60 rounded-lg text-[9px] text-amber-300 font-bold transition-opacity">
                                  <Layers className="w-3 h-3" />
                                </div>
                              </div>
                              <div>
                                <span className="font-bold text-white text-xs block hover:text-amber-400 transition-colors">
                                  {card.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    #{card.cardNumber}
                                  </span>
                                  {card.isFoil && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold text-[9px]">
                                      FOIL
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenArtSelectorForExistingCard(card)}
                                    className="text-[10px] text-amber-400/80 hover:text-amber-300 hover:underline flex items-center gap-0.5 ml-1"
                                    title="Trocar imagem ou edição física"
                                  >
                                    <Layers className="w-2.5 h-2.5" />
                                    <span>Trocar Arte</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Collection & Game */}
                          <td className="py-3 px-3">
                            <span className="text-white block font-medium">{card.setName}</span>
                            <span className="inline-block text-[10px] font-bold text-amber-400">
                              {gameMeta.title}
                            </span>
                          </td>

                          {/* Condition & Language */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px]">
                                {card.condition}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold text-[10px]">
                                {card.language}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {card.rarity}
                            </span>
                          </td>

                          {/* Inline Price Editor with Liga link */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <span className="text-slate-400 font-bold">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={card.price}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  onUpdatePriceAndStock(card.id, val, card.stockQuantity);
                                }}
                                className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-emerald-400 font-bold text-center text-xs focus:outline-none focus:border-amber-500"
                              />
                              <a
                                href={ligaSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
                                title={`Conferir menor preço de "${card.name}" na Liga`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>

                          {/* Inline Stock Quantity with Plus/Minus */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                              <button
                                onClick={() => {
                                  if (card.stockQuantity > 0) {
                                    onUpdatePriceAndStock(card.id, card.price, card.stockQuantity - 1);
                                  }
                                }}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs disabled:opacity-40 active:scale-95"
                                disabled={card.stockQuantity <= 0}
                              >
                                -
                              </button>

                              <input
                                type="number"
                                min="0"
                                value={card.stockQuantity}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  onUpdatePriceAndStock(card.id, card.price, val);
                                }}
                                className="w-12 text-center bg-transparent font-bold text-white text-xs focus:outline-none"
                              />

                              <button
                                onClick={() => {
                                  onUpdatePriceAndStock(card.id, card.price, card.stockQuantity + 1);
                                }}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold flex items-center justify-center text-xs active:scale-95"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Availability status */}
                          <td className="py-3 px-3 text-center">
                            {card.stockQuantity > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {card.stockQuantity} un
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                Esgotado
                              </span>
                            )}
                          </td>

                          {/* Actions: Change Art + Delete */}
                          <td className="py-3 px-4 text-right">
                            {isDeletingThis ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    onDeleteCard(card.id);
                                    setDeleteConfirmId(null);
                                    showToast(`Card "${card.name}" removido do catálogo.`, 'info');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px]"
                                >
                                  Excluir
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px]"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenArtSelectorForExistingCard(card)}
                                  className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                                  title="Escolher arte oficial, promo ou foto real deste card"
                                >
                                  <Layers className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(card.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                  title="Remover card do catálogo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredCards.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                          Nenhum card encontrado para o filtro aplicado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in duration-150 max-w-4xl">
            {settingsSaved && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Configurações e personalização da loja salvas com sucesso!</span>
              </div>
            )}

            {/* Logo Settings Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-5">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <span>Logotipo da Loja (Personalizável & Ajuste de Fundo)</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Live Logo Preview on Page Background */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-28 h-28 rounded-2xl bg-slate-950 border-2 border-amber-500/40 flex items-center justify-center p-2.5 shadow-inner overflow-hidden relative group">
                    <GaleraGeekLogo className="w-full h-full" customLogoUrl={configForm.logoUrl} />
                    {isProcessingLogo && (
                      <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold text-center">
                    Visualização na Cor da Página (#020617)
                  </span>
                </div>

                {/* Upload & Options */}
                <div className="flex-1 space-y-3.5">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Você pode alterar o logotipo da <strong>Galera Geek</strong> a qualquer momento enviando um arquivo de imagem (PNG, JPG, SVG, WebP) ou colando um link direto.
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold cursor-pointer shadow-md transition-all active:scale-95">
                      <Upload className="w-4 h-4" />
                      <span>Escolher Nova Imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {configForm.logoUrl && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessingLogo}
                          onClick={() => handleMakeLogoTransparent(logoTolerance, logoErosion)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                          title="Remove fundo branco e elimina qualquer sombreado claro/halo das bordas"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Remover Sombreado & Fundo</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessingLogo}
                          onClick={handleApplyPageColorToLogo}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors active:scale-95 disabled:opacity-50"
                          title="Substitui o fundo branco e qualquer halo claro pela cor exata da página (#020617)"
                        >
                          <Palette className="w-3.5 h-3.5 text-amber-400" />
                          <span>Pintar Fundo da Página (#020617)</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessingLogo}
                          onClick={handleInvertLogo}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold transition-colors active:scale-95 disabled:opacity-50"
                          title="Inverte cores escuras para ficarem visíveis e brilhantes no fundo escuro"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                          <span>Inverter Cores</span>
                        </button>

                        {originalUploadedLogo && originalUploadedLogo !== configForm.logoUrl && (
                          <button
                            type="button"
                            onClick={handleRestoreOriginalUploadedLogo}
                            className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
                            title="Desfazer modificações e voltar à imagem original enviada"
                          >
                            Original
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setConfigForm(prev => ({ ...prev, logoUrl: '' }));
                            setOriginalUploadedLogo(null);
                            showToast('Logo padrão GG restaurado.', 'info');
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-colors"
                        >
                          Restaurar GG
                        </button>
                      </>
                    )}
                  </div>

                  {/* Fine-Tuning Slider for Halo / Defringe */}
                  {configForm.logoUrl && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          Ajuste Fino de Halo (Eliminar Sombreado Claro):
                        </span>
                        <span className="font-mono text-amber-400 font-bold">
                          Tolerância: {logoTolerance}% | Erosão: {logoErosion}px
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">
                            Sensibilidade do Branco (aumente se ainda sobrar cinza/branco):
                          </label>
                          <input
                            type="range"
                            min="20"
                            max="75"
                            value={logoTolerance}
                            onChange={(e) => setLogoTolerance(Number(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">
                            Corte de Borda / Erosão (remove ruído de borda JPEG):
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="1"
                            value={logoErosion}
                            onChange={(e) => setLogoErosion(Number(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isProcessingLogo}
                        onClick={() => handleMakeLogoTransparent(logoTolerance, logoErosion)}
                        className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Aplicar Ajuste nas Bordas do Logo</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Ou informe uma URL externa de imagem:
                    </label>
                    <input
                      type="url"
                      placeholder="https://minha-loja.com/logo.png"
                      value={configForm.logoUrl || ''}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Informational Guidance on transparent logos */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Por que acontece o sombreado claro e como resolver:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 leading-relaxed pl-1">
                      <li>
                        <strong className="text-slate-200">Remoção de Halo (De-Fringe):</strong> Imagens JPEG misturam branco com a borda do desenho (anti-aliasing). O botão roxo <span className="text-purple-300 font-semibold">"Remover Sombreado & Fundo"</span> acima agora subtrai matematicamente essa camada branca das bordas!
                      </li>
                      <li>
                        <strong className="text-slate-200">Pintar Fundo da Página:</strong> Se seu logo tiver traços finos, use o botão <span className="text-amber-300 font-semibold">"Pintar Fundo da Página (#020617)"</span> para fundir o fundo na cor exata do site.
                      </li>
                      <li>
                        <strong className="text-slate-200">Recomendação Profissional:</strong> Se puder, salve o arquivo como <strong className="text-amber-300">PNG</strong> com fundo transparente marcado no Canva, Figma ou Photoshop.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner & Presentation Texts */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Textos & Apresentação da Página Inicial (Banner Principal)</span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-semibold block">
                      Texto de Apresentação / Slogan do Banner Principal
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfigForm(prev => ({
                        ...prev,
                        heroDescription: 'Encontre seus singles favoritos de Magic: The Gathering, Pokémon, Disney Lorcana, Riftbound e One Piece com estoque real, transparência e cuidado de quem também joga.'
                      }))}
                      className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                    >
                      Restaurar texto original
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={configForm.heroDescription ?? ''}
                    onChange={(e) => setConfigForm({ ...configForm, heroDescription: e.target.value })}
                    placeholder="Ex: Encontre seus singles favoritos de Magic: The Gathering, Pokémon, Disney Lorcana, Riftbound e One Piece com estoque real, transparência e cuidado de quem também joga."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed font-normal"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Este texto aparece com destaque no topo da página inicial, logo abaixo do nome da loja.
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Faixa de Aviso Superior (Barra Promocional no Topo)
                  </label>
                  <input
                    type="text"
                    value={configForm.bannerNotice}
                    onChange={(e) => setConfigForm({ ...configForm, bannerNotice: e.target.value })}
                    placeholder="⚡ ENVIOS PARA TODO O BRASIL • CARTA REGISTRADA COM SEGURO & TOPLOADER • 5% OFF NO PIX"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Faixa contínua que corre no topo de todas as páginas da loja.
                  </span>
                </div>
              </div>
            </div>

            {/* Store Information & Contacts */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Dados de Identidade & Contatos Oficiais</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nome da Loja</label>
                  <input
                    type="text"
                    required
                    value={configForm.storeName}
                    onChange={(e) => setConfigForm({ ...configForm, storeName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-pink-400" />
                    <span>Instagram Oficial</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={configForm.instagram}
                    onChange={(e) => setConfigForm({ ...configForm, instagram: e.target.value })}
                    placeholder="@galerageeksjn"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Link oficial: https://www.instagram.com/galerageeksjn/</span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp para Pedidos (com DDI e DDD)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={configForm.whatsapp}
                    onChange={(e) => setConfigForm({ ...configForm, whatsapp: e.target.value })}
                    placeholder="5532998136130"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Número oficial: (32) 99813-6130</span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Senha de Acesso ao Painel Admin</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={configForm.adminPassword || 'admin'}
                    onChange={(e) => setConfigForm({ ...configForm, adminPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Senha exigida para abrir a administração</span>
                </div>
              </div>
            </div>

            {/* PIX Payment & Discount Settings */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span>Pagamento via PIX & Desconto Promocional</span>
                </div>
                {configForm.pixDiscountPercent > 0 ? (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {configForm.pixDiscountPercent}% OFF Ativo
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full">
                    Desconto Desativado (0%)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Desconto no PIX (%)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={configForm.pixDiscountPercent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setConfigForm({ ...configForm, pixDiscountPercent: isNaN(val) ? 0 : Math.max(0, Math.min(100, val)) });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-300 font-bold text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block leading-tight">
                    {configForm.pixDiscountPercent > 0 
                      ? `Exibindo ${configForm.pixDiscountPercent}% de desconto no topo, nos cards e no carrinho.` 
                      : 'Valor 0: Nenhuma menção ou valor promocional de PIX aparecerá nos cards ou no banner.'}
                  </span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Chave PIX da Loja
                  </label>
                  <input
                    type="text"
                    value={configForm.pixKey}
                    onChange={(e) => setConfigForm({ ...configForm, pixKey: e.target.value })}
                    placeholder="pix@galerageek.com.br ou CPF ou Celular"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Chave exibida para o cliente copiar no carrinho</span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Tipo da Chave PIX
                  </label>
                  <select
                    value={configForm.pixKeyType}
                    onChange={(e) => setConfigForm({ ...configForm, pixKeyType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Email">Email</option>
                    <option value="CPF/CNPJ">CPF / CNPJ</option>
                    <option value="Telefone">Telefone / Celular</option>
                    <option value="Chave Aleatória">Chave Aleatória (EVP)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">Ajuda o cliente a identificar o tipo na hora de transferir</span>
                </div>
              </div>
            </div>

            {/* Shipping & Delivery Settings */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>Taxas de Frete & Frete Grátis</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Carta Registrada (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={configForm.shippingCartaRegistrada}
                    onChange={(e) => setConfigForm({ ...configForm, shippingCartaRegistrada: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Com seguro e toploader</span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">PAC Correios (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={configForm.shippingPac}
                    onChange={(e) => setConfigForm({ ...configForm, shippingPac: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Envio padrão pacotes</span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">SEDEX Correios (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={configForm.shippingSedex}
                    onChange={(e) => setConfigForm({ ...configForm, shippingSedex: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Envio expresso rápido</span>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Frete Grátis a partir de (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={configForm.freeShippingThreshold}
                    onChange={(e) => setConfigForm({ ...configForm, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Valor mínimo do pedido</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Todas as Configurações</span>
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Camera Modal for Scanning Cards */}
      <CardCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCardIdentified={handleCardIdentified}
      />

      {/* Official Prints & Art Selector Modal */}
      <CardPrintsSelectorModal
        isOpen={printsModalState.isOpen}
        onClose={() => setPrintsModalState((prev) => ({ ...prev, isOpen: false }))}
        cardName={printsModalState.name}
        game={printsModalState.game}
        currentImageUrl={printsModalState.currentImageUrl}
        onSelectPrint={handleSelectCardPrint}
      />
    </div>
  );
};
