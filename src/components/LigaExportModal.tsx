import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  X, 
  Check, 
  Info, 
  Filter,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CardItem, TCGGame } from '../types';
import { downloadLigaExport, LIGAMAGIC_CSV_HEADER } from '../utils/ligaExport';
import { getGameMeta } from '../utils/formatters';

interface LigaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CardItem[];
  defaultGameFilter?: TCGGame | 'all';
}

export const LigaExportModal: React.FC<LigaExportModalProps> = ({
  isOpen,
  onClose,
  cards,
  defaultGameFilter = 'all'
}) => {
  const [selectedGame, setSelectedGame] = useState<TCGGame | 'all'>(defaultGameFilter);
  const [exportFormat, setExportFormat] = useState<'xls' | 'csv'>('xls');
  const [isExported, setIsExported] = useState(false);

  if (!isOpen) return null;

  const filteredCards = selectedGame === 'all' 
    ? cards 
    : cards.filter(c => c.game === selectedGame);

  const handleExport = () => {
    downloadLigaExport(cards, exportFormat, selectedGame === 'all' ? undefined : selectedGame);
    setIsExported(true);
    setTimeout(() => {
      setIsExported(false);
    }, 3000);
  };

  const previewCards = filteredCards.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Exportar Planilha para Liga</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-semibold">
                  LigaMagic • LigaPokemon • LigaLorcana
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Gera o arquivo com o cabeçalho padrão e regras oficiais da Liga
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Rules explanation box */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
              <Check className="w-4 h-4 text-amber-400" />
              <span>Regras de Conversão Automática Aplicadas:</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
              <li>
                <strong className="text-white">Nomes Limpos e Separados:</strong> O nome em português vai na coluna <code className="text-amber-300 font-mono">Card (PT)</code> e o nome em inglês na coluna <code className="text-amber-300 font-mono">Card (EN)</code>, removendo textos e parênteses confusos para reconhecimento 100% automático na Liga.
              </li>
              <li>
                <strong className="text-white">Idioma:</strong> Convertido estritamente para as siglas aceitas pela Liga (<code className="text-amber-300 font-mono">BR</code>, <code className="text-amber-300 font-mono">EN</code>, <code className="text-amber-300 font-mono">JP</code>, etc.).
              </li>
              <li>
                <strong className="text-white">Qualidade / Estado:</strong> Mapeado para o padrão oficial (<code className="text-amber-300 font-mono">M</code>, <code className="text-amber-300 font-mono">NM</code>, <code className="text-amber-300 font-mono">SP</code>, <code className="text-amber-300 font-mono">MP</code>, <code className="text-amber-300 font-mono">HP</code>, <code className="text-amber-300 font-mono">D</code>).
              </li>
              <li>
                <strong className="text-white">Estrutura das 13 Colunas Oficiais:</strong>
                <div className="mt-1 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400 overflow-x-auto select-all">
                  {LIGAMAGIC_CSV_HEADER}
                </div>
              </li>
            </ul>
          </div>

          {/* Form Options: Game & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filter by Game */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200 block flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span>Filtrar por Jogo:</span>
              </label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="all">Todos os Jogos ({cards.length} cards)</option>
                <option value="magic">Magic: The Gathering ({cards.filter(c => c.game === 'magic').length} cards)</option>
                <option value="pokemon">Pokémon TCG ({cards.filter(c => c.game === 'pokemon').length} cards)</option>
                <option value="lorcana">Disney Lorcana ({cards.filter(c => c.game === 'lorcana').length} cards)</option>
                <option value="onepiece">One Piece Card Game ({cards.filter(c => c.game === 'onepiece').length} cards)</option>
                <option value="riftbound">Riftbound TCG ({cards.filter(c => c.game === 'riftbound').length} cards)</option>
              </select>
            </div>

            {/* Select Format: XLS vs CSV */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200 block flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Formato do Arquivo:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('xls')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    exportFormat === 'xls'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel (.XLS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    exportFormat === 'csv'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Texto (.CSV)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preview of cards to be exported */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Prévia dos cards a serem exportados ({filteredCards.length} itens):</span>
              <span className="text-amber-400 font-mono font-semibold">
                {selectedGame === 'all' ? 'Todos os jogos' : getGameMeta(selectedGame as any).title}
              </span>
            </div>

            <div className="max-h-32 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/80">
              {filteredCards.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  Nenhum card cadastrado para este jogo.
                </div>
              ) : (
                filteredCards.slice(0, 5).map((card) => (
                  <div key={card.id} className="p-2.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-white truncate">{card.name}</span>
                      <span className="text-slate-500 font-mono text-[10px]">[{card.setCode || 'ED'}]</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {card.condition}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {card.language}
                      </span>
                    </div>
                    <div className="font-mono text-emerald-400 font-semibold shrink-0">
                      Qtd: {card.stockQuantity}
                    </div>
                  </div>
                ))
              )}
            </div>
            {filteredCards.length > 5 && (
              <p className="text-[10px] text-slate-500 text-right">
                ... e mais {filteredCards.length - 5} cards incluídos no arquivo
              </p>
            )}
          </div>

          {/* Tip about Liga Import Tool */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-cyan-300">Como enviar para a Liga:</strong>
              <p className="mt-0.5">
                No painel da sua conta da Liga (LigaMagic/LigaPokemon/LigaLorcana), vá em <strong>Estoque &gt; Importar Estoque</strong> e selecione este arquivo baixado. A Liga processará as quantidades e cards automaticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={filteredCards.length === 0}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            {isExported ? (
              <>
                <Check className="w-4 h-4" />
                <span>Arquivo Baixado!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar Planilha ({exportFormat.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
