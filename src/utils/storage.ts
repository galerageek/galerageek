import { CardItem, StoreConfig, CartItem } from '../types';
import { INITIAL_CARDS, DEFAULT_STORE_CONFIG } from '../data/initialCards';

const CARDS_STORAGE_KEY = 'galera_geek_cards_v4';
const CONFIG_STORAGE_KEY = 'galera_geek_config_v2';

export const loadStoredCards = (): CardItem[] => {
  try {
    let raw = localStorage.getItem(CARDS_STORAGE_KEY);
    // Backward compatibility: load from prior storage keys if present
    if (!raw) {
      raw = localStorage.getItem('galera_geek_cards_v3') || 
            localStorage.getItem('galera_geek_cards_v2') || 
            localStorage.getItem('galera_geek_cards');
    }

    if (!raw) {
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(INITIAL_CARDS));
      return INITIAL_CARDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Map initial cards for quick lookup of verified official image assets and descriptions
      const initialMap = new Map<string, CardItem>();
      INITIAL_CARDS.forEach(c => initialMap.set(c.id, c));

      // Sanitize cards and auto-upgrade broken/stale image URLs and rich rules texts
      let updated = parsed.map((c: any) => {
        let imageUrl = c.imageUrl || '';
        const initial = initialMap.get(c.id);

        if (
          initial && 
          (!imageUrl || 
           imageUrl.includes('lorcania.com') || 
           imageUrl.includes('unsplash.com') ||
           imageUrl.includes('ddragon.leagueoflegends.com/cdn/img/champion/loading') ||
           c.id.startsWith('mtg-') ||
           c.id.startsWith('rift-') ||
           c.id.startsWith('op-') ||
           c.id.startsWith('lorcana-'))
        ) {
          imageUrl = initial.imageUrl;
        } else if (imageUrl && imageUrl.includes('en.onepiece-cardgame.com') && !imageUrl.includes('/api/card-image-proxy') && !imageUrl.includes('wsrv.nl')) {
          imageUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&output=webp`;
        }

        // If initial card exists, ensure clean canonical name without parentheses
        let name = c.name;
        if (initial && initial.name) {
          name = initial.name;
        } else if (name && /\([^)]*\)/.test(name)) {
          // If user had cards stored with parentheses, clean them
          name = name.replace(/\s*\([^)]*\)/g, '').trim();
        }

        let setName = c.setName || (initial ? initial.setName : '');
        let setCode = c.setCode || (initial ? initial.setCode : '');
        let cardNumber = c.cardNumber || (initial ? initial.cardNumber : '');

        // Prefer user-saved / custom-edited fields, fallback to canonical initial catalog
        let description = (c.description !== undefined && c.description !== null && c.description.trim() !== '') 
          ? c.description 
          : (initial?.description || '');
        let cardType = (c.cardType && c.cardType.trim() !== '' && c.cardType !== 'Card Colecionável') 
          ? c.cardType 
          : (initial?.cardType || c.cardType || '');
        let colorOrAttribute = c.colorOrAttribute || (initial ? initial.colorOrAttribute : '');
        let language = c.language || (initial ? initial.language : 'PT');
        let isFoil = c.isFoil ?? (initial ? initial.isFoil : false);
        let finishType = c.finishType || (initial ? initial.finishType : 'Normal');
        let rarity = c.rarity || (initial ? initial.rarity : 'Comum');

        let price = typeof c.price === 'number' ? c.price : (initial ? initial.price : 25);
        let originalPrice = c.originalPrice;

        if (initial && (c.id.startsWith('rift-') || c.id.startsWith('lorcana-'))) {
          // If stored card still has old dummy prices (e.g. 89.00 for super rare bulk), synchronize with real LigaLorcana price
          if (c.id.startsWith('lorcana-') && (c.price === 89 || c.price === 3450 || c.price === 980 || c.price === 1850 || c.price === 1250)) {
            price = initial.price;
            originalPrice = initial.originalPrice;
          }
        }

        // If Magic cards have old outdated prices (One Ring was 649/389.90, Doubling Season was 98.00/189.90), synchronize with real LigaMagic quotes
        if (initial && c.id === 'mtg-one-ring' && (c.price === 389.90 || c.price === 649.00 || c.price < 400 || c.finishType === 'Foil Showcase')) {
          price = initial.price;
          originalPrice = initial.originalPrice;
          finishType = initial.finishType;
          isFoil = initial.isFoil;
        }
        if (initial && c.id === 'mtg-doubling-season' && (c.price === 98.00 || c.price === 189.90 || c.price < 250)) {
          price = initial.price;
          originalPrice = initial.originalPrice;
          finishType = initial.finishType;
          isFoil = initial.isFoil;
        }

        let manaCost = c.manaCost || initial?.manaCost;
        let power = c.power || initial?.power;
        let toughness = c.toughness || initial?.toughness;
        let loyalty = c.loyalty || initial?.loyalty;
        let defense = c.defense || initial?.defense;

        const normName = (name || '').toLowerCase();
        // Specifically guarantee Boifalo Titanico has complete type, stats, and verified Scryfall image
        if (c.id === 'mtg-boifalo-titanico' || normName.includes('boifalo') || normName.includes('bôifalo') || normName.includes('bulvox')) {
          if (!cardType || cardType === 'Card Colecionável') cardType = 'Criatura — Besta';
          if (!manaCost) manaCost = '{6}{G}{G}';
          if (!power) power = '7';
          if (!toughness) toughness = '4';
          if (!description) description = 'Atropelar (Trample)\nMetamorfose {4}{G}{G}{G} (Você pode baixar este card com a face voltada para baixo como uma criatura 2/2 por {3}. Volte sua face para cima a qualquer momento pagando seu custo de metamorfose). (With natural laws abandoned, excess thrives).';
          if (!imageUrl || imageUrl.includes('a1608985-7b56-42f2-a0eb-bc29fe80bbdf') || imageUrl.trim() === '') {
            imageUrl = 'https://cards.scryfall.io/large/front/3/f/3f42c4d7-b555-449c-a539-119c1ae62232.jpg?1783944865';
          }
        }

        // Infer cardType if missing or generic
        if (!cardType || cardType === 'Card Colecionável') {
          if (c.game === 'magic') {
            const dNorm = (description || '').toLowerCase();
            if (dNorm.includes('criatura') || (power && toughness)) cardType = 'Criatura';
            else if (dNorm.includes('artefato lendário')) cardType = 'Artefato Lendário';
            else if (dNorm.includes('artefato')) cardType = 'Artefato';
            else if (dNorm.includes('encantamento')) cardType = 'Encantamento';
            else if (dNorm.includes('mágica instantânea') || dNorm.includes('instant')) cardType = 'Mágica Instantânea';
            else if (dNorm.includes('feitiço') || dNorm.includes('sorcery')) cardType = 'Feitiço';
            else if (dNorm.includes('planeswalker')) cardType = 'Planeswalker';
            else if (dNorm.includes('terreno') || dNorm.includes('land')) cardType = 'Terreno';
            else cardType = 'Card de Magic';
          } else if (c.game === 'pokemon') {
            if (normName.includes(' ex') || (description || '').toLowerCase().includes('fase 2')) cardType = 'Pokémon Fase 2 — ex';
            else if (normName.includes(' v')) cardType = 'Pokémon Básico — V';
            else cardType = 'Pokémon Básico';
          } else if (c.game === 'onepiece') {
            if (normName.includes('zoro') && !normName.includes('luffy')) cardType = 'Líder Supernovas / Piratas do Chapéu de Palha';
            else cardType = 'Personagem Chapéu de Palha';
          } else if (c.game === 'lorcana') {
            cardType = 'Character';
          } else if (c.game === 'riftbound') {
            cardType = 'Champion Unit';
          }
        }

        return {
          ...c,
          name,
          setName,
          setCode,
          cardNumber,
          description,
          cardType,
          manaCost,
          power,
          toughness,
          loyalty,
          defense,
          colorOrAttribute,
          language,
          isFoil,
          finishType,
          rarity,
          imageUrl,
          price,
          originalPrice,
          stockQuantity: typeof c.stockQuantity === 'number' ? c.stockQuantity : 1,
        };
      });

      // Deduplicate cards: Specifically guarantee exactly ONE Bôifalo Titânico / Titanic Bulvox with verified image
      const isBulvoxCard = (cardItem: any) => {
        const idLower = (cardItem.id || '').toLowerCase();
        const nameLower = (cardItem.name || '').toLowerCase();
        return idLower === 'mtg-boifalo-titanico' || 
               idLower === 'mtg-titanic-bulvox' || 
               nameLower.includes('bulvox') || 
               nameLower.includes('boifalo') || 
               nameLower.includes('bôifalo');
      };

      let keptBulvox = false;
      updated = updated.filter((cardItem: any) => {
        if (!isBulvoxCard(cardItem)) return true;
        if (!keptBulvox) {
          keptBulvox = true;
          cardItem.id = 'mtg-boifalo-titanico';
          cardItem.name = 'Bôifalo Titânico';
          cardItem.imageUrl = 'https://cards.scryfall.io/large/front/3/f/3f42c4d7-b555-449c-a539-119c1ae62232.jpg?1783944865';
          cardItem.cardType = 'Criatura — Besta';
          cardItem.manaCost = '{6}{G}{G}';
          cardItem.power = '7';
          cardItem.toughness = '4';
          cardItem.description = 'Atropelar (Trample)\nMetamorfose {4}{G}{G}{G} (Você pode baixar este card com a face voltada para baixo como uma criatura 2/2 por {3}. Volte sua face para cima a qualquer momento pagando seu custo de metamorfose). (With natural laws abandoned, excess thrives).';
          return true;
        }
        return false;
      });

      // Deduplicate cards with the exact same ID
      const seenIds = new Set<string>();
      updated = updated.filter((cardItem: any) => {
        if (seenIds.has(cardItem.id)) return false;
        seenIds.add(cardItem.id);
        return true;
      });

      // Deduplicate cards with duplicate name and game if one has no image and one has an image
      const byNameGame = new Map<string, any[]>();
      updated.forEach((cardItem: any) => {
        const key = `${cardItem.game}:${(cardItem.name || '').toLowerCase().trim()}`;
        if (!byNameGame.has(key)) byNameGame.set(key, []);
        byNameGame.get(key)!.push(cardItem);
      });

      byNameGame.forEach((group) => {
        if (group.length > 1) {
          const withImg = group.filter((c: any) => c.imageUrl && c.imageUrl.trim() !== '');
          const withoutImg = group.filter((c: any) => !c.imageUrl || c.imageUrl.trim() === '');
          if (withImg.length > 0 && withoutImg.length > 0) {
            const removeIds = new Set(withoutImg.map((c: any) => c.id));
            updated = updated.filter((c: any) => !removeIds.has(c.id));
          }
        }
      });

      // Restore images from INITIAL_CARDS if any card still has an empty imageUrl
      updated.forEach((cardItem: any) => {
        if (!cardItem.imageUrl || cardItem.imageUrl.trim() === '') {
          const match = INITIAL_CARDS.find((ic) => 
            ic.id === cardItem.id || 
            (ic.game === cardItem.game && ic.name.toLowerCase().trim() === (cardItem.name || '').toLowerCase().trim())
          );
          if (match && match.imageUrl) {
            cardItem.imageUrl = match.imageUrl;
          }
        }
      });

      // Append any newly added initial cards (e.g. rift-zed, rift-garen) only if not already present
      INITIAL_CARDS.forEach((initCard) => {
        const initNameNorm = (initCard.name || '').toLowerCase().trim();
        const alreadyExists = updated.some((c: any) => {
          if (c.id === initCard.id) return true;
          const cNameNorm = (c.name || '').toLowerCase().trim();
          if (c.game === initCard.game && cNameNorm === initNameNorm) return true;
          if (isBulvoxCard(initCard) && isBulvoxCard(c)) return true;
          return false;
        });

        if (!alreadyExists) {
          updated.push(initCard);
        }
      });

      // Save updated cards back to localStorage so the client's cache is permanently fixed
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
    return INITIAL_CARDS;
  } catch {
    return INITIAL_CARDS;
  }
};

export const saveStoredCards = (cards: CardItem[]): void => {
  try {
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
  } catch (err) {
    console.error('Error saving cards to localStorage', err);
  }
};

const ADMIN_AUTH_KEY = 'galera_geek_admin_auth_v1';

export const loadStoredConfig = (): StoreConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_STORE_CONFIG));
      return DEFAULT_STORE_CONFIG;
    }
    const parsed = JSON.parse(raw);
    const updated: StoreConfig = { ...DEFAULT_STORE_CONFIG, ...parsed };

    // Migrate old placeholder values if present
    if (updated.whatsapp === '5511987654321' || !updated.whatsapp) {
      updated.whatsapp = '5532998136130';
    }
    if (updated.instagram === '@galerageek_' || !updated.instagram) {
      updated.instagram = '@galerageeksjn';
    }
    if (!updated.adminPassword) {
      updated.adminPassword = 'admin';
    }
    if (!updated.adminSlug) {
      updated.adminSlug = 'gerenciador-geek';
    }
    if (!updated.adminUsers || updated.adminUsers.length === 0) {
      updated.adminUsers = [
        {
          id: 'admin-master',
          username: 'admin',
          name: 'Administrador Geral',
          password: updated.adminPassword || 'admin',
          role: 'admin',
          createdAt: new Date().toISOString().slice(0, 10),
        },
        {
          id: 'user-estoque',
          username: 'estoque',
          name: 'Operador de Estoque',
          password: 'cards',
          role: 'estoquista',
          createdAt: new Date().toISOString().slice(0, 10),
        }
      ];
    }

    return updated;
  } catch {
    return DEFAULT_STORE_CONFIG;
  }
};

export const saveStoredConfig = (config: StoreConfig): void => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving config to localStorage', err);
  }
};

const CURRENT_USER_KEY = 'galera_geek_current_admin_user_v1';

export const getStoredAdminUser = (): { username: string; role: 'admin' | 'estoquista'; name: string } | null => {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getStoredAdminAuth = (): boolean => {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setStoredAdminAuth = (
  isAuthenticated: boolean,
  userInfo?: { username: string; role: 'admin' | 'estoquista'; name: string } | null
): void => {
  try {
    if (isAuthenticated) {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      if (userInfo) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
      }
    } else {
      localStorage.removeItem(ADMIN_AUTH_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Error saving admin auth state', err);
  }
};

export const exportCatalogJSON = (cards: CardItem[]): void => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cards, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `catalogo_galera_geek_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

const CART_STORAGE_KEY = 'galera_geek_cart_v1';

export const loadStoredCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem('galera_geek_cart');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item: any) => item && item.card && typeof item.quantity === 'number' && item.quantity > 0);
    }
    return [];
  } catch {
    return [];
  }
};

export const saveStoredCart = (cart: CartItem[]): void => {
  try {
    const serialized = JSON.stringify(cart);
    localStorage.setItem(CART_STORAGE_KEY, serialized);
    // Keep legacy key in sync so any older reads are also cleared or updated
    localStorage.setItem('galera_geek_cart', serialized);
  } catch (err) {
    console.error('Error saving cart to localStorage', err);
  }
};
