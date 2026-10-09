import React, { useState, useEffect, useMemo } from 'react';
import { 
  CardItem, 
  CartItem, 
  StoreConfig, 
  TCGGame, 
  CardCondition, 
  CardLanguage,
  AdminRole 
} from './types';
import { 
  loadStoredCards, 
  saveStoredCards, 
  loadStoredConfig, 
  saveStoredConfig,
  loadStoredCart,
  saveStoredCart,
  getStoredAdminAuth,
  setStoredAdminAuth,
  getStoredAdminUser
} from './utils/storage';
import { normalizeSearchText } from './utils/formatters';
import { 
  cardMatchesQuery, 
  cardMatchesTextFilter, 
  normalizeText 
} from './utils/searchMatcher';
import { Navbar } from './components/Navbar';
import { TopAnnouncementBar } from './components/TopAnnouncementBar';
import { BannerHero } from './components/BannerHero';
import { CardFilters } from './components/CardFilters';
import { CardItemView } from './components/CardItemView';
import { CardDetailModal } from './components/CardDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { AdminPage } from './components/AdminPage';
import { AdminLoginModal } from './components/AdminLoginModal';
import { INITIAL_CARDS, DEFAULT_STORE_CONFIG } from './data/initialCards';
import { GaleraGeekLogo } from './components/GaleraGeekLogo';
import { 
  Instagram, 
  MessageCircle, 
  ShieldCheck, 
  Sparkles, 
  Layers,
  Lock,
  LayoutDashboard
} from 'lucide-react';

