import { CardItem, TCGGame } from '../types';

/**
 * Mapeamento e normalização estrita de idiomas para as siglas aceitas pela Liga:
 * 'BR', 'EN', 'DE', 'ES', 'FR', 'IT', 'JP', 'KO', 'RU', 'TW'
 */
export function normalizeLigaLanguage(lang?: string): string {
  if (!lang) return 'EN';
  const clean = lang.trim().toUpperCase();

  // Siglas diretas
  if (['BR', 'EN', 'DE', 'ES', 'FR', 'IT', 'JP', 'KO', 'RU', 'TW'].includes(clean)) {
    return clean;
  }

  // Variações de Português
  if (['PT', 'PTBR', 'PT-BR', 'PORTUGUÊS', 'PORTUGUES', 'BRAZIL', 'BRASIL'].includes(clean)) {
    return 'BR';
  }

  // Variações de Inglês
  if (['ENG', 'ENGLISH', 'INGLÊS', 'INGLES', 'USA', 'US'].includes(clean)) {
    return 'EN';
  }

  // Variações de Japonês
  if (['JPN', 'JAPANESE', 'JAPONÊS', 'JAPONES', 'JAPÃO'].includes(clean)) {
    return 'JP';
  }

  // Alemão (German)
  if (['GER', 'DEU', 'ALEMÃO', 'ALEMAO', 'GERMAN'].includes(clean)) {
    return 'DE';
  }

  // Espanhol (Spanish)
  if (['SPA', 'ESPANHOL', 'SPANISH'].includes(clean)) {
    return 'ES';
  }

  // Francês (French)
  if (['FRA', 'FRE', 'FRANCÊS', 'FRANCES', 'FRENCH'].includes(clean)) {
    return 'FR';
  }

  // Italiano (Italian)
  if (['ITA', 'ITALIANO', 'ITALIAN'].includes(clean)) {
    return 'IT';
  }

  // Coreano (Korean)
  if (['KOR', 'COREANO', 'KOREAN'].includes(clean)) {
    return 'KO';
  }

  // Russo (Russian)
  if (['RUS', 'RUSSO', 'RUSSIAN'].includes(clean)) {
    return 'RU';
  }

  // Chinês Tradicional (Taiwan)
  if (['CHI', 'ZHO', 'CHINÊS', 'CHINES', 'CHINESE', 'TAIWAN'].includes(clean)) {
    return 'TW';
  }

  return 'EN';
}

/**
 * Mapeamento e normalização estrita de estado de conservação:
 * 'M', 'NM', 'SP', 'MP', 'HP', 'D'
 */
export function normalizeLigaCondition(condition?: string): string {
  if (!condition) return 'NM';
  const clean = condition.trim().toUpperCase();

  if (['M', 'NM', 'SP', 'MP', 'HP', 'D'].includes(clean)) {
    return clean;
  }

  if (clean.includes('MINT') && !clean.includes('NEAR')) return 'M';
  if (clean.includes('NEAR') || clean.includes('NOVO') || clean.includes('PERFEITO')) return 'NM';
  if (clean.includes('SLIGHTLY') || clean.includes('POUCO USADO') || clean.includes('EXCELLENT') || clean.includes('EX')) return 'SP';
  if (clean.includes('MODERATELY') || clean.includes('MODERADO') || clean.includes('VERY GOOD') || clean.includes('VG')) return 'MP';
  if (clean.includes('HEAVILY') || clean.includes('MUITO USADO') || clean.includes('GOOD') || clean.includes('GD')) return 'HP';
  if (clean.includes('DAMAGED') || clean.includes('DANIFICADO') || clean.includes('POOR')) return 'D';

  return 'NM';
}

/**
 * Mapeamento de raridade conforme convenção de letras da Liga:
 * 'M' (Mítica), 'R' (Rara), 'U' (Incomum/Uncommon), 'C' (Comum)
 */
export function normalizeLigaRarity(rarity?: string): string {
  if (!rarity) return '';
  const clean = rarity.trim().toLowerCase();

  if (clean.includes('mític') || clean.includes('mitic') || clean.includes('mythic') || clean === 'm') {
    return 'M';
  }
  if (clean.includes('incomum') || clean.includes('uncommon') || clean === 'u') {
    return 'U';
  }
  if (clean.includes('comum') || clean.includes('common') || clean === 'c') {
    return 'C';
  }
  if (clean.includes('rara') || clean.includes('rare') || clean === 'r') {
    return 'R';
  }
  return '';
}

/**
 * Mapeamento de cor / atributos para a convenção W U B R G M A L
 */
