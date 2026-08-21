import React, { useState } from 'react';
import { Zap, ChevronRight, Layers, TrendingUp, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { LiveTradeSignal } from '../types';
import { calculateDynamicAtmStrike, getNearestWeeklyExpiry, buildOptionTradingSymbol } from '../utils/optionEngine';
import { TOP_LIQUID_EQUITIES, DEFAULT_UNDERLYING_SPOTS } from '../data/contracts';

interface QuickSelectRibbonProps {
  selectedContractSymbol: string;
  onSelectContract: (symbol: string) => void;
  onTriggerFeedback?: (message: string) => void;
  liveQuotes?: Record<string, any>;
  spotIndices?: Record<string, number>;
  liveSignals?: LiveTradeSignal[];
  isConnected?: boolean;
  onRefreshQuotes?: () => void;
  isFetchingQuotes?: boolean;
}

export const QuickSelectRibbon: React.FC<QuickSelectRibbonProps> = ({
  selectedContractSymbol,
  onSelectContract,
  onTriggerFeedback,
  liveQuotes = {},
  spotIndices = {},
  liveSignals = [],
  isConnected = false,
  onRefreshQuotes,
  isFetchingQuotes = false
}) => {
  const [activeTab, setActiveTab] = useState<'NIFTY' | 'BANKNIFTY' | 'EQUITIES'>('NIFTY');

  const niftySpot = spotIndices['NIFTY 50'] || spotIndices['NIFTY'] || DEFAULT_UNDERLYING_SPOTS.NIFTY;
  const bankNiftySpot = spotIndices['NIFTY BANK'] || spotIndices['BANKNIFTY'] || DEFAULT_UNDERLYING_SPOTS.BANKNIFTY;

  const niftyExpiry = getNearestWeeklyExpiry('NIFTY');
  const bankNiftyExpiry = getNearestWeeklyExpiry('BANKNIFTY');

  const niftyAtm = calculateDynamicAtmStrike('NIFTY', niftySpot).atmStrike;
  const bankNiftyAtm = calculateDynamicAtmStrike('BANKNIFTY', bankNiftySpot).atmStrike;

  // Build dynamic dynamic ladder for NIFTY (ATM-100 to ATM+100)
  const niftyItems = [
    { strike: niftyAtm - 100, type: 'CE' as const, label: `${niftyAtm - 100} CE`, moneyness: 'ITM' },
    { strike: niftyAtm - 50, type: 'CE' as const, label: `${niftyAtm - 50} CE`, moneyness: 'ITM' },
    { strike: niftyAtm, type: 'CE' as const, label: `${niftyAtm} CE (ATM)`, moneyness: 'ATM' },
    { strike: niftyAtm + 50, type: 'CE' as const, label: `${niftyAtm + 50} CE`, moneyness: 'OTM' },
    { strike: niftyAtm + 100, type: 'CE' as const, label: `${niftyAtm + 100} CE`, moneyness: 'FAR_OTM' },
    { strike: niftyAtm, type: 'PE' as const, label: `${niftyAtm} PE (ATM)`, moneyness: 'ATM' },
    { strike: niftyAtm - 50, type: 'PE' as const, label: `${niftyAtm - 50} PE`, moneyness: 'OTM' }
  ].map((item) => {
    const sym = buildOptionTradingSymbol('NIFTY', item.strike, item.type, niftyExpiry);
    const quote = liveQuotes[sym] || liveQuotes[`NFO:${sym}`];
    const signal = liveSignals.find((s) => s.symbol.toUpperCase() === sym.toUpperCase());
    return {
      sym,
      label: item.label,
      type: item.type,
      moneyness: item.moneyness,
      ltp: quote?.lastPrice ?? signal?.currentLtp ?? 0,
      changePct: quote?.changePct ?? 0,
      signal,
      isMustTake: signal?.isMustTakeTrade,
      isAvoid: signal?.isBadTradeWarning,
      confluenceScore: signal?.goldenGateScore ?? 0,
      delta: signal?.greeks?.delta
    };
  });

  // Build dynamic ladder for BANKNIFTY
  const bankNiftyItems = [
    { strike: bankNiftyAtm - 200, type: 'CE' as const, label: `${bankNiftyAtm - 200} CE`, moneyness: 'ITM' },
    { strike: bankNiftyAtm - 100, type: 'CE' as const, label: `${bankNiftyAtm - 100} CE`, moneyness: 'ITM' },
    { strike: bankNiftyAtm, type: 'CE' as const, label: `${bankNiftyAtm} CE (ATM)`, moneyness: 'ATM' },
    { strike: bankNiftyAtm + 100, type: 'CE' as const, label: `${bankNiftyAtm + 100} CE`, moneyness: 'OTM' },
    { strike: bankNiftyAtm, type: 'PE' as const, label: `${bankNiftyAtm} PE (ATM)`, moneyness: 'ATM' },
    { strike: bankNiftyAtm - 100, type: 'PE' as const, label: `${bankNiftyAtm - 100} PE`, moneyness: 'OTM' }
  ].map((item) => {
    const sym = buildOptionTradingSymbol('BANKNIFTY', item.strike, item.type, bankNiftyExpiry);
    const quote = liveQuotes[sym] || liveQuotes[`NFO:${sym}`];
    const signal = liveSignals.find((s) => s.symbol.toUpperCase() === sym.toUpperCase());
    return {
      sym,
      label: item.label,
      type: item.type,
      moneyness: item.moneyness,
      ltp: quote?.lastPrice ?? signal?.currentLtp ?? 0,
      changePct: quote?.changePct ?? 0,
      signal,
      isMustTake: signal?.isMustTakeTrade,
      isAvoid: signal?.isBadTradeWarning,
      confluenceScore: signal?.goldenGateScore ?? 0,
      delta: signal?.greeks?.delta
    };
  });

  // Equities list
  const equityItems = TOP_LIQUID_EQUITIES.map((eq) => {
    const sym = eq.symbol;
    const quote = liveQuotes[sym] || liveQuotes[`NSE:${sym}`];
    const signal = liveSignals.find((s) => s.symbol.toUpperCase() === sym.toUpperCase());
    return {
      sym,
      label: eq.symbol,
      type: 'EQ' as const,
      moneyness: 'EQUITY',
      ltp: quote?.lastPrice ?? signal?.currentLtp ?? 0,
      changePct: quote?.changePct ?? 0,
      signal,
      isMustTake: signal?.isMustTakeTrade,
      isAvoid: signal?.isBadTradeWarning,
      confluenceScore: signal?.goldenGateScore ?? 0,
      delta: 1.0
    };
  });

  const displayedItems = activeTab === 'NIFTY' ? niftyItems : activeTab === 'BANKNIFTY' ? bankNiftyItems : equityItems;

  return (
    <div className="bg-[#0D1117] border-2 border-amber-500/40 p-2.5 rounded-md shadow-xl font-mono text-xs space-y-2">
      {/* Ribbon Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5 text-[11px]">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>DYNAMIC STRIKE & ASSET SELECTOR</span>
          </span>
          <span className="bg-amber-400 text-black px-2 py-0.5 rounded text-[9px] font-bold">
            LIVE ATM RECALIBRATION
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <div className="flex bg-[#161B22] p-0.5 rounded border border-gray-700 text-[10px]">
            <button
              onClick={() => setActiveTab('NIFTY')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                activeTab === 'NIFTY' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              NIFTY (₹{niftySpot.toFixed(0)})
            </button>
            <button
              onClick={() => setActiveTab('BANKNIFTY')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                activeTab === 'BANKNIFTY' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              BANKNIFTY (₹{bankNiftySpot.toFixed(0)})
            </button>
            <button
              onClick={() => setActiveTab('EQUITIES')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                activeTab === 'EQUITIES' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              TOP EQUITIES
            </button>
          </div>

          {onRefreshQuotes && (
            <button
              onClick={onRefreshQuotes}
              disabled={isFetchingQuotes}
              title="Pull fresh live quotes"
              className="p-1 rounded bg-[#161B22] hover:bg-[#1F2937] text-gray-300 border border-gray-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuotes ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scrollable Strike Tiles */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-amber-500/30">
        {displayedItems.map((item) => {
          const isSelected = selectedContractSymbol.toUpperCase() === item.sym.toUpperCase();
          const isMustTake = item.isMustTake;
          const isAvoid = item.isAvoid;

          return (
            <button
              key={item.sym}
              onClick={() => {
                onSelectContract(item.sym);
                if (onTriggerFeedback) {
                  onTriggerFeedback(`Selected: ${item.sym} (LTP: ₹${item.ltp.toFixed(2)})`);
                }
              }}
              className={`shrink-0 px-3 py-2 rounded text-[11px] font-mono border transition-all flex flex-col items-start min-w-[130px] ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/60 shadow-lg scale-105 z-10'
                  : isMustTake
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-400 shadow-md hover:bg-emerald-900/80'
                  : isAvoid
                  ? 'bg-[#161B22] text-gray-400 border-gray-800 hover:border-gray-700 opacity-80'
                  : item.type === 'PE'
                  ? 'bg-rose-950/50 text-rose-300 border-rose-500/40 hover:bg-rose-900/60'
                  : item.type === 'CE'
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                  : 'bg-blue-950/50 text-blue-300 border-blue-500/40 hover:bg-blue-900/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold">{item.label}</span>
                {isMustTake && (
                  <span className="text-[9px] bg-emerald-500 text-black px-1 rounded font-extrabold uppercase">
                    MUST TAKE
                  </span>
                )}
                {isAvoid && !isMustTake && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded">
                    AVOID
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between w-full mt-1 text-[10px]">
                <span className={isSelected ? 'text-white font-bold' : 'text-gray-300 font-semibold'}>
                  {item.ltp > 0 ? `₹${item.ltp.toFixed(2)}` : 'Live Quote'}
                </span>
                {item.delta !== undefined && (
                  <span className={`text-[9px] ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                    Δ {item.delta > 0 ? '+' : ''}{item.delta.toFixed(2)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