export default function App() {
  // State: Stored Catalog and Configuration
  const [cards, setCards] = useState<CardItem[]>(() => loadStoredCards());
  const [config, setConfig] = useState<StoreConfig>(() => loadStoredConfig());

  // View state: 'store' or 'admin'
  const [currentView, setCurrentView] = useState<'store' | 'admin'>('store');

  // State: Cart
  const [cart, setCart] = useState<CartItem[]>(() => loadStoredCart());

  // State: Admin Auth & Session
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => getStoredAdminAuth());
  const [currentAdminUser, setCurrentAdminUser] = useState<{ username: string; role: AdminRole; name: string } | null>(() => getStoredAdminUser());
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // State: Filters
  const [selectedGame, setSelectedGame] = useState<TCGGame | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardType, setSelectedCardType] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [pricePreset, setPricePreset] = useState<string>('all');
  const [cardTextQuery, setCardTextQuery] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<CardCondition | 'all'>('all');
  const [selectedFoil, setSelectedFoil] = useState<'all' | 'foil' | 'non-foil'>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<CardLanguage | 'all'>('all');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'name-asc' | 'featured'>('featured');

  // State: Modals
  const [selectedCardForModal, setSelectedCardForModal] = useState<CardItem | null>(null);
  const [adminInitialEditCard, setAdminInitialEditCard] = useState<CardItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Auto-deduplicate and clean up any redundant Titanic Bulvox or duplicate cards on mount
  useEffect(() => {
    setCards((prev) => {
      const isBulvox = (c: CardItem) => {
        const idLower = (c.id || '').toLowerCase();
        const nameLower = (c.name || '').toLowerCase();
        return idLower === 'mtg-boifalo-titanico' || 
               idLower === 'mtg-titanic-bulvox' || 
               nameLower.includes('bulvox') || 
               nameLower.includes('boifalo') || 
               nameLower.includes('bôifalo');
      };

      let keptBulvox = false;
      let cleaned = prev.filter((c) => {
        if (!isBulvox(c)) return true;
        if (!keptBulvox) {
          keptBulvox = true;
          c.id = 'mtg-boifalo-titanico';
          c.name = 'Bôifalo Titânico';
          c.imageUrl = 'https://cards.scryfall.io/large/front/3/f/3f42c4d7-b555-449c-a539-119c1ae62232.jpg?1783944865';
          c.cardType = 'Criatura — Besta';
          c.manaCost = '{6}{G}{G}';
          c.power = '7';
          c.toughness = '4';
          c.description = 'Atropelar (Trample)\nMetamorfose {4}{G}{G}{G} (Você pode baixar este card com a face voltada para baixo como uma criatura 2/2 por {3}. Volte sua face para cima a qualquer momento pagando seu custo de metamorfose). (With natural laws abandoned, excess thrives).';
          return true;
        }
        return false;
      });

      // Deduplicate cards with the exact same ID
      const seenIds = new Set<string>();
      cleaned = cleaned.filter((c) => {
        if (seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });

      // Deduplicate cards with duplicate name and game if one has no image and one has an image
      const byNameGame = new Map<string, CardItem[]>();
      cleaned.forEach((c) => {
        const key = `${c.game}:${(c.name || '').toLowerCase().trim()}`;
        if (!byNameGame.has(key)) byNameGame.set(key, []);
        byNameGame.get(key)!.push(c);
      });

      byNameGame.forEach((group) => {
        if (group.length > 1) {
          const withImg = group.filter((c) => c.imageUrl && c.imageUrl.trim() !== '');
          const withoutImg = group.filter((c) => !c.imageUrl || c.imageUrl.trim() === '');
          if (withImg.length > 0 && withoutImg.length > 0) {
            const removeIds = new Set(withoutImg.map((c) => c.id));
            cleaned = cleaned.filter((c) => !removeIds.has(c.id));
          }
        }
      });

      // Restore images from initial cards if missing
      cleaned.forEach((c) => {
        if (!c.imageUrl || c.imageUrl.trim() === '') {
          const match = INITIAL_CARDS.find((ic) => 
            ic.id === c.id || 
            (ic.game === c.game && ic.name.toLowerCase().trim() === (c.name || '').toLowerCase().trim())
          );
          if (match && match.imageUrl) {
            c.imageUrl = match.imageUrl;
          }
        }
      });

      return cleaned;
    });
  }, []);

  // Persist Catalog and Config changes
  useEffect(() => {
    saveStoredCards(cards);
  }, [cards]);

  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  // Persist Cart changes (add, remove, clear, quantity change)
  useEffect(() => {
    saveStoredCart(cart);
  }, [cart]);

  // Listen to URL Hash (e.g. #/gerenciador-geek) to trigger admin access
  useEffect(() => {
    const checkHashRoute = () => {
      const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '').trim();
      const currentSlug = (config.adminSlug || 'gerenciador-geek').toLowerCase().replace(/^\/?/, '').trim();

      if (hash && (hash === currentSlug || hash === `/${currentSlug}`)) {
        if (isAdminAuthenticated) {
          setCurrentView('admin');
        } else {
          setIsAdminLoginOpen(true);
        }
      }
    };

    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);
    return () => window.removeEventListener('hashchange', checkHashRoute);
  }, [config.adminSlug, isAdminAuthenticated]);

  // Counts by game for badges
  const gameCounts = useMemo(() => {
    const counts: Record<string, number> = {
      magic: 0,
      pokemon: 0,
      lorcana: 0,
      riftbound: 0,
      onepiece: 0,
    };
    cards.forEach((card) => {
      if (counts[card.game] !== undefined) {
        counts[card.game]++;
      }
    });
    return counts;
  }, [cards]);

  // Dynamically extract card types available for the current game selection (or all games)
  const availableCardTypes = useMemo(() => {
    const relevantCards = cards.filter((card) => selectedGame === 'all' || card.game === selectedGame);
    const counts: Record<string, number> = {};

    // Base root categories for fast filtering
    const macroCategories = ['Artefato', 'Criatura', 'Encantamento', 'Pokémon', 'Champion Unit', 'Personagem', 'Líder'];
    macroCategories.forEach((macro) => {
      const matchCount = relevantCards.filter(
        (c) => c.cardType && normalizeText(c.cardType).includes(normalizeText(macro))
      ).length;
      if (matchCount > 0) {
        counts[macro] = matchCount;
      }
    });

    // Specific sub-types
    relevantCards.forEach((card) => {
      if (card.cardType) {
        const typeClean = card.cardType.trim();
        // If it's already one of the macros, don't duplicate
        if (!macroCategories.includes(typeClean)) {
          counts[typeClean] = (counts[typeClean] || 0) + 1;
        }
      }
    });

    return Object.entries(counts)
      .map(([type, count]) => ({
        id: type,
        label: type,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [cards, selectedGame]);

  // Filtered and sorted cards for store view
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // 1. Game filter
      if (selectedGame !== 'all' && card.game !== selectedGame) return false;

      // 2. Card Type filter (supports broad macros like "Artefato" as well as specific types)
      if (selectedCardType !== 'all') {
        if (!card.cardType) return false;
        const normType = normalizeText(card.cardType);
        const normTarget = normalizeText(selectedCardType);
        if (!normType.includes(normTarget)) return false;
      }

      // 3. Price range filter (minPrice / maxPrice)
      if (minPrice !== '' && card.price < Number(minPrice)) return false;
      if (maxPrice !== '' && card.price > Number(maxPrice)) return false;

      // 4. Dedicated Card Text / Effect filter (rules, abilities, lore, description with synonym & stem support)
      if (cardTextQuery.trim() !== '') {
        if (!cardMatchesTextFilter(card, cardTextQuery)) return false;
      }

      // 5. General Search query filter (matches name, set, code, number, cardType, rules text, and description)
      if (searchQuery.trim() !== '') {
        if (!cardMatchesQuery(card, searchQuery)) return false;
      }

      // 6. Condition filter
      if (selectedCondition !== 'all' && card.condition !== selectedCondition) return false;

      // 7. Foil filter
      if (selectedFoil === 'foil' && !card.isFoil) return false;
      if (selectedFoil === 'non-foil' && card.isFoil) return false;

      // 8. Language filter
      if (selectedLanguage !== 'all' && card.language !== selectedLanguage) return false;

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'featured':
        default:
          return (b.originalPrice || b.price) - (a.originalPrice || a.price);
      }
    });
  }, [
    cards, 
    selectedGame, 
    selectedCardType, 
    minPrice, 
    maxPrice, 
    cardTextQuery, 
    searchQuery, 
    selectedCondition, 
    selectedFoil, 
    selectedLanguage, 
    sortBy
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedGame !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    if (selectedCardType !== 'all') count++;
    if (minPrice !== '' || maxPrice !== '' || pricePreset !== 'all') count++;
    if (cardTextQuery.trim() !== '') count++;
    if (selectedCondition !== 'all') count++;
    if (selectedFoil !== 'all') count++;
    if (selectedLanguage !== 'all') count++;
    if (sortBy !== 'featured') count++;
    return count;
  }, [
    selectedGame, 
    searchQuery, 
    selectedCardType, 
    minPrice, 
    maxPrice, 
    pricePreset, 
    cardTextQuery, 
    selectedCondition, 
    selectedFoil, 
    selectedLanguage, 
    sortBy
  ]);

  const handleResetFilters = () => {
    setSelectedGame('all');
    setSearchQuery('');
    setSelectedCardType('all');
    setMinPrice('');
    setMaxPrice('');
    setPricePreset('all');
    setCardTextQuery('');
    setSelectedCondition('all');
    setSelectedFoil('all');
    setSelectedLanguage('all');
    setSortBy('featured');
  };

  // Cart operations
  const [cartAnimationTrigger, setCartAnimationTrigger] = useState(0);

  const handleAddToCart = (card: CardItem, quantity: number = 1) => {
    if (card.stockQuantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.card.id === card.id);
      let updated: CartItem[];
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, card.stockQuantity);
        updated = prev.map((item) =>
          item.card.id === card.id ? { ...item, quantity: newQty } : item
        );
      } else {
        updated = [...prev, { card, quantity: Math.min(quantity, card.stockQuantity) }];
      }
      saveStoredCart(updated);
      return updated;
    });
    setCartAnimationTrigger(Date.now());
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (cardId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(cardId);
      return;
    }
    setCart((prev) => {
      const updated = prev.map((item) => {
        if (item.card.id === cardId) {
          const maxAllowed = item.card.stockQuantity;
          return { ...item, quantity: Math.min(quantity, maxAllowed) };
        }
        return item;
      });
      saveStoredCart(updated);
      return updated;
    });
  };

  const handleRemoveCartItem = (cardId: string) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.card.id !== cardId);
      saveStoredCart(updated);
      return updated;
    });
  };

  const handleClearCart = () => {
    saveStoredCart([]);
    setCart([]);
  };

  // Catalog operations (Admin)
  const handleUpdatePriceAndStock = (cardId: string, price: number, stock: number) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, price, stockQuantity: stock } : c))
    );
  };

  const handleUpdateCard = (updatedCard: CardItem) => {
    setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  };

  const handleDeleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setCart((prev) => prev.filter((item) => item.card.id !== cardId));
  };

  const handleAddCard = (newCard: CardItem) => {
    setCards((prev) => [newCard, ...prev]);
  };

  const handleImportCards = (imported: CardItem[]) => {
    setCards(imported);
  };

  const handleResetDefaultCards = () => {
    setCards(INITIAL_CARDS);
    setConfig(DEFAULT_STORE_CONFIG);
    setCart([]);
  };

  const handleSaveConfig = (newConfig: StoreConfig) => {
    setConfig(newConfig);
  };

  const handleOpenAdmin = () => {
    if (isAdminAuthenticated) {
      setCurrentView('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdminLoginSuccess = (
    remember: boolean,
    user: { username: string; role: AdminRole; name: string }
  ) => {
    setIsAdminAuthenticated(true);
    setCurrentAdminUser(user);
    setStoredAdminAuth(remember, user);
    setIsAdminLoginOpen(false);
    setCurrentView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setCurrentAdminUser(null);
    setStoredAdminAuth(false, null);
    setCurrentView('store');
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const instagramUrl = config.instagram.startsWith('http')
    ? config.instagram
    : `https://www.instagram.com/${config.instagram.replace('@', '').trim()}`;
  const instagramDisplay = config.instagram.includes('instagram.com')
    ? '@galerageeksjn'
    : (config.instagram.startsWith('@') ? config.instagram : `@${config.instagram}`);

  const cleanWhatsapp = config.whatsapp.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}`;

  // If in Admin Page View
  if (currentView === 'admin') {
    return (
      <>
        <AdminPage
          cards={cards}
          config={config}
          currentUser={currentAdminUser}
          initialEditCard={adminInitialEditCard}
          onClearInitialEditCard={() => setAdminInitialEditCard(null)}
          onUpdatePriceAndStock={handleUpdatePriceAndStock}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          onAddCard={handleAddCard}
          onImportCards={handleImportCards}
          onResetDefaultCards={handleResetDefaultCards}
          onSaveConfig={handleSaveConfig}
          onBackToStore={() => {
            setCurrentView('store');
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onLogout={handleAdminLogout}
        />

        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          expectedPassword={config.adminPassword || 'admin'}
          users={config.adminUsers || []}
          onSuccessLogin={handleAdminLoginSuccess}
        />
      </>
    );
  }

  // Otherwise, Storefront View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Announcement Bar (Seasonal promotions, discount notices, and dismiss button) */}
      <TopAnnouncementBar config={config} />

      {/* Main Navbar */}
      <Navbar
        config={config}
        cart={cart}
        isAdminAuthenticated={isAdminAuthenticated}
        cartAnimationTrigger={cartAnimationTrigger}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={handleOpenAdmin}
        onLogoutAdmin={handleAdminLogout}
      />

      {/* Hero Banner */}
      <BannerHero
        config={config}
        totalCardsCount={cards.length}
      />

      {/* Main Store Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Filters and Navigation */}
        <CardFilters
          selectedGame={selectedGame}
          onSelectGame={setSelectedGame}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCardType={selectedCardType}
          onCardTypeChange={setSelectedCardType}
          availableCardTypes={availableCardTypes}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          pricePreset={pricePreset}
          onPricePresetChange={setPricePreset}
          cardTextQuery={cardTextQuery}
          onCardTextQueryChange={setCardTextQuery}
          selectedCondition={selectedCondition}
          onConditionChange={setSelectedCondition}
          selectedFoil={selectedFoil}
          onFoilChange={setSelectedFoil}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          sortBy={sortBy}
          onSortChange={setSortBy}
          gameCounts={gameCounts}
          onResetFilters={handleResetFilters}
          activeFilterCount={activeFilterCount}
        />

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg sm:text-xl text-white">
              {selectedGame === 'all'
                ? 'Todos os Cards Disponíveis'
                : selectedGame === 'magic'
                ? 'Magic: The Gathering'
                : selectedGame === 'pokemon'
                ? 'Pokémon TCG'
                : selectedGame === 'lorcana'
                ? 'Disney Lorcana'
                : selectedGame === 'riftbound'
                ? 'Riftbound TCG'
                : 'One Piece Card Game'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              {filteredCards.length} {filteredCards.length === 1 ? 'card' : 'cards'}
            </span>
          </div>
        </div>

        {/* Cards Grid with strict stretch alignment and harmonious sizing */}
        {filteredCards.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4.5 items-stretch">
            {filteredCards.map((card) => (
              <CardItemView
                key={card.id}
                card={card}
                config={config}
                pixDiscountPercent={config.pixDiscountPercent}
                onSelect={(selected) => setSelectedCardForModal(selected)}
                onViewDetails={(selected) => setSelectedCardForModal(selected)}
                onAddToCart={(selected) => handleAddToCart(selected, 1)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Nenhum card encontrado</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              Não encontramos nenhum card com os filtros ou termo de busca selecionados. Tente ajustar os filtros ou buscar por outro termo.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all"
            >
              Limpar Filtros de Busca
            </button>
          </div>
        )}
      </main>

      {/* Store Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 pt-10 pb-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <GaleraGeekLogo className="w-10 h-10" customLogoUrl={config.logoUrl} />
              <div>
                <span className="font-display font-black text-base text-white">{config.storeName}</span>
                <p className="text-[11px] text-slate-500">
                  Marketplace e Loja Especializada de TCG da Galera Geek
                </p>
              </div>
            </div>

            {/* Social links & authenticated admin link */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-pink-400 hover:text-pink-300 font-semibold"
                title={`Instagram ${instagramDisplay}`}
              >
                <Instagram className="w-4 h-4" />
                <span>{instagramDisplay}</span>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
                title="Falar no WhatsApp Galera Geek (32) 99813-6130"
              >
                <MessageCircle className="w-4 h-4" />
                <span>(32) 99813-6130</span>
              </a>
              {isAdminAuthenticated && (
                <button
                  onClick={handleOpenAdmin}
                  className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-colors"
                  title="Acessar Página de Administração"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Painel ADM</span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 text-center sm:text-left">
            <p>
              © {new Date().getFullYear()} {config.storeName}. Todos os direitos reservados.
              <br />
              Imagens e marcas de cards são propriedades de suas respectivas editoras (Wizards of the Coast / Hasbro, The Pokémon Company / Nintendo, Disney / Ravensburger, Bandai).
            </p>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Envio 100% Seguro
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedCardForModal && (
        <CardDetailModal
          card={selectedCardForModal}
          config={config}
          pixDiscountPercent={config.pixDiscountPercent}
          isAdmin={isAdminAuthenticated}
          onUpdateCard={handleUpdateCard}
          onEditCard={isAdminAuthenticated ? (c) => {
            setAdminInitialEditCard(c);
            setSelectedCardForModal(null);
            setCurrentView('admin');
          } : undefined}
          onClose={() => setSelectedCardForModal(null)}
          onAddToCart={(c, qty) => handleAddToCart(c, qty)}
        />
      )}

      {isCartOpen && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cart}
          config={config}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveCartItem}
          onClearCart={handleClearCart}
        />
      )}

      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          expectedPassword={config.adminPassword || 'admin'}
          users={config.adminUsers || []}
          onSuccessLogin={handleAdminLoginSuccess}
        />
      )}
    </div>
  );
}
