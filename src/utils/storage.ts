import { CardItem, StoreConfig } from '../types';
import { INITIAL_CARDS, DEFAULT_STORE_CONFIG } from '../data/initialCards';

const CARDS_STORAGE_KEY = 'galera_geek_cards_v2';
const CONFIG_STORAGE_KEY = 'galera_geek_config_v2';

export const loadStoredCards = (): CardItem[] => {
  try {
    const raw = localStorage.getItem(CARDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(INITIAL_CARDS));
      return INITIAL_CARDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Map initial cards for quick lookup of verified official image assets
      const initialMap = new Map<string, CardItem>();
      INITIAL_CARDS.forEach(c => initialMap.set(c.id, c));

      // Sanitize cards and auto-upgrade broken/stale image URLs
      const updated = parsed.map((c: any) => {
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
           c.id.startsWith('op-'))
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

        let setName = c.setName;
        let setCode = c.setCode;
        let cardNumber = c.cardNumber;
        let description = c.description;
        let cardType = c.cardType;
        let colorOrAttribute = c.colorOrAttribute;
        let language = c.language;
        let finishType = c.finishType;
        let rarity = c.rarity;

        if (initial && c.id.startsWith('rift-')) {
          name = initial.name;
          setName = initial.setName;
          setCode = initial.setCode;
          cardNumber = initial.cardNumber;
          description = initial.description;
          cardType = initial.cardType;
          colorOrAttribute = initial.colorOrAttribute;
          language = initial.language;
          finishType = initial.finishType;
          rarity = initial.rarity;
          imageUrl = initial.imageUrl;
        }

        return {
          ...c,
          name,
          setName,
          setCode,
          cardNumber,
          description,
          cardType,
          colorOrAttribute,
          language,
          finishType,
          rarity,
          imageUrl,
          price: typeof c.price === 'number' ? c.price : (initial ? initial.price : 25),
          stockQuantity: typeof c.stockQuantity === 'number' ? c.stockQuantity : 1,
        };
      });

      // Append any newly added initial cards (e.g. rift-zed, rift-garen) if not present yet
      const existingIds = new Set(updated.map((c: any) => c.id));
      INITIAL_CARDS.forEach((initCard) => {
        if (!existingIds.has(initCard.id)) {
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
