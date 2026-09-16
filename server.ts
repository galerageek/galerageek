import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

// Increase payload limit for camera photo uploads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Execute Gemini multimodal generation with fallback models and retry for 503 high demand
 */
async function generateCardWithFallback(
  ai: GoogleGenAI,
  cleanBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  // Use gemini-3.1-flash-lite first for high throughput & fast response without 503 spikes,
  // followed by gemini-3.8-flash if needed.
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff wait before retrying on high-demand spike
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }

        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: cleanBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const isTransient =
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('FetchError') ||
          msg.includes('ECONNRESET');

        console.log(`[Gemini] Model ${model} (attempt ${attempt + 1}) unavailable: ${isTransient ? 'temporarily busy' : 'request issue'}`);

        if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
          // Model is under high load - immediately switch to next model without wasting attempts
          break;
        }

        if (!isTransient) {
          break;
        }
      }
    }
  }

  throw lastError;
}

/**
 * Calculate realistic lowest & average price for cards based on market APIs,
 * AI Vision estimation, and game/rarity baselines.
 * Never sets arbitrary 15.00 for common bulk cards (R$ 0.05 - 0.25).
 */
async function fetchLigaLowestPrice(
  cardName: string,
  game: string,
  rarity: string = 'Comum',
  aiEstimate?: { menor?: number; medio?: number },
  englishName?: string,
  setCode?: string,
  cardNumber?: string
): Promise<{ menorPreco: number; precoMedio: number; ligaUrl: string }> {
  const isPokemon = game === 'pokemon';
  const isOnePiece = game === 'onepiece';
  const isLorcana = game === 'lorcana';

  let baseUrl = 'https://www.ligamagic.com.br';
  if (isPokemon) baseUrl = 'https://www.ligapokemon.com.br';
  else if (isOnePiece) baseUrl = 'https://www.ligaonepiece.com.br';
  else if (isLorcana) baseUrl = 'https://www.ligalorcana.com.br';

  const queryName = englishName || cardName;
  const ligaUrl = `${baseUrl}/?view=cards/card&card=${encodeURIComponent(queryName)}`;

  // 1. If game is Magic, try multiple Scryfall queries to get exact market prices
  if (game === 'magic' || !game) {
    try {
      const scryHeaders = {
        'User-Agent': 'GaleraGeekTCG/1.0 (https://galerageek.com.br)',
        'Accept': 'application/json',
      };
      let cardObj: any = null;

      // Attempt A: Exact set code + collector number if available
      if (setCode && cardNumber) {
        try {
          const res = await fetch(`https://api.scryfall.com/cards/${encodeURIComponent(setCode.toLowerCase())}/${encodeURIComponent(cardNumber)}`, { headers: scryHeaders });
          if (res.ok) {
            cardObj = await res.json();
          }
        } catch {
          // continue
        }
      }

      // Attempt B: Named exact/fuzzy with english name or card name
      if (!cardObj) {
        try {
          let res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(queryName)}`, { headers: scryHeaders });
          if (!res.ok) {
            res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(queryName)}`, { headers: scryHeaders });
          }
          if (res.ok) {
            cardObj = await res.json();
          }
        } catch {
          // continue
        }
      }

      // Attempt C: Search by Portuguese name if card has accents or different translation
      if (!cardObj && cardName) {
        try {
          const res = await fetch(`https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cardName)}%22+include%3Aextras`, { headers: scryHeaders });
          if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.length > 0) {
              cardObj = data.data[0];
            }
          }
        } catch {
          // continue
        }
      }

      if (cardObj) {
        const usdPrice = parseFloat(cardObj.prices?.usd || cardObj.prices?.usd_foil || '0');
        const eurPrice = parseFloat(cardObj.prices?.eur || cardObj.prices?.eur_foil || '0');
        const cardRarity = (cardObj.rarity || rarity || 'common').toLowerCase();

        // Calculate realistic Brazilian TCG price
        if (usdPrice > 0 || eurPrice > 0) {
          const isUncommon = cardRarity.includes('uncommon') || cardRarity.includes('incomum');
          const isCommon = !isUncommon && (cardRarity.includes('common') || cardRarity.includes('comum'));
          const isRare = cardRarity.includes('rare') || cardRarity.includes('rara');

          let rawConverted = 0.25;

          if (usdPrice > 0) {
            rawConverted = Math.round(usdPrice * 5.85 * 100) / 100;
          } else if (eurPrice > 0) {
            rawConverted = Math.round(eurPrice * 6.20 * 100) / 100;
          }

          let calculatedMenor = rawConverted;

          // Magic specific minimum price floors requested by user:
          // Comum: min R$ 0,25 | Incomum: min R$ 0,50 | Rara: min R$ 1,00
          if (game === 'magic' || !game) {
            if (isCommon) {
              calculatedMenor = Math.max(0.25, calculatedMenor);
            } else if (isUncommon) {
              calculatedMenor = Math.max(0.50, calculatedMenor);
            } else if (isRare) {
              calculatedMenor = Math.max(1.00, calculatedMenor);
            } else {
              // Mythic / Special
              calculatedMenor = Math.max(3.00, calculatedMenor);
            }
          } else {
            calculatedMenor = Math.max(0.05, calculatedMenor);
          }

          const calculatedMedio = Math.round(Math.max(calculatedMenor * 1.3, calculatedMenor + 0.25) * 100) / 100;

          return {
            menorPreco: calculatedMenor,
            precoMedio: calculatedMedio,
            ligaUrl
          };
        }
      }
    } catch (err) {
      console.warn('Scryfall price evaluation error:', err);
    }
  }

  const isMagic = game === 'magic' || !game;
  const normRarity = (rarity || '').toLowerCase();
  const isUncommon = normRarity.includes('incomum') || normRarity.includes('uncommon');
  const isCommon = !isUncommon && (normRarity.includes('comum') || normRarity.includes('common'));
  const isRare = normRarity.includes('rara') || normRarity.includes('rare');

  // 2. If AI vision provided a realistic estimate during visual inspection, use it respecting minimum floors
  if (aiEstimate?.menor && aiEstimate.menor > 0) {
    let menor = aiEstimate.menor;
    if (isMagic) {
      if (isCommon) menor = Math.max(0.25, menor);
      else if (isUncommon) menor = Math.max(0.50, menor);
      else if (isRare) menor = Math.max(1.00, menor);
    } else {
      menor = Math.max(0.05, menor);
    }

    const medio = aiEstimate.medio && aiEstimate.medio > menor ? aiEstimate.medio : Math.round(menor * 1.35 * 100) / 100;
    return {
      menorPreco: menor,
      precoMedio: medio,
      ligaUrl
    };
  }

  // 3. Fallback based strictly on true RARITY with Magic minimum rules (Comum: 0.25, Incomum: 0.50, Rara: 1.00)
  let defaultMenor = isMagic ? 0.25 : 0.05;
  let defaultMedio = isMagic ? 0.50 : 0.25;

  if (isUncommon) {
    defaultMenor = isMagic ? 0.50 : 0.25;
    defaultMedio = isMagic ? 1.20 : 0.90;
  } else if (isCommon) {
    defaultMenor = isMagic ? 0.25 : 0.05;
    defaultMedio = isMagic ? 0.60 : 0.20;
  } else if (isRare) {
    defaultMenor = isMagic ? 1.00 : 1.50;
    defaultMedio = isMagic ? 2.50 : 3.50;
  } else if (normRarity.includes('mítica') || normRarity.includes('mythic') || normRarity.includes('ultra') || normRarity.includes('secret')) {
    defaultMenor = 7.00;
    defaultMedio = 14.00;
  }

  return {
    menorPreco: defaultMenor,
    precoMedio: defaultMedio,
    ligaUrl
  };
}