export function normalizeLigaColor(colorOrAttr?: string): string {
  if (!colorOrAttr) return '';
  const clean = colorOrAttr.trim().toLowerCase();

  if (clean.includes('branco') || clean.includes('white') || clean === 'w') return 'W';
  if (clean.includes('azul') || clean.includes('blue') || clean === 'u') return 'U';
  if (clean.includes('preto') || clean.includes('black') || clean === 'b') return 'B';
  if (clean.includes('vermelho') || clean.includes('red') || clean === 'r') return 'R';
  if (clean.includes('verde') || clean.includes('green') || clean === 'g') return 'G';
  if (clean.includes('multi') || clean.includes('dourad') || clean.includes('gold') || clean === 'm') return 'M';
  if (clean.includes('artefato') || clean.includes('artifact') || clean === 'a') return 'A';
  if (clean.includes('terreno') || clean.includes('land') || clean === 'l') return 'L';

  return '';
}

/**
 * Mapeamento da coluna "Extras" da LigaMagic (ex: Foil, Etched, Promo, etc.)
 */
export function getLigaExtras(card: CardItem): string {
  const extras: string[] = [];
  if (card.isFoil) {
    extras.push('Foil');
  }
  if (card.finishType && card.finishType.toLowerCase().includes('etched')) {
    extras.push('Etched');
  }
  if (card.rarity === 'Promo' || card.description?.toLowerCase().includes('promo')) {
    extras.push('Promo');
  }
  return extras.join(' ');
}

/**
 * Remove qualquer anotação entre parênteses para manter apenas o nome limpo do card.
 * Exemplo: "Sol Ring (Anel Solar)" -> "Sol Ring"
 * Exemplo: "Anel Solar (Sol Ring)" -> "Anel Solar"
 * Exemplo: "Charizard ex (Special Illustration Rare)" -> "Charizard ex"
 */
