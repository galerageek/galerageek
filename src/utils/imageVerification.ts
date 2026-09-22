import { CardItem, TCGGame } from '../types';

export interface ImageVerificationResult {
  ok: boolean;
  status: 'valid' | 'fallback_active' | 'checking';
  url: string;
  statusCode?: number;
  error?: string;
  suggestedProxy?: string;
  isOnePieceOrRiftbound: boolean;
  testedAt?: number;
}

// In-memory cache of tested URLs to avoid duplicate network requests
const verificationCache = new Map<string, ImageVerificationResult>();

/**
 * Checks if a card belongs to games known for external hotlinking or CORS restrictions (e.g. One Piece, Riftbound)
 */
export function isSpecialRestrictedGame(game?: TCGGame): boolean {
  return game === 'onepiece' || game === 'riftbound';
}

/**
 * Cleans or optimizes an image URL:
 * - If Bandai One Piece official domain is used directly, converts to server proxy or wsrv.nl
 * - Strips whitespace
 */
export function getOptimizedImageUrl(rawUrl?: string, game?: TCGGame): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Bandai One Piece hotlinking protection fix
  if (
    (trimmed.includes('en.onepiece-cardgame.com') || trimmed.includes('onepiece-cardgame.com')) &&
    !trimmed.includes('/api/card-image-proxy') &&
    !trimmed.includes('wsrv.nl')
  ) {
    return `https://wsrv.nl/?url=${encodeURIComponent(trimmed)}&output=webp`;
  }

  // Riot Games / Sanity Riftbound proxy optimization if needed
  if (
    (trimmed.includes('cmsassets.rgpub.io') || trimmed.includes('rgpub.io')) &&
    !trimmed.includes('/api/card-image-proxy') &&
    !trimmed.includes('wsrv.nl')
  ) {
    return `https://wsrv.nl/?url=${encodeURIComponent(trimmed)}&output=webp`;
  }

  return trimmed;
}

/**
 * Tests an image URL in the browser using HTMLImageElement with a timeout,
 * and if browser test fails, calls the backend verification proxy endpoint.
 */
export async function verifyImageUrl(url?: string, game?: TCGGame): Promise<ImageVerificationResult> {
  const isOnePieceOrRiftbound = isSpecialRestrictedGame(game);

  if (!url || !url.trim()) {
    return {
      ok: false,
      status: 'fallback_active',
      url: '',
      error: 'URL não preenchida (usará Fallback Visual)',
      isOnePieceOrRiftbound,
      testedAt: Date.now()
    };
  }

  const cleanUrl = url.trim();

  // Return cached result if checked within the last 2 minutes
  const cached = verificationCache.get(cleanUrl);
  if (cached && Date.now() - (cached.testedAt || 0) < 120000) {
    return cached;
  }

  // 1. Try in-browser fast image probe
  const browserTest = await new Promise<boolean>((resolve) => {
    const img = new Image();
    let isSettled = false;

    const timeout = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        resolve(false);
      }
    }, 3500);

    img.onload = () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timeout);
        // Ensure image has real dimensions
        resolve(img.naturalWidth > 1 && img.naturalHeight > 1);
      }
    };

    img.onerror = () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timeout);
        resolve(false);
      }
    };

    img.src = cleanUrl;
  });

  if (browserTest) {
    const result: ImageVerificationResult = {
      ok: true,
      status: 'valid',
      url: cleanUrl,
      isOnePieceOrRiftbound,
      testedAt: Date.now()
    };
    verificationCache.set(cleanUrl, result);
    return result;
  }

  // 2. If browser failed, test via backend endpoint
  try {
    const res = await fetch(`/api/verify-image-url?url=${encodeURIComponent(cleanUrl)}`);
    if (res.ok) {
      const data = await res.json();
      const result: ImageVerificationResult = {
        ok: data.ok,
        status: data.ok ? 'valid' : 'fallback_active',
        url: cleanUrl,
        statusCode: data.status,
        error: data.error || (data.ok ? undefined : 'Imagem inacessível ou cabeçalhos CORS bloqueados'),
        suggestedProxy: data.suggestedProxy,
        isOnePieceOrRiftbound,
        testedAt: Date.now()
      };
      verificationCache.set(cleanUrl, result);
      return result;
    }
  } catch (err) {
    // Backend probe failed
  }

  // 3. Mark as using visual fallback
  const fallbackResult: ImageVerificationResult = {
    ok: false,
    status: 'fallback_active',
    url: cleanUrl,
    error: 'Falha no carregamento. O Fallback Visual temático será renderizado.',
    suggestedProxy: `/api/card-image-proxy?url=${encodeURIComponent(cleanUrl)}`,
    isOnePieceOrRiftbound,
    testedAt: Date.now()
  };
  verificationCache.set(cleanUrl, fallbackResult);
  return fallbackResult;
}

/**
 * Runs batch verification on a list of cards with concurrency control
 */
export async function batchVerifyCards(
  cards: CardItem[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, ImageVerificationResult>> {
  const results = new Map<string, ImageVerificationResult>();
  const total = cards.length;
  let completed = 0;

  // Process in small batches of 5 concurrent checks
  const batchSize = 5;
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (card) => {
        const res = await verifyImageUrl(card.imageUrl, card.game);
        results.set(card.id, res);
        completed++;
        if (onProgress) onProgress(completed, total);
      })
    );
  }

  return results;
}
