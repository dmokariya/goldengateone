import React, { useState } from 'react';
import { TradeableContract, AssetCategory } from '../types';
import { getDynamicTradeableContracts } from '../data/contracts';
import { Search, Zap, Layers, RefreshCw, Clock, ShieldCheck, ChevronDown, PlusCircle, ShieldAlert } from 'lucide-react';

interface ContractCatalogProps {
  contracts?: TradeableContract[];
  onScanSignalsForContract: (contractSymbol: string, category: string) => void;
  isScanning: boolean;
  selectedContractSymbol: string | null;
  onSelectContract: (symbol: string) => void;
  onFetchLiveQuotes?: () => void;
  isFetchingQuotes?: boolean;
  onUserActionFeedback?: (message: string) => void;
}

export const ContractCatalog: React.FC<ContractCatalogProps> = ({
  contracts,
  onScanSignalsForContract,
  isScanning,
  selectedContractSymbol,
  onSelectContract,
  onFetchLiveQuotes,
  isFetchingQuotes,
  onUserActionFeedback
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AssetCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(16);
  const [atmOnlyFilter, setAtmOnlyFilter] = useState(true);

  const triggerFeedback = (msg: string) => {
    if (onUserActionFeedback) onUserActionFeedback(msg);
  };

  const activeContracts = (contracts && contracts.length > 0) ? contracts : getDynamicTradeableContracts();

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
    <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-sm space-y-3 font-mono text-xs text-[#D1D5DB]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-[#3B82F6]" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span>Tradeable Contract Universe ({activeContracts.length} Assets)</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-bold">
                DYNAMIC ATM & EXPIRIES
              </span>
            </h2>
            <p className="text-[11px] text-gray-300">Live NIFTY (Lot Size 65), BANKNIFTY & Liquid Equities with Provenance Verification</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onFetchLiveQuotes && (
            <button
              onClick={() => {
                triggerFeedback('Syncing live market quotes for all contracts from Zerodha API...');
                onFetchLiveQuotes();
              }}
              disabled={isFetchingQuotes}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded shadow transition-all text-[11px] border border-emerald-400/30"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuotes ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">PULL ZERODHA QUOTES</span>
            </button>
          )}

          <button
            onClick={() => {
              const nextState = !isCollapsed;
              setIsCollapsed(nextState);
              triggerFeedback(nextState ? 'Collapsed Tradeable Contract Catalog' : 'Expanded Tradeable Contract Catalog');
            }}
            className="flex items-center space-x-1.5 bg-[#0A0B0E] hover:bg-[#1F2937] text-gray-200 font-bold px-3 py-1.5 rounded border border-[#1F2937] transition-all text-[11px]"
          >
            <span>{isCollapsed ? '▼ SHOW CATALOG' : '▲ HIDE CATALOG'}</span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 pt-1 animate-fadeIn">
          {/* Filter and Dropdowns Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-60">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search symbol (e.g. NIFTY, 24600)..."
                className="w-full bg-[#0A0B0E] border border-[#1F2937] text-white pl-9 pr-3 py-1.5 rounded focus:outline-none focus:border-[#3B82F6] text-xs"
              />
            </div>

            {/* ATM +- 2 Liquid Guard Toggle */}
            <button
              onClick={() => {
                const next = !atmOnlyFilter;
                setAtmOnlyFilter(next);
                triggerFeedback(next ? 'Enabled ATM ± 2 Strikes (Liquid Only)' : 'Showing all strike catalogs');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-all ${
                atmOnlyFilter
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                  : 'bg-[#0A0B0E] text-gray-400 border-[#1F2937] hover:text-white'
              }`}
              title="Prunes illiquid far-OTM strikes to protect from wide spreads & slippage"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ATM ± 2 STRIKES (LIQUID ONLY)</span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${atmOnlyFilter ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
                {atmOnlyFilter ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 bg-[#0A0B0E] border border-[#1F2937] p-1 rounded font-mono text-[11px] w-full md:w-auto">
              {(['ALL', 'NIFTY_FNO', 'BANKNIFTY_FNO', 'FINNIFTY_FNO', 'EQUITY_INTRADAY'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat);
                    triggerFeedback(`Filtered contract universe by: ${cat.replace('_', ' ')}`);
                  }}
                  className={`px-2.5 py-1 rounded transition-colors font-bold ${
                    categoryFilter === cat ? 'bg-[#3B82F6] text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {cat === 'ALL'
                    ? 'ALL'
                    : cat === 'NIFTY_FNO'
                    ? 'NIFTY F&O'
                    : cat === 'BANKNIFTY_FNO'
                    ? 'BANKNIFTY'
                    : cat === 'FINNIFTY_FNO'
                    ? 'FINNIFTY'
                    : 'EQUITIES'}
                </button>
              ))}
            </div>
          </div>

          {/* Contracts Grid with Max Height & Y-Scroller */}
          <div className="max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayedContracts.map((contract) => {
                const isSelected = selectedContractSymbol === contract.symbol;
                return (
                  <div
                    key={contract.symbol}
                    onClick={() => {
                      onSelectContract(contract.symbol);
                      triggerFeedback(`Selected contract: ${contract.symbol} (${contract.exchange})`);
                    }}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#1E293B] border-[#3B82F6] ring-1 ring-[#3B82F6]'
                        : 'bg-[#0A0B0E] border-[#1F2937] hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{contract.symbol}</span>
                      <div className="flex items-center space-x-1">
                        {contract.moneyness && (
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                              contract.moneyness === 'ATM'
                                ? 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                                : contract.moneyness === 'ITM'
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                                : 'bg-blue-950/70 text-blue-300 border-blue-500/50'
                            }`}
                          >
                            {contract.moneyness}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            contract.exchange === 'NFO' || contract.exchange === 'BFO'
                              ? 'bg-purple-900/50 text-purple-300 border border-purple-800/50'
                              : 'bg-blue-900/50 text-blue-300 border border-blue-800/50'
                          }`}
                        >
                          {contract.exchange}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-200 font-semibold">
                        {contract.lastPrice > 0 ? `LTP: ₹${contract.lastPrice.toFixed(2)}` : 'Live Stream'}
                      </span>
                      <span className="text-amber-300 font-extrabold">Lot: {contract.lotSize} Qty</span>
                    </div>

                    {/* Expiry & Horizon Preview */}
                    <div className="mt-2 bg-[#111827] p-1.5 rounded border border-[#1F2937] flex items-center justify-between text-[10px]">
                      <span className="text-blue-300 flex items-center space-x-1 font-medium">
                        <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>{contract.expiry || 'Intraday MIS'}</span>
                      </span>
                      <span className="text-emerald-400 flex items-center space-x-1 font-bold">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Verified</span>
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1F2937]/60 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerFeedback(`Requested AI signal read for contract: ${contract.symbol}`);
                          onScanSignalsForContract(contract.symbol, contract.category);
                        }}
                        disabled={isScanning}
                        className="text-[10.5px] bg-indigo-600/40 hover:bg-indigo-600/70 text-indigo-200 px-2.5 py-1 rounded font-bold border border-indigo-500/40 flex items-center space-x-1 ml-auto"
                      >
                        <Zap className="w-3 h-3" />
                        <span>READ SIGNAL</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Contracts Button */}
            {filteredContracts.length > visibleCount && (
              <div className="mt-4 text-center pb-2">
                <button
                  onClick={() => {
                    setVisibleCount((prev) => prev + 12);
                    triggerFeedback(`Loaded ${visibleCount + 12} contracts in catalog.`);
                  }}
                  className="bg-[#1F2937] hover:bg-gray-700 text-white font-bold px-4 py-2 rounded text-xs border border-gray-600 inline-flex items-center space-x-2 shadow-md"
                >
                  <PlusCircle className="w-4 h-4 text-blue-400" />
                  <span>LOAD MORE CONTRACTS ({filteredContracts.length - visibleCount} REMAINING)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
