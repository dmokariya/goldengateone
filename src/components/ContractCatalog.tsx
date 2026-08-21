import React, { useState } from 'react';
import { TradeableContract, AssetCategory } from '../types';
import { getDynamicTradeableContracts } from '../data/contracts';
import { Search, Zap, Layers, RefreshCw, Clock, ShieldCheck, ChevronDown, PlusCircle, ShieldAlert, Sparkles, TrendingUp, TrendingDown, Target, Check } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface ContractCatalogProps {
  contracts?: TradeableContract[];
  onScanSignalsForContract: (contractSymbol: string, category: string) => void;
  isScanning: boolean;
  selectedContractSymbol: string | null;
  onSelectContract: (symbol: string) => void;
  onFetchLiveQuotes?: () => void;
  isFetchingQuotes?: boolean;
  onUserActionFeedback?: (message: string) => void;
  liveQuotes?: Record<string, { lastPrice: number; changePct?: number; netChange?: number }>;
  spotIndices?: Record<string, number>;
  isSideBySide?: boolean;
}

export const ContractCatalog: React.FC<ContractCatalogProps> = ({
  contracts,
  onScanSignalsForContract,
  isScanning,
  selectedContractSymbol,
  onSelectContract,
  onFetchLiveQuotes,
  isFetchingQuotes,
  onUserActionFeedback,
  liveQuotes = {},
  spotIndices = {},
  isSideBySide = false
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AssetCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const [atmOnlyFilter, setAtmOnlyFilter] = useState(false);

  const triggerFeedback = (msg: string) => {
    if (onUserActionFeedback) onUserActionFeedback(msg);
  };

  const activeContracts = (contracts && contracts.length > 0) ? contracts : getDynamicTradeableContracts(spotIndices);

  const filteredContracts = activeContracts.filter((c) => {
    const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    const matchesSearch =
      c.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tradingsymbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAtm = !atmOnlyFilter || c.isAtmNearStrike !== false;
    return matchesCategory && matchesSearch && matchesAtm;
  });

  const displayedContracts = filteredContracts.slice(0, visibleCount);

  return (
    <div className={`bg-[#111827] border border-[#1F2937] rounded-xl p-3.5 sm:p-4 space-y-3 font-mono text-xs text-[#D1D5DB] shadow-lg flex flex-col ${
      isSideBySide ? 'h-[760px]' : ''
    }`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
              <span>Tradable Contract Universe</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded font-bold">
                {filteredContracts.length} Assets
              </span>
            </h2>
            <p className="text-[10px] text-gray-400">Scrollable liquid option ladder & active equities</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {onFetchLiveQuotes && (
            <button
              onClick={() => {
                triggerFeedback('Syncing live market quotes for all contracts from Zerodha API...');
                onFetchLiveQuotes();
              }}
              disabled={isFetchingQuotes}
              className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-2 py-1 rounded shadow text-[10.5px] border border-emerald-400/40 cursor-pointer active:scale-95"
              title="Pull fresh live quotes for all universe symbols"
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingQuotes ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">QUOTES</span>
            </button>
          )}

          {!isSideBySide && (
            <button
              onClick={() => {
                const nextState = !isCollapsed;
                setIsCollapsed(nextState);
                triggerFeedback(nextState ? 'Collapsed Tradeable Contract Catalog' : 'Expanded Tradeable Contract Catalog');
              }}
              className="flex items-center space-x-1 bg-[#0A0B0E] hover:bg-[#1F2937] text-gray-300 font-bold px-2 py-1 rounded border border-[#1F2937] text-[10.5px]"
            >
              <span>{isCollapsed ? '▼ SHOW' : '▲ HIDE'}</span>
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex-1 flex flex-col space-y-2.5 overflow-hidden">
          {/* Filter & Search Bar */}
          <div className="space-y-2">
            {/* Search Input & ATM Filter */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search contract / strike..."
                  className="w-full bg-[#0A0B0E] border border-[#1F2937] text-white pl-8 pr-2.5 py-1 rounded text-[11px] focus:outline-none focus:border-blue-500 placeholder-gray-500"
                />
              </div>

              <button
                onClick={() => setAtmOnlyFilter(!atmOnlyFilter)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all shrink-0 flex items-center space-x-1 ${
                  atmOnlyFilter
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-[#0A0B0E] text-gray-400 border-gray-800 hover:text-gray-200'
                }`}
                title="Filter for ATM ± 2 Strikes (Highest Liquidity & Tight Spreads)"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>ATM ONLY</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 bg-[#0A0B0E] border border-[#1F2937] p-1 rounded font-mono text-[10px]">
              {(['ALL', 'NIFTY_FNO', 'BANKNIFTY_FNO', 'FINNIFTY_FNO', 'EQUITY_INTRADAY'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat);
                    triggerFeedback(`Filtered contract universe: ${cat.replace('_', ' ')}`);
                  }}
                  className={`px-2 py-0.5 rounded transition-all font-bold ${
                    categoryFilter === cat ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {cat === 'ALL'
                    ? 'ALL'
                    : cat === 'NIFTY_FNO'
                    ? 'NIFTY'
                    : cat === 'BANKNIFTY_FNO'
                    ? 'BANKNIFTY'
                    : cat === 'FINNIFTY_FNO'
                    ? 'FINNIFTY'
                    : 'EQUITIES'}
                </button>
              ))}
            </div>
          </div>

          {/* High-Density Scrollable Table/List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900/40">
            {displayedContracts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                No matching contracts found for "{searchTerm}".
              </div>
            ) : (
              displayedContracts.map((contract) => {
                const isSelected = selectedContractSymbol === contract.symbol;
                const quote = liveQuotes[contract.symbol] || liveQuotes[contract.tradingsymbol] || liveQuotes[`NFO:${contract.tradingsymbol}`] || liveQuotes[`NSE:${contract.symbol}`];
                const liveLtp = quote?.lastPrice ?? (contract.lastPrice > 0 ? contract.lastPrice : 0);
                const changePct = quote?.changePct ?? 0;
                const isCall = contract.symbol.includes('CE') || contract.optionType === 'CE';
                const isPut = contract.symbol.includes('PE') || contract.optionType === 'PE';

                return (
                  <div
                    key={contract.symbol}
                    onClick={() => {
                      onSelectContract(contract.symbol);
                      triggerFeedback(`Armed contract: ${contract.symbol}`);
                    }}
                    className={`p-2 rounded-lg border cursor-pointer transition-all duration-150 relative ${
                      isSelected
                        ? 'bg-[#1E293B] border-blue-400 ring-2 ring-blue-500/50 shadow-md shadow-blue-500/10'
                        : 'bg-[#0A0B0E] border-[#1F2937] hover:border-gray-600 hover:bg-[#131B2E]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        {/* Type indicator badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase shrink-0 ${
                          isCall
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : isPut
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            : 'bg-blue-950 text-blue-300 border border-blue-500/40'
                        }`}>
                          {isCall ? 'CE' : isPut ? 'PE' : 'EQ'}
                        </span>

                        <div className="truncate">
                          <span className={`font-bold text-[11.5px] truncate block ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                            {contract.symbol}
                          </span>
                          <span className="text-[9.5px] text-gray-400 block truncate">
                            {contract.name} • Lot: {contract.lotSize}
                          </span>
                        </div>
                      </div>

                      {/* Right side: Live LTP & Quick Action */}
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="flex items-center justify-end space-x-1">
                          <span className="text-xs font-black text-white font-mono">
                            {liveLtp > 0 ? `₹${liveLtp.toFixed(2)}` : '₹--'}
                          </span>
                          {changePct !== 0 && (
                            <span className={`text-[9.5px] font-bold flex items-center ${changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end space-x-1">
                          {contract.moneyness && (
                            <span className={`text-[8.5px] font-extrabold px-1 rounded border ${
                              contract.moneyness === 'ATM'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : contract.moneyness === 'ITM'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}>
                              {contract.moneyness}
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerFeedback(`Scanning AI quant models for ${contract.symbol}...`);
                              onScanSignalsForContract(contract.symbol, contract.category);
                            }}
                            disabled={isScanning}
                            className="text-[9px] bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 px-1.5 py-0.5 rounded font-bold border border-indigo-500/40 flex items-center space-x-0.5 transition-colors"
                            title="Generate instant AI quant signal for this contract"
                          >
                            <Zap className="w-2.5 h-2.5" />
                            <span>SCAN</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Load More Button */}
            {filteredContracts.length > visibleCount && (
              <div className="pt-2 text-center pb-2">
                <button
                  onClick={() => {
                    setVisibleCount((prev) => prev + 30);
                    triggerFeedback(`Expanded catalog to show ${visibleCount + 30} assets.`);
                  }}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-bold px-3 py-1.5 rounded text-[10.5px] border border-gray-700 inline-flex items-center space-x-1.5 cursor-pointer shadow"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                  <span>SHOW MORE ({filteredContracts.length - visibleCount} MORE)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