// In-memory cache of Riot's official Legends of Runeterra Portuguese cards (with official card borders & stats)
let cachedLoRSet1: any[] | null = null;
async function getOfficialLoRCards(): Promise<any[]> {
  if (cachedLoRSet1 && cachedLoRSet1.length > 0) {
    return cachedLoRSet1;
  }
  try {
    const res = await fetch('https://dd.b.pvp.net/latest/set1/pt_br/data/set1-pt_br.json');
    if (res.ok) {
      cachedLoRSet1 = await res.json();
      return cachedLoRSet1 || [];
    }
  } catch (err) {
    console.warn('Failed to load LoR official card set:', err);
  }
  return [];
}

/**
 * Fetch card data & image automatically from public TCG APIs
 */
async function fetchCardDetails(
  cardName: string,
  game: string = 'magic',
  rarity: string = 'Comum',
  aiEstimate?: { menor?: number; medio?: number },
  englishName?: string,
  setCode?: string,
  cardNumber?: string
) {
  if (game === 'magic') {
    try {
      const scryHeaders = {
        'User-Agent': 'GaleraGeekTCG/1.0 (https://galerageek.com.br)',
        'Accept': 'application/json',
      };
      let cardObj: any = null;

      // 1. Try exact set/number in Portuguese first if setCode and cardNumber exist
      if (setCode && cardNumber) {
        try {
          const ptRes = await fetch(`https://api.scryfall.com/cards/${encodeURIComponent(setCode.toLowerCase())}/${encodeURIComponent(cardNumber)}/pt`, { headers: scryHeaders });
          if (ptRes.ok) {
            cardObj = await ptRes.json();
          }
        } catch {
          // ignore
        }

        if (!cardObj) {
          try {
            const res = await fetch(`https://api.scryfall.com/cards/${encodeURIComponent(setCode.toLowerCase())}/${encodeURIComponent(cardNumber)}`, { headers: scryHeaders });
            if (res.ok) {
              cardObj = await res.json();
            }
          } catch {
            // ignore
          }
        }
      }

      // 2. Try searching by Portuguese name directly with lang:any or lang:pt
      if (!cardObj) {
        const queryName = cardName.trim();
        let ptSearchRes = await fetch(`https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(queryName)}%22+lang%3Aany`, { headers: scryHeaders });
        if (ptSearchRes.ok) {
          const ptData = await ptSearchRes.json();
          if (ptData.data && ptData.data.length > 0) {
            cardObj = ptData.data[0];
          }
        }
      }

      // 3. Try named exact or fuzzy in English
      if (!cardObj) {
        const nameToSearch = englishName || cardName;
        let res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(nameToSearch)}`, { headers: scryHeaders });
        if (!res.ok) {
          res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nameToSearch)}`, { headers: scryHeaders });
        }
        if (!res.ok) {
          res = await fetch(`https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cardName)}%22+include%3Aextras`, { headers: scryHeaders });
        }
        if (res.ok) {
          const data = await res.json();
          cardObj = data.data ? data.data[0] : data;
        }
      }

      if (cardObj) {
        const imageUrl = cardObj.image_uris?.large || 
                         cardObj.image_uris?.normal || 
                         (cardObj.card_faces && (cardObj.card_faces[0]?.image_uris?.large || cardObj.card_faces[0]?.image_uris?.normal)) || '';
        
        const cardRarity = cardObj.rarity === 'mythic' ? 'Mítica' : 
                           cardObj.rarity === 'rare' ? 'Rara' : 
                           cardObj.rarity === 'uncommon' ? 'Incomum' : 'Comum';

        const liga = await fetchLigaLowestPrice(
          cardName, 
          'magic', 
          cardRarity, 
          aiEstimate, 
          cardObj.name, 
          cardObj.set, 
          cardObj.collector_number
        );

        return {
          name: cardObj.printed_name || cardObj.name,
          originalName: cardObj.name,
          setName: cardObj.set_name,
          setCode: cardObj.set?.toUpperCase(),
          cardNumber: cardObj.collector_number,
          rarity: cardRarity,
          imageUrl,
          game: 'magic',
          menorPrecoLiga: liga.menorPreco,
          precoMedioLiga: liga.precoMedio,
          ligaUrl: liga.ligaUrl,
        };
      }
    } catch (e) {
      console.error('Error in Scryfall search:', e);
    }
  } else if (game === 'pokemon') {
    try {
      // 1. Try Portuguese Copag Pokémon cards first via tcgdex
      const query = (cardName || englishName || '').trim();
      try {
        const ptRes = await fetch(`https://api.tcgdex.net/v2/pt/cards?name=${encodeURIComponent(query)}`);
        if (ptRes.ok) {
          const ptCards = await ptRes.json();
          if (Array.isArray(ptCards) && ptCards.length > 0) {
            const best = ptCards.find((c: any) => c.image) || ptCards[0];
            if (best && best.image) {
              const fullImg = `${best.image}/high.webp`;
              const liga = await fetchLigaLowestPrice(best.name || cardName, 'pokemon', rarity, aiEstimate);
              return {
                name: best.name || cardName,
                originalName: best.name || cardName,
                setName: 'Pokémon TCG (Brasil)',
                setCode: best.id?.split('-')[0]?.toUpperCase() || 'PKM',
                cardNumber: best.localId || '001',
                rarity: rarity || 'Comum',
                imageUrl: fullImg,
                game: 'pokemon',
                menorPrecoLiga: liga.menorPreco,
                precoMedioLiga: liga.precoMedio,
                ligaUrl: liga.ligaUrl,
              };
            }
          }
        }
      } catch (tcgErr) {
        console.warn('tcgdex lookup fallback:', tcgErr);
      }

      // 2. Fallback to PokemonTCG.io
      const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(englishName || cardName)}"&pageSize=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const p = data.data[0];
          const liga = await fetchLigaLowestPrice(p.name, 'pokemon', p.rarity || rarity, aiEstimate);
          return {
            name: p.name,
            originalName: p.name,
            setName: p.set?.name || 'Pokémon TCG',
            setCode: p.set?.id?.toUpperCase() || 'PKM',
            cardNumber: p.number || '001',
            rarity: p.rarity || rarity || 'Comum',
            imageUrl: p.images?.large || p.images?.small || '',
            game: 'pokemon',
            menorPrecoLiga: liga.menorPreco,
            precoMedioLiga: liga.precoMedio,
            ligaUrl: liga.ligaUrl,
          };
        }
      }
    } catch (e) {
      console.error('Error in Pokemon search:', e);
    }
  } else if (game === 'onepiece') {
    try {
      // Clean code (e.g. OP05-119 or OP-05 119)
      const rawText = `${setCode || ''} ${cardNumber || ''} ${cardName}`.toUpperCase();
      const codeMatch = rawText.match(/(OP-?[0-9]{2}|ST-?[0-9]{2}|EB-?[0-9]{2})[- ]?([0-9]{3})/);
      let officialUrl = '';
      let codeFormatted = '';

      if (codeMatch) {
        const setClean = codeMatch[1].replace('-', '');
        const numClean = codeMatch[2];
        codeFormatted = `${setClean}-${numClean}`;
        officialUrl = `https://en.onepiece-cardgame.com/images/cardlist/card/${codeFormatted}.png`;
      } else {
        // Fallbacks for known cards
        if (cardName.toLowerCase().includes('luffy')) {
          officialUrl = 'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119_p1.png';
          codeFormatted = 'OP05-119';
        } else if (cardName.toLowerCase().includes('zoro')) {
          officialUrl = 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-025.png';
          codeFormatted = 'OP01-025';
        }
      }

      const proxiedUrl = officialUrl ? `/api/card-image-proxy?url=${encodeURIComponent(officialUrl)}` : '';
      const liga = await fetchLigaLowestPrice(cardName, 'onepiece', rarity, aiEstimate, englishName, setCode, cardNumber);
      return {
        name: cardName,
        originalName: englishName || cardName,
        setName: setCode || 'One Piece Card Game',
        setCode: codeFormatted.split('-')[0] || setCode || 'OP',
        cardNumber: codeFormatted.split('-')[1] || cardNumber || '001',
        rarity: rarity || 'Super Rare',
        imageUrl: proxiedUrl,
        game: 'onepiece',
        menorPrecoLiga: liga.menorPreco,
        precoMedioLiga: liga.precoMedio,
        ligaUrl: liga.ligaUrl,
      };
    } catch (opErr) {
      console.error('Error in One Piece lookup:', opErr);
    }
  } else if (game === 'riftbound') {
    try {
      const qLower = (cardName || '').toLowerCase();
      const lorCards = await getOfficialLoRCards();
      let matched = lorCards.find((c: any) => c.name?.toLowerCase() === qLower || c.cardCode?.toLowerCase() === qLower);
      if (!matched) {
        matched = lorCards.find((c: any) => c.name?.toLowerCase().includes(qLower));
      }

      const lorImg = matched 
        ? `https://dd.b.pvp.net/latest/set1/pt_br/img/cards/${matched.cardCode}.png`
        : 'https://dd.b.pvp.net/latest/set1/pt_br/img/cards/01IO015.png';
      const foundName = matched ? matched.name : cardName;
      const cardNum = matched ? matched.cardCode : (cardNumber || '018/180');
      const foundRarity = matched?.rarityRef || rarity || (matched?.supertype === 'Campeão' ? 'Mítica' : 'Rara');

      const liga = await fetchLigaLowestPrice(foundName, 'riftbound', foundRarity, aiEstimate);
      return {
        name: foundName,
        originalName: englishName || foundName,
        setName: 'Origens de Runeterra: Edição Alfa',
        setCode: setCode || 'RFT-01',
        cardNumber: cardNum,
        rarity: foundRarity,
        imageUrl: lorImg,
        game: 'riftbound',
        menorPrecoLiga: liga.menorPreco,
        precoMedioLiga: liga.precoMedio,
        ligaUrl: liga.ligaUrl,
      };
    } catch (riftErr) {
      console.error('Error in Riftbound lookup:', riftErr);
    }
  } else if (game === 'lorcana') {
    try {
      const res = await fetch(`https://api.lorcast.com/v0/cards/search?q=${encodeURIComponent(cardName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const l = data.results[0];
          const img = l.image_uris?.digital?.large || l.image_uris?.digital?.normal || '';
          const liga = await fetchLigaLowestPrice(l.name, 'lorcana', l.rarity || rarity, aiEstimate);
          return {
            name: `${l.name}${l.version ? ' - ' + l.version : ''}`,
            originalName: l.name,
            setName: l.set?.name || 'Disney Lorcana',
            setCode: l.set?.code ? `SET-${l.set.code}` : 'TFC',
            cardNumber: l.collector_number || '001',
            rarity: l.rarity || rarity || 'Rare',
            imageUrl: img,
            game: 'lorcana',
            menorPrecoLiga: liga.menorPreco,
            precoMedioLiga: liga.precoMedio,
            ligaUrl: liga.ligaUrl,
          };
        }
      }
    } catch (lorcErr) {
      console.error('Error in Lorcana lookup:', lorcErr);
    }
  }

  // Fallback if not found via specific API:
  const liga = await fetchLigaLowestPrice(cardName, game, rarity, aiEstimate, englishName, setCode, cardNumber);
  return {
    name: cardName,
    originalName: englishName || cardName,
    setName: 'Coleção Oficial',
    setCode: setCode || 'SET',
    cardNumber: cardNumber || '001',
    rarity: rarity || 'Comum',
    imageUrl: '',
    game,
    menorPrecoLiga: liga.menorPreco,
    precoMedioLiga: liga.precoMedio,
    ligaUrl: liga.ligaUrl,
  };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

/**
 * 1. Identify card from photo (Phone camera or uploaded image) using Gemini Vision
 */
app.post('/api/identify-card', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi fornecida.' });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

    const ai = getGeminiClient();
    const prompt = `Analise a foto deste card colecionável de TCG (Trading Card Game).
Identifique com máxima precisão:
1. "name": O nome oficial do card em inglês (ex: "Negate", "Lightning Bolt", "Pikachu", "Charizard", "Luffy", etc).
2. "printedName": O nome exatamente como impresso no card (em português se o card for em português, ou em inglês).
3. "game": O jogo do card, obrigatoriamente um destes: "magic", "pokemon", "lorcana", "riftbound", "onepiece".
4. "setName": O nome da coleção/expansão (ex: "March of the Machine", "Paldean Fates", "OP-01", etc).
5. "setCode": O código oficial da coleção (ex: "MOM", "MH3", "PAF", "OP01", etc).
6. "cardNumber": O número do card de colecionador (ex: "68", "045/192", "123").
7. "rarity": A raridade ("Comum", "Incomum", "Rara", "Mítica", "Secret Rare", "Ultra Rare").
8. "isFoil": Booleano (true se for brilhante/foil, false se normal).
9. "language": Idioma do card ("PT", "EN", "JP").
10. "condition": Condição aparente ("NM", "SP", "MP", "HP").
11. "estimatedLowestPrice": Menor preço REAL de mercado brasileiro (LigaMagic / LigaPokemon / LigaOnePiece / LigaLorcana) para este card em Reais (BRL).
    REGRAS DE PREÇO MÍNIMO PARA MAGIC:
    - Magic Comum: preço mínimo de R$ 0,25 (bulk/chaff comum deve ser 0.25).
    - Magic Incomum: preço mínimo de R$ 0,50 (incomum simples deve ser 0.50).
    - Magic Rara: preço mínimo de R$ 1,00 (rara simples deve ser 1.00).
    - Magic Mítica / Staples: mantenha seus valores reais de mercado (ex: 5.00, 15.00, 40.00+).
    - Para outros jogos (Pokémon, One Piece, etc), comuns partem de R$ 0,05 a R$ 0,25.
12. "estimatedAvgPrice": Preço médio do card no mercado brasileiro em Reais.

Responda ESTRITAMENTE em formato JSON sem marcação markdown adicional, seguindo o esquema:
{
  "name": "Nome em inglês",
  "printedName": "Nome impresso",
  "game": "magic",
  "setName": "Nome da Coleção",
  "setCode": "COD",
  "cardNumber": "001",
  "rarity": "Comum",
  "isFoil": false,
  "language": "PT",
  "condition": "NM",
  "estimatedLowestPrice": 0.25,
  "estimatedAvgPrice": 0.50
}`;

    const textOutput = await generateCardWithFallback(ai, cleanBase64, mimeType, prompt);

    let parsedData: any = null;

    try {
      const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', textOutput);
    }

    if (!parsedData || (!parsedData.name && !parsedData.printedName)) {
      return res.status(422).json({
        success: false,
        error: 'Não foi possível ler o nome do card com nitidez. Posicione a câmera mais perto e centralizada, ou digite o nome do card no campo de busca.',
        raw: textOutput
      });
    }

    const aiEstimate = {
      menor: typeof parsedData.estimatedLowestPrice === 'number' ? parsedData.estimatedLowestPrice : undefined,
      medio: typeof parsedData.estimatedAvgPrice === 'number' ? parsedData.estimatedAvgPrice : undefined,
    };

    // Auto-fetch high-quality official image and realistic Liga prices for the identified card
    const cardDetails = await fetchCardDetails(
      parsedData.printedName || parsedData.name,
      parsedData.game || 'magic',
      parsedData.rarity || 'Comum',
      aiEstimate,
      parsedData.name,
      parsedData.setCode,
      parsedData.cardNumber
    );

    const finalPrice = cardDetails.menorPrecoLiga !== undefined && cardDetails.menorPrecoLiga !== null
      ? cardDetails.menorPrecoLiga
      : (aiEstimate.menor ?? 0.05);

    const finalAvg = cardDetails.precoMedioLiga !== undefined && cardDetails.precoMedioLiga !== null
      ? cardDetails.precoMedioLiga
      : (aiEstimate.medio ?? Math.round(finalPrice * 1.35 * 100) / 100);

    res.json({
      success: true,
      card: {
        name: parsedData.printedName || parsedData.name || cardDetails.name,
        originalName: parsedData.name || cardDetails.originalName,
        game: parsedData.game || cardDetails.game || 'magic',
        setName: parsedData.setName || cardDetails.setName,
        setCode: parsedData.setCode || cardDetails.setCode,
        cardNumber: parsedData.cardNumber || cardDetails.cardNumber,
        rarity: parsedData.rarity || cardDetails.rarity || 'Comum',
        isFoil: Boolean(parsedData.isFoil),
        language: parsedData.language || 'PT',
        condition: parsedData.condition || 'NM',
        imageUrl: cardDetails.imageUrl || '',
        price: finalPrice,
        menorPrecoLiga: finalPrice,
        precoMedioLiga: finalAvg,
        ligaUrl: cardDetails.ligaUrl,
      }
    });

  } catch (error: any) {
    const msg = error?.message || String(error);
    console.warn('[Gemini] Card identification notice:', msg);
    let friendlyMessage = 'Erro no processamento da imagem do card.';

    if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
      friendlyMessage = 'O serviço de visão por IA do Google está em alta demanda temporária neste momento. Por favor, aguarde alguns segundos e tente escanear novamente, ou use a "Busca por Nome" para adicionar o card.';
    } else if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      friendlyMessage = 'Limite temporário de requisições de IA atingido. Aguarde alguns segundos e tente novamente.';
    } else if (msg.includes('API key') || !process.env.GEMINI_API_KEY) {
      friendlyMessage = 'Chave da API Gemini não configurada ou inválida.';
    } else {
      friendlyMessage = 'Não foi possível processar a imagem no momento. Tente novamente ou busque pelo nome.';
    }

    res.status(503).json({ 
      success: false,
      error: friendlyMessage 
    });
  }
});

/**
 * Image proxy for TCG card images (such as Bandai One Piece cards that restrict cross-origin access via CORP headers)
 * Resolves images securely, adds CORS and cache headers, and streams to browser cleanly.
 */
app.get('/api/card-image-proxy', async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl || !rawUrl.startsWith('http')) {
      return res.status(400).send('URL do card inválida');
    }

    const reqHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    };

    if (rawUrl.includes('onepiece-cardgame.com')) {
      reqHeaders['Referer'] = 'https://en.onepiece-cardgame.com/';
    } else if (rawUrl.includes('scryfall.io') || rawUrl.includes('scryfall.com')) {
      reqHeaders['Referer'] = 'https://scryfall.com/';
    } else if (rawUrl.includes('pvp.net') || rawUrl.includes('leagueoflegends.com')) {
      reqHeaders['Referer'] = 'https://playruneterra.com/';
    }

    const upstream = await fetch(rawUrl, {
      headers: reqHeaders
    });

    if (!upstream.ok) {
      // Fallback: redirect to public CDN proxy if direct fetch failed
      return res.redirect(`https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&output=webp`);
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const buffer = await upstream.arrayBuffer();
    return res.end(Buffer.from(buffer));
  } catch (err: any) {
    console.error('Error in card-image-proxy:', err);
    if (req.query.url) {
      return res.redirect(`https://wsrv.nl/?url=${encodeURIComponent(req.query.url as string)}&output=webp`);
    }
    return res.status(500).send('Erro ao carregar imagem');
  }
});