export function sanitizeCardName(rawName?: string): string {
  if (!rawName) return '';
  return rawName.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Se o card possuir ambos os nomes separados por parênteses (ex: "Sol Ring (Anel Solar)" ou "Anel Solar (Sol Ring)"),
 * extrai o nome principal e o nome secundário (traduzido).
 */
export function extractCleanNames(rawName: string, language?: string): { namePT: string; nameEN: string } {
  const clean = (rawName || '').trim();
  const match = clean.match(/^([^(]+)\s*\(([^)]+)\)$/);
  const langSigla = normalizeLigaLanguage(language);
  const isPT = langSigla === 'BR';

  if (match) {
    const first = match[1].trim();
    const inside = match[2].trim();

    // Se o idioma for Português (BR) e o primeiro estiver em inglês ou pt
    if (isPT) {
      // Se dentro for o nome em inglês ou vice-versa, separamos
      return {
        namePT: sanitizeCardName(first),
        nameEN: sanitizeCardName(inside)
      };
    } else {
      return {
        namePT: sanitizeCardName(inside),
        nameEN: sanitizeCardName(first)
      };
    }
  }

  const base = sanitizeCardName(clean);
  if (isPT) {
    return { namePT: base, nameEN: '' };
  } else {
    return { namePT: '', nameEN: base };
  }
}

/**
 * Cabeçalho oficial padrão da LigaMagic (CSV):
 * Edicao (PTBR),Edicao (EN),Edicao (Sigla),Card (PT),Card (EN),Quantidade,Qualidade (M NM SP MP HP D),Idioma (BR EN DE ES FR IT JP KO RU TW),Raridade (M R U C),Cor (W U B R G M A L),Extras,Card #,Comentario
 */
export const LIGAMAGIC_CSV_HEADER = 'Edicao (PTBR),Edicao (EN),Edicao (Sigla),Card (PT),Card (EN),Quantidade,Qualidade (M NM SP MP HP D),Idioma (BR EN DE ES FR IT JP KO RU TW),Raridade (M R U C),Cor (W U B R G M A L),Extras,Card #,Comentario';

/**
 * Converte um valor de campo para formato CSV seguro (escapando aspas e delimitando se necessário)
 */
function escapeCSVField(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Gera a string CSV formatada no padrão oficial da LigaMagic
 */
export function generateLigaCSV(cards: CardItem[], targetGame?: TCGGame): string {
  const filtered = targetGame ? cards.filter(c => c.game === targetGame) : cards;

  const rows: string[] = [LIGAMAGIC_CSV_HEADER];

  for (const card of filtered) {
    const langSigla = normalizeLigaLanguage(card.language);
    const condSigla = normalizeLigaCondition(card.condition);
    const rarSigla = normalizeLigaRarity(card.rarity);
    const corSigla = normalizeLigaColor(card.colorOrAttribute);
    const extras = getLigaExtras(card);

    // Nomes limpos e separados sem parênteses:
    // A Liga exige que Card (PT) tenha apenas o nome em português e Card (EN) apenas o nome em inglês.
    const { namePT, nameEN } = extractCleanNames(card.name, card.language);

    // Edição
    const edicaoPTBR = ''; // opcional
    const edicaoEN = card.setName || '';
    const edicaoSigla = (card.setCode || '').toUpperCase();

    // Quantidade física em estoque (mínimo 1 se tiver estoque, ou a quantidade real)
    const quantidade = Math.max(1, card.stockQuantity || 1);
    const cardNumero = card.cardNumber || '';
    
    // Comentário opcional com preço sugerido em reais da Galera Geek
    const comentario = card.price ? `Preço Galera Geek: R$ ${card.price.toFixed(2).replace('.', ',')}` : '';

    const row = [
      escapeCSVField(edicaoPTBR),
      escapeCSVField(edicaoEN),
      escapeCSVField(edicaoSigla),
      escapeCSVField(namePT),
      escapeCSVField(nameEN),
      escapeCSVField(quantidade),
      escapeCSVField(condSigla),
      escapeCSVField(langSigla),
      escapeCSVField(rarSigla),
      escapeCSVField(corSigla),
      escapeCSVField(extras),
      escapeCSVField(cardNumero),
      escapeCSVField(comentario)
    ].join(',');

    rows.push(row);
  }

  return rows.join('\r\n');
}

/**
 * Gera um arquivo HTML / XML estilo Microsoft Excel (.xls)
 * Esse formato é 100% nativo do Excel / LibreOffice e respeita a estrutura exata das colunas
 * sem nenhum problema de acentuação (UTF-8) e sem risco de desconfigurar vírgulas.
 */
export function generateLigaExcelXLS(cards: CardItem[], targetGame?: TCGGame): string {
  const filtered = targetGame ? cards.filter(c => c.game === targetGame) : cards;

  const headers = [
    'Edicao (PTBR)',
    'Edicao (EN)',
    'Edicao (Sigla)',
    'Card (PT)',
    'Card (EN)',
    'Quantidade',
    'Qualidade (M NM SP MP HP D)',
    'Idioma (BR EN DE ES FR IT JP KO RU TW)',
    'Raridade (M R U C)',
    'Cor (W U B R G M A L)',
    'Extras',
    'Card #',
    'Comentario'
  ];

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D97706"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Center">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Number">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="0"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Estoque Liga">
  <Table>
   <Column ss:Width="120"/>
   <Column ss:Width="160"/>
   <Column ss:Width="80"/>
   <Column ss:Width="160"/>
   <Column ss:Width="180"/>
   <Column ss:Width="80"/>
   <Column ss:Width="140"/>
   <Column ss:Width="160"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="160"/>
   <Row ss:Height="24">
`;

  // Header row
  for (const h of headers) {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>\n`;
  }
  xml += `   </Row>\n`;

  // Data rows
  for (const card of filtered) {
    const langSigla = normalizeLigaLanguage(card.language);
    const condSigla = normalizeLigaCondition(card.condition);
    const rarSigla = normalizeLigaRarity(card.rarity);
    const corSigla = normalizeLigaColor(card.colorOrAttribute);
    const extras = getLigaExtras(card);
    const { namePT, nameEN } = extractCleanNames(card.name, card.language);
    const edicaoEN = card.setName || '';
    const edicaoSigla = (card.setCode || '').toUpperCase();
    const quantidade = Math.max(1, card.stockQuantity || 1);
    const cardNumero = card.cardNumber || '';
    const comentario = card.price ? `Preço Galera Geek: R$ ${card.price.toFixed(2).replace('.', ',')}` : '';

    xml += `   <Row ss:Height="18">\n`;
    xml += `    <Cell><Data ss:Type="String"></Data></Cell>\n`; // Edicao (PTBR)
    xml += `    <Cell><Data ss:Type="String">${escapeXml(edicaoEN)}</Data></Cell>\n`; // Edicao (EN)
    xml += `    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(edicaoSigla)}</Data></Cell>\n`; // Edicao (Sigla)
    xml += `    <Cell><Data ss:Type="String">${escapeXml(namePT)}</Data></Cell>\n`; // Card (PT)
    xml += `    <Cell><Data ss:Type="String">${escapeXml(nameEN)}</Data></Cell>\n`; // Card (EN)
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${quantidade}</Data></Cell>\n`; // Quantidade
    xml += `    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(condSigla)}</Data></Cell>\n`; // Qualidade
    xml += `    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(langSigla)}</Data></Cell>\n`; // Idioma
    xml += `    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(rarSigla)}</Data></Cell>\n`; // Raridade
    xml += `    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(corSigla)}</Data></Cell>\n`; // Cor
    xml += `    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(extras)}</Data></Cell>\n`; // Extras
    xml += `    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(cardNumero)}</Data></Cell>\n`; // Card #
    xml += `    <Cell><Data ss:Type="String">${escapeXml(comentario)}</Data></Cell>\n`; // Comentario
    xml += `   </Row>\n`;
  }

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Dispara o download no navegador do arquivo .csv ou .xls
 */
export function downloadLigaExport(
  cards: CardItem[], 
  format: 'csv' | 'xls', 
  targetGame?: TCGGame
): void {
  const gameName = targetGame ? targetGame : 'todos_jogos';
  const dateStr = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const csvContent = generateLigaCSV(cards, targetGame);
    // Adiciona BOM (\uFEFF) para garantir que Excel abra acentos em UTF-8 perfeitamente
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `liga_export_${gameName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } else {
    const xlsContent = generateLigaExcelXLS(cards, targetGame);
    const blob = new Blob([xlsContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `liga_export_${gameName}_${dateStr}.xls`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
