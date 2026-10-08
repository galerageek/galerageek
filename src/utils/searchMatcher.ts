import { CardItem } from '../types';

/**
 * Normalizes text by removing accents/diacritics, lowercasing, and trimming.
 */
export const normalizeText = (text: string = ''): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/**
 * TCG Semantic groups: enables cross-language and synonym matching.
 * E.g., searching "draw" matches cards with "compre", "compra", "comprar", "draw", "draws".
 * Searching "compre" matches cards with "draw", "compra", "comprar", "compre".
 */
const TCG_SYNONYM_GROUPS: string[][] = [
  // Card Draw / Compra de cartas
  ['compre', 'compra', 'compras', 'comprar', 'comprando', 'comprara', 'comprará', 'draw', 'draws', 'drawing'],
  // Search / Tutor / Buscar / Procurar
  ['busca', 'buscar', 'busque', 'buscando', 'procura', 'procurar', 'procure', 'search', 'searching', 'tutor'],
  // Destroy / Destruir
  ['destruir', 'destrua', 'destroi', 'destrói', 'destroy', 'destruction'],
  // Counterspell / Anular
  ['anular', 'anule', 'anulacao', 'anulação', 'counter', 'counterspell'],
  // Flying / Voar
  ['voar', 'voo', 'flying', 'fly'],
  // Haste / Ímpeto / Rush
  ['impeto', 'ímpeto', 'haste', 'rush', 'rapido', 'rápido'],
  // Trample / Atropelar
  ['atropelar', 'atropela', 'trample'],
  // Lifelink / Vínculo com a vida / Ganho de vida
  ['vinculo com a vida', 'vínculo com a vida', 'lifelink', 'ganha vida', 'gain life'],
  // Deathtouch / Toque mortífero
  ['toque mortifero', 'toque mortífero', 'deathtouch'],
  // Indestructible / Indestrutível
  ['indestrutivel', 'indestrutível', 'indestructible'],
  // Protection / Proteção
  ['protecao', 'proteção', 'protection', 'protect'],
  // Exile / Exilar
  ['exilar', 'exila', 'exile'],
  // Discard / Descartar
  ['descartar', 'descarte', 'discard'],
  // Ramp / Rampa / Mana / Aceleração
  ['rampa', 'ramp', 'mana', 'aceleracao', 'aceleração'],
  // Counters / Marcadores
  ['marcador', 'marcadores', 'counter', 'counters'],
  // Tokens / Fichas
  ['ficha', 'fichas', 'token', 'tokens'],
  // Graveyard / Cemitério
  ['cemiterio', 'cemitério', 'graveyard', 'descarte'],
];

/**
 * Returns all synonym terms (normalized) for a given word term.
 */
export const getTermSynonyms = (rawTerm: string): string[] => {
  const term = normalizeText(rawTerm);
  if (!term) return [];

  const resultSet = new Set<string>([term]);

  for (const group of TCG_SYNONYM_GROUPS) {
    const normalizedGroup = group.map((w) => normalizeText(w));
    if (normalizedGroup.some((w) => w === term || term.startsWith(w) || w.startsWith(term))) {
      normalizedGroup.forEach((w) => resultSet.add(w));
    }
  }

  return Array.from(resultSet);
};

/**
 * Checks if a specific target text (normalized) matches a single search term (or any of its synonyms).
 */
const textMatchesTerm = (targetText: string, term: string): boolean => {
  if (!term) return true;
  if (!targetText) return false;

  const synonyms = getTermSynonyms(term);
  for (const syn of synonyms) {
    if (targetText.includes(syn)) {
      return true;
    }
  }

  // Also match Portuguese/English prefix stem if term length >= 4 (e.g. "compr" matches "comprador", "compra", "compre")
  if (term.length >= 4) {
    const stem = term.slice(0, 4);
    if (targetText.includes(stem)) {
      return true;
    }
  }

  return false;
};

/**
 * Builds the searchable full-text string for a CardItem.
 */
export const getCardSearchableText = (card: CardItem): string => {
  const parts = [
    card.name,
    card.setName,
    card.setCode,
    card.cardNumber,
    card.cardType || '',
    card.colorOrAttribute || '',
    card.rarity,
    card.condition,
    card.language,
    card.finishType || '',
    card.description || '',
  ];
  return normalizeText(parts.join(' '));
};

/**
 * Checks if a card matches a query string.
 * Supports multi-word matching where all words must match the card.
 */
export const cardMatchesQuery = (card: CardItem, rawQuery: string): boolean => {
  const query = normalizeText(rawQuery);
  if (!query) return true;

  const cardText = getCardSearchableText(card);

  // If exact substring matches anywhere
  if (cardText.includes(query)) return true;

  // Split query into terms (e.g., "one ring draw" or "compre")
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  // Every term must find a match (exact or semantic synonym) in the card text
  return terms.every((term) => textMatchesTerm(cardText, term));
};

/**
 * Dedicated matcher for card text / rules / effect / abilities.
 */
export const cardMatchesTextFilter = (card: CardItem, rawQuery: string): boolean => {
  const query = normalizeText(rawQuery);
  if (!query) return true;

  const descText = normalizeText(
    `${card.description || ''} ${card.cardType || ''} ${card.colorOrAttribute || ''}`
  );

  if (descText.includes(query)) return true;

  const terms = query.split(/\s+/).filter(Boolean);
  return terms.every((term) => textMatchesTerm(descText, term));
};