/**
 * 2. Search card details & auto-fetch official image and Liga price by name
 */
app.get('/api/search-card-data', async (req, res) => {
  try {
    const q = req.query.q as string;
    const game = (req.query.game as string) || 'magic';
    const rarity = (req.query.rarity as string) || 'Comum';

    if (!q) {
      return res.status(400).json({ error: 'Parâmetro de busca "q" é obrigatório.' });
    }

    const details = await fetchCardDetails(q, game, rarity);
    res.json({
      success: true,
      data: details
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erro ao buscar dados do card' });
  }
});

/**
 * 3. Search multiple editions, printings, and alternate arts for a card
 */
app.get('/api/search-card-prints', async (req, res) => {
  try {
    const q = req.query.q as string;
    const game = (req.query.game as string) || 'magic';

    if (!q) {
      return res.status(400).json({ error: 'Parâmetro de busca "q" é obrigatório.' });
    }

    const cleanQuery = q.trim();
    const prints: Array<{
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
    }> = [];

    if (game === 'magic') {
      const scryHeaders = {
        'User-Agent': 'GaleraGeekTCG/1.0 (https://galerageek.com.br)',
        'Accept': 'application/json',
      };

      // 1. Try to find the card oracle ID or prints list
      let oracleId = '';
      let englishName = '';

      // Check if user queried in Portuguese
      try {
        const namedRes = await fetch(`https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cleanQuery)}%22+lang%3Aany`, { headers: scryHeaders });
        if (namedRes.ok) {
          const namedData = await namedRes.json();
          if (namedData.data && namedData.data.length > 0) {
            oracleId = namedData.data[0].oracle_id;
            englishName = namedData.data[0].name;
            // Also include this direct result
            const item = namedData.data[0];
            const img = item.image_uris?.large || item.image_uris?.normal || (item.card_faces && item.card_faces[0]?.image_uris?.large);
            if (img) {
              prints.push({
                id: `scry-${item.id}`,
                name: item.name,
                printedName: item.printed_name || item.name,
                setName: item.set_name,
                setCode: item.set?.toUpperCase(),
                cardNumber: item.collector_number,
                rarity: item.rarity,
                imageUrl: img,
                language: item.lang === 'pt' ? 'PT-BR' : item.lang?.toUpperCase(),
                finishes: item.finishes?.join(', '),
                isPromo: item.promo || item.frame_effects?.includes('showcase'),
              });
            }
          }
        }
      } catch {
        // ignore
      }

      // Fetch prints by oracleId or card name
      const searchUrl = oracleId 
        ? `https://api.scryfall.com/cards/search?q=oracleid%3A${oracleId}+include%3Aextras&unique=prints`
        : `https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(englishName || cleanQuery)}%22+include%3Aextras&unique=prints`;

      try {
        const printsRes = await fetch(searchUrl, { headers: scryHeaders });
        if (printsRes.ok) {
          const pData = await printsRes.json();
          if (pData.data && Array.isArray(pData.data)) {
            for (const item of pData.data.slice(0, 16)) {
              // Avoid duplicates
              if (prints.some(p => p.setCode === item.set?.toUpperCase() && p.cardNumber === item.collector_number)) {
                continue;
              }
              const img = item.image_uris?.large || item.image_uris?.normal || (item.card_faces && item.card_faces[0]?.image_uris?.large);
              if (img) {
                prints.push({
                  id: `scry-${item.id}`,
                  name: item.name,
                  printedName: item.printed_name || item.name,
                  setName: item.set_name,
                  setCode: item.set?.toUpperCase(),
                  cardNumber: item.collector_number,
                  rarity: item.rarity,
                  imageUrl: img,
                  language: item.lang?.toUpperCase() || 'EN',
                  finishes: item.finishes?.join(', '),
                  isPromo: item.promo || item.frame_effects?.includes('showcase') || item.border_color === 'borderless',
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }

      // Fuzzy search fallback if exact search returned nothing
      if (prints.length === 0) {
        try {
          const fuzzyRes = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(cleanQuery)}+include%3Aextras&unique=prints`, { headers: scryHeaders });
          if (fuzzyRes.ok) {
            const fData = await fuzzyRes.json();
            if (fData.data && Array.isArray(fData.data)) {
              for (const item of fData.data.slice(0, 16)) {
                const img = item.image_uris?.large || item.image_uris?.normal || (item.card_faces && item.card_faces[0]?.image_uris?.large);
                if (img && !prints.some(p => p.id === `scry-${item.id}`)) {
                  prints.push({
                    id: `scry-${item.id}`,
                    name: item.name,
                    printedName: item.printed_name || item.name,
                    setName: item.set_name,
                    setCode: item.set?.toUpperCase(),
                    cardNumber: item.collector_number,
                    rarity: item.rarity,
                    imageUrl: img,
                    language: item.lang === 'pt' ? 'PT-BR' : item.lang?.toUpperCase(),
                    finishes: item.finishes?.join(', '),
                    isPromo: item.promo || item.frame_effects?.includes('showcase') || item.border_color === 'borderless',
                  });
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }

    } else if (game === 'pokemon') {
      // 1. TCGdex Portuguese
      try {
        const tcgRes = await fetch(`https://api.tcgdex.net/v2/pt/cards?name=${encodeURIComponent(cleanQuery)}`);
        if (tcgRes.ok) {
          const tcgList = await tcgRes.json();
          if (Array.isArray(tcgList)) {
            for (const c of tcgList.slice(0, 12)) {
              if (c.image) {
                prints.push({
                  id: `tcgdex-${c.id}`,
                  name: c.name,
                  printedName: c.name,
                  setName: 'Pokémon Brasil (Copag)',
                  setCode: c.id?.split('-')[0]?.toUpperCase() || 'PKM',
                  cardNumber: c.localId || '001',
                  rarity: 'Rara',
                  imageUrl: `${c.image}/high.webp`,
                  language: 'PT-BR',
                  finishes: 'Holo / Foil',
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }

      // 2. PokemonTCG.io
      try {
        const pioRes = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(cleanQuery)}"&pageSize=12`);
        if (pioRes.ok) {
          const pioData = await pioRes.json();
          if (pioData.data && Array.isArray(pioData.data)) {
            for (const c of pioData.data) {
              const img = c.images?.large || c.images?.small;
              if (img && !prints.some(p => p.imageUrl === img)) {
                prints.push({
                  id: `pio-${c.id}`,
                  name: c.name,
                  printedName: c.name,
                  setName: c.set?.name || 'Pokémon TCG',
                  setCode: c.set?.id?.toUpperCase() || 'PKM',
                  cardNumber: c.number,
                  rarity: c.rarity || 'Ultra Rara',
                  imageUrl: img,
                  language: 'EN',
                  finishes: c.subtypes?.join(', '),
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }

    } else if (game === 'onepiece') {
      // One Piece official Bandai cards (with live official search and image proxy)
      const raw = cleanQuery.toUpperCase();
      const codeMatch = raw.match(/(OP-?[0-9]{2}|ST-?[0-9]{2}|EB-?[0-9]{2})[- ]?([0-9]{3})/);
      
      if (codeMatch) {
        const setClean = codeMatch[1].replace('-', '');
        const numClean = codeMatch[2];
        const baseCode = `${setClean}-${numClean}`;
        
        // Base art
        prints.push({
          id: `op-${baseCode}-base`,
          name: cleanQuery,
          setName: setClean,
          setCode: setClean,
          cardNumber: numClean,
          rarity: 'Super Rare',
          imageUrl: `/api/card-image-proxy?url=${encodeURIComponent(`https://en.onepiece-cardgame.com/images/cardlist/card/${baseCode}.png`)}`,
          language: 'EN / JP',
          finishes: 'Standard Art',
        });

        // Parallel arts p1, p2
        prints.push({
          id: `op-${baseCode}-p1`,
          name: `${cleanQuery} (Parallel / Manga)`,
          setName: setClean,
          setCode: setClean,
          cardNumber: numClean,
          rarity: 'Secret Rare',
          imageUrl: `/api/card-image-proxy?url=${encodeURIComponent(`https://en.onepiece-cardgame.com/images/cardlist/card/${baseCode}_p1.png`)}`,
          language: 'EN / JP',
          finishes: 'Parallel Art Foil',
          isPromo: true,
        });

        prints.push({
          id: `op-${baseCode}-p2`,
          name: `${cleanQuery} (Special Alternate)`,
          setName: setClean,
          setCode: setClean,
          cardNumber: numClean,
          rarity: 'Special Rare',
          imageUrl: `/api/card-image-proxy?url=${encodeURIComponent(`https://en.onepiece-cardgame.com/images/cardlist/card/${baseCode}_p2.png`)}`,
          language: 'EN / JP',
          finishes: 'Special Foil',
          isPromo: true,
        });
      }

      // Live search on Bandai official cardlist
      try {
        const bRes = await fetch('https://en.onepiece-cardgame.com/cardlist/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: `search=true&freewords=${encodeURIComponent(cleanQuery)}`
        });
        if (bRes.ok) {
          const html = await bRes.text();
          const matches = [...html.matchAll(/<img[^>]+src=\"([^\"]+card\/([^\"]+\.png)[^\"]*)\"[^>]*alt=\"([^\"]+)\"/g)];
          const seenImgs = new Set<string>();
          for (const m of matches) {
            const fileName = m[2]; // e.g. OP05-119_p1.png or EB02-017.png
            const cardAlt = m[3] || cleanQuery;
            const fullImg = `https://en.onepiece-cardgame.com/images/cardlist/card/${fileName}`;
            if (!seenImgs.has(fullImg) && !prints.some(p => p.imageUrl.includes(fileName))) {
              seenImgs.add(fullImg);
              const isParallel = fileName.includes('_p');
              const codePart = fileName.replace(/\.png.*$/, '').replace(/_p[0-9]+$/, '');
              const setCode = codePart.split('-')[0] || 'OP';
              const cardNum = codePart.split('-')[1] || '001';
              prints.push({
                id: `op-bandai-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}`,
                name: isParallel ? `${cardAlt} (Parallel Art)` : cardAlt,
                printedName: cardAlt,
                setName: `One Piece (${setCode})`,
                setCode,
                cardNumber: cardNum,
                rarity: isParallel ? 'Secret Rare / Alt' : 'Super Rare',
                imageUrl: `/api/card-image-proxy?url=${encodeURIComponent(fullImg)}`,
                language: 'EN',
                finishes: isParallel ? 'Parallel Foil' : 'Standard Art',
                isPromo: isParallel,
              });
              if (prints.length >= 16) break;
            }
          }
        }
      } catch (bErr) {
        console.warn('Bandai live search error:', bErr);
      }

      // Popular staples fallback if search was empty
      if (prints.length === 0) {
        if (cleanQuery.toLowerCase().includes('luffy')) {
          prints.push({
            id: 'op-luffy-sec',
            name: 'Monkey D. Luffy (Gear 5 Manga SEC)',
            setName: 'Awakening of the New Era',
            setCode: 'OP05',
            cardNumber: '119',
            rarity: 'Secret Rare',
            imageUrl: `/api/card-image-proxy?url=${encodeURIComponent('https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119_p1.png')}`,
            language: 'EN / JP',
            finishes: 'Manga Foil',
            isPromo: true
          });
          prints.push({
            id: 'op-luffy-std',
            name: 'Monkey D. Luffy (Gear 5 Normal)',
            setName: 'Awakening of the New Era',
            setCode: 'OP05',
            cardNumber: '119',
            rarity: 'Secret Rare',
            imageUrl: `/api/card-image-proxy?url=${encodeURIComponent('https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png')}`,
            language: 'EN',
            finishes: 'Normal Art'
          });
        }
        if (cleanQuery.toLowerCase().includes('zoro')) {
          prints.push({
            id: 'op-zoro-leader',
            name: 'Roronoa Zoro (Parallel Leader)',
            setName: 'Romance Dawn',
            setCode: 'OP01',
            cardNumber: '025',
            rarity: 'Leader',
            imageUrl: `/api/card-image-proxy?url=${encodeURIComponent('https://en.onepiece-cardgame.com/images/cardlist/card/OP01-025.png')}`,
            language: 'EN',
            finishes: 'Leader Foil'
          });
        }
      }

    } else if (game === 'riftbound') {
      // Riftbound TCG (Official Portuguese cards from Legends of Runeterra TCG with borders, stats & card frames)
      const qLower = cleanQuery.toLowerCase();
      try {
        const lorCards = await getOfficialLoRCards();
        const matches = lorCards.filter((c: any) =>
          c.name?.toLowerCase().includes(qLower) ||
          c.cardCode?.toLowerCase().includes(qLower) ||
          cleanQuery === ''
        );

        // Sort champions first, then spells/units
        matches.sort((a: any, b: any) => {
          const aChamp = a.supertype === 'Campeão' ? 1 : 0;
          const bChamp = b.supertype === 'Campeão' ? 1 : 0;
          return bChamp - aChamp;
        });

        for (const c of matches.slice(0, 16)) {
          const isChamp = c.supertype === 'Campeão';
          prints.push({
            id: `rift-lor-${c.cardCode}`,
            name: isChamp ? `${c.name} (Campeão Oficial PT-BR)` : `${c.name} (Carta Oficial PT-BR)`,
            printedName: c.name,
            setName: 'Origens de Runeterra: Edição Alfa',
            setCode: c.cardCode?.substring(0, 4) || 'RFT1',
            cardNumber: c.cardCode,
            rarity: c.rarityRef || (isChamp ? 'Mítica' : 'Rara'),
            imageUrl: `https://dd.b.pvp.net/latest/set1/pt_br/img/cards/${c.cardCode}.png`,
            language: 'PT-BR',
            finishes: isChamp ? 'Textured Foil / Oficial' : 'Standard Art',
            isPromo: isChamp,
          });
        }
      } catch (lorErr) {
        console.warn('LoR cards search error:', lorErr);
      }

      // Safe fallback if offline
      if (prints.length === 0) {
        const staples = [
          { name: 'Yasuo, o Imperdoável', code: '01IO015', rarity: 'Mítica' },
          { name: 'Jinx, o Gatilho Solto', code: '01PZ040', rarity: 'Rara' },
          { name: 'Zed, o Mestre das Sombras', code: '01IO009', rarity: 'Mítica' },
          { name: 'Garen, o Poder de Demacia', code: '01DE012', rarity: 'Rara' },
        ];
        for (const s of staples) {
          prints.push({
            id: `rift-staple-${s.code}`,
            name: `${s.name} (Carta Oficial PT-BR)`,
            printedName: s.name,
            setName: 'Origens de Runeterra: Edição Alfa',
            setCode: 'RFT-01',
            cardNumber: s.code,
            rarity: s.rarity,
            imageUrl: `https://dd.b.pvp.net/latest/set1/pt_br/img/cards/${s.code}.png`,
            language: 'PT-BR',
            finishes: 'Textured Foil / Oficial',
            isPromo: s.rarity === 'Mítica',
          });
        }
      }

    } else if (game === 'lorcana') {
      try {
        const lorRes = await fetch(`https://api.lorcast.com/v0/cards/search?q=${encodeURIComponent(cleanQuery)}`);
        if (lorRes.ok) {
          const lorData = await lorRes.json();
          if (lorData.results && Array.isArray(lorData.results)) {
            for (const l of lorData.results.slice(0, 12)) {
              const img = l.image_uris?.digital?.large || l.image_uris?.digital?.normal;
              if (img) {
                prints.push({
                  id: `lorc-${l.id}`,
                  name: `${l.name}${l.version ? ' - ' + l.version : ''}`,
                  printedName: l.name,
                  setName: l.set?.name || 'Disney Lorcana',
                  setCode: l.set?.code ? `SET-${l.set.code}` : 'TFC',
                  cardNumber: l.collector_number || '001',
                  rarity: l.rarity || 'Rare',
                  imageUrl: img,
                  language: 'EN',
                  finishes: l.variants?.join(', ') || 'Cold Foil / Normal',
                  isPromo: l.rarity === 'Enchanted',
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    res.json({
      success: true,
      query: cleanQuery,
      game,
      totalPrints: prints.length,
      prints
    });
  } catch (error: any) {
    console.error('Error fetching card prints:', error);
    res.status(500).json({ error: error?.message || 'Erro ao buscar edições e imagens do card' });
  }
});

/**
 * 4. Fetch Liga lowest price for a specific card
 */
app.get('/api/liga-price', async (req, res) => {
  try {
    const name = req.query.name as string;
    const game = (req.query.game as string) || 'magic';
    const rarity = (req.query.rarity as string) || 'Comum';

    if (!name) {
      return res.status(400).json({ error: 'Nome do card é obrigatório.' });
    }

    const priceData = await fetchLigaLowestPrice(name, game, rarity);
    res.json({
      success: true,
      cardName: name,
      game,
      menorPreco: priceData.menorPreco,
      precoMedio: priceData.precoMedio,
      ligaUrl: priceData.ligaUrl
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erro ao buscar cotação na Liga' });
  }
});

// ----------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
