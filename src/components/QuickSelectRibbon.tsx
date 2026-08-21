import React, { useState, useEffect, useMemo } from 'react';
import { Zap, ChevronRight, Layers, TrendingUp, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, BarChart2, Radio } from 'lucide-react';
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

  const hasLiveNiftySpot = !!(spotIndices['NIFTY 50'] || spotIndices['NIFTY']);
  const hasLiveBankNiftySpot = !!(spotIndices['NIFTY BANK'] || spotIndices['BANKNIFTY']);

  const niftySpot = spotIndices['NIFTY 50'] || spotIndices['NIFTY'] || DEFAULT_UNDERLYING_SPOTS.NIFTY;
  const bankNiftySpot = spotIndices['NIFTY BANK'] || spotIndices['BANKNIFTY'] || DEFAULT_UNDERLYING_SPOTS.BANKNIFTY;

  // Track last centered anchor spot to detect > 0.3% spot moves
  const [lastCenteredNiftySpot, setLastCenteredNiftySpot] = useState<number>(niftySpot);
  const [lastCenteredBankNiftySpot, setLastCenteredBankNiftySpot] = useState<number>(bankNiftySpot);
  const [recenteredBanner, setRecenteredBanner] = useState<string | null>(null);

  // Auto-refresh / recenter ATM ladder when spot moves > 0.3%
  useEffect(() => {
    if (lastCenteredNiftySpot > 0) {
      const movePct = Math.abs(niftySpot - lastCenteredNiftySpot) / lastCenteredNiftySpot;
      if (movePct >= 0.003) {
        setLastCenteredNiftySpot(niftySpot);
        const atm = calculateDynamicAtmStrike('NIFTY', niftySpot).atmStrike;
        setRecenteredBanner(`NIFTY moved ${(movePct * 100).toFixed(2)}% → ATM Auto-Centered to ${atm}`);
        setTimeout(() => setRecenteredBanner(null), 4000);
      }
    }
  }, [niftySpot, lastCenteredNiftySpot]);

  useEffect(() => {
    if (lastCenteredBankNiftySpot > 0) {
      const movePct = Math.abs(bankNiftySpot - lastCenteredBankNiftySpot) / lastCenteredBankNiftySpot;
      if (movePct >= 0.003) {
        setLastCenteredBankNiftySpot(bankNiftySpot);
        const atm = calculateDynamicAtmStrike('BANKNIFTY', bankNiftySpot).atmStrike;
        setRecenteredBanner(`BANKNIFTY moved ${(movePct * 100).toFixed(2)}% → ATM Auto-Centered to ${atm}`);
        setTimeout(() => setRecenteredBanner(null), 4000);
      }
    }
  }, [bankNiftySpot, lastCenteredBankNiftySpot]);

  const niftyExpiry = getNearestWeeklyExpiry('NIFTY');
  const bankNiftyExpiry = getNearestWeeklyExpiry('BANKNIFTY');

  const niftyAtm = calculateDynamicAtmStrike('NIFTY', niftySpot).atmStrike;
  const bankNiftyAtm = calculateDynamicAtmStrike('BANKNIFTY', bankNiftySpot).atmStrike;

  // Build dynamic ladder for NIFTY (ATM-100 to ATM+100)
  const niftyItems = useMemo(() => {
    return [
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
      const ltp = quote?.lastPrice ?? signal?.currentLtp ?? 0;
      const oi = quote?.oi || 0;
      const depth = quote?.depth;
      const totalBuyQty = depth?.buy?.reduce((acc: number, d: any) => acc + (d.quantity || 0), 0) || 0;
      const totalSellQty = depth?.sell?.reduce((acc: number, d: any) => acc + (d.quantity || 0), 0) || 0;

      return {
        sym,
        label: item.label,
        type: item.type,
        moneyness: item.moneyness,
        ltp,
        changePct: quote?.changePct ?? 0,
        oi,
        totalBuyQty,
        totalSellQty,
        hasLiveQuote: ltp > 0,
        signal,
        isMustTake: signal?.isMustTakeTrade,
        isAvoid: signal?.isBadTradeWarning,
        confluenceScore: signal?.goldenGateScore ?? (ltp > 0 ? 74 : 0),
        delta: signal?.greeks?.delta
      };
    });
  }, [niftyAtm, niftyExpiry, liveQuotes, liveSignals]);

  // Build dynamic ladder for BANKNIFTY
  const bankNiftyItems = useMemo(() => {
    return [
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
      const ltp = quote?.lastPrice ?? signal?.currentLtp ?? 0;
      const oi = quote?.oi || 0;
      const depth = quote?.depth;
      const totalBuyQty = depth?.buy?.reduce((acc: number, d: any) => acc + (d.quantity || 0), 0) || 0;
      const totalSellQty = depth?.sell?.reduce((acc: number, d: any) => acc + (d.quantity || 0), 0) || 0;

      return {
        sym,
        label: item.label,
        type: item.type,
        moneyness: item.moneyness,
        ltp,
        changePct: quote?.changePct ?? 0,
        oi,
        totalBuyQty,
        totalSellQty,
        hasLiveQuote: ltp > 0,
        signal,
        isMustTake: signal?.isMustTakeTrade,
        isAvoid: signal?.isBadTradeWarning,
        confluenceScore: signal?.goldenGateScore ?? (ltp > 0 ? 72 : 0),
        delta: signal?.greeks?.delta
      };
    });
  }, [bankNiftyAtm, bankNiftyExpiry, liveQuotes, liveSignals]);

  // Equities list
  const equityItems = useMemo(() => {
    return TOP_LIQUID_EQUITIES.map((eq) => {
      const sym = eq.symbol;
      const quote = liveQuotes[sym] || liveQuotes[`NSE:${sym}`];
      const signal = liveSignals.find((s) => s.symbol.toUpperCase() === sym.toUpperCase());
      const ltp = quote?.lastPrice ?? signal?.currentLtp ?? 0;
      const oi = quote?.oi || 0;
      const depth = quote?.depth;
      const totalBuyQty = depth?.buy?.reduce((acc: number, d: any) => acc + (d.quantity || 0), 0) || 0;
      const totalSellQty = depth?.sell?.reduce((acc: number, d: any) => acc + (d.quantity || 0), 0) || 0;

      return {
        sym,
        label: eq.symbol,
        type: 'EQ' as const,
        moneyness: 'EQUITY',
        ltp,
        changePct: quote?.changePct ?? 0,
        oi,
        totalBuyQty,
        totalSellQty,
        hasLiveQuote: ltp > 0,
        signal,
        isMustTake: signal?.isMustTakeTrade,
        isAvoid: signal?.isBadTradeWarning,
        confluenceScore: signal?.goldenGateScore ?? (ltp > 0 ? 76 : 0),
        delta: 1.0
      };
    });
  }, [liveQuotes, liveSignals]);

  const displayedItems = activeTab === 'NIFTY' ? niftyItems : activeTab === 'BANKNIFTY' ? bankNiftyItems : equityItems;

  return (
    <div className="bg-[#0D1117] border border-amber-500/40 p-2.5 rounded-lg shadow-xl font-mono text-xs space-y-2">
      {/* Ribbon Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-2">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>DYNAMIC STRIKE & ASSET SELECTOR</span>
          </span>
          <span className="bg-amber-400 text-black px-1.5 py-0.5 rounded text-[9px] font-extrabold flex items-center space-x-1">
            <Radio className="w-2.5 h-2.5 animate-ping" />
            <span>AUTO-CENTERED ATM</span>
          </span>
          {recenteredBanner && (
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/40 px-2 py-0.5 rounded text-[9px] animate-pulse">
              {recenteredBanner}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          <div className="flex bg-[#161B22] p-0.5 rounded border border-gray-700 text-[10px]">
            <button
              onClick={() => setActiveTab('NIFTY')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                activeTab === 'NIFTY' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              NIFTY (₹{niftySpot.toFixed(0)}) {!hasLiveNiftySpot && <span className="text-[8px] opacity-70">(Demo Spot)</span>}
            </button>
            <button
              onClick={() => setActiveTab('BANKNIFTY')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                activeTab === 'BANKNIFTY' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              BANKNIFTY (₹{bankNiftySpot.toFixed(0)}) {!hasLiveBankNiftySpot && <span className="text-[8px] opacity-70">(Demo Spot)</span>}
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
          const hasQuote = item.hasLiveQuote;
          const score = item.confluenceScore;

          return (
            <button
              key={item.sym}
              onClick={() => {
                onSelectContract(item.sym);
                if (onTriggerFeedback) {
                  onTriggerFeedback(`Selected: ${item.sym} (${hasQuote ? `LTP: ₹${item.ltp.toFixed(2)}` : 'Quote pending'})`);
                }
              }}
              title={`${item.sym} | GoldenGate Evidence Score: ${score}/100 | ${hasQuote ? `LTP: ₹${item.ltp.toFixed(2)}` : 'Quote pending'}`}
              className={`shrink-0 px-3 py-2 rounded text-[11px] font-mono border transition-all flex flex-col items-start min-w-[145px] text-left relative group ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/60 shadow-lg scale-105 z-10'
                  : isMustTake
                  ? 'bg-emerald-950/80 text-emerald-200 border-emerald-400 shadow-md hover:bg-emerald-900/80'
                  : isAvoid
                  ? 'bg-[#161B22] text-gray-400 border-gray-800 hover:border-gray-700 opacity-80'
                  : item.type === 'PE'
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/60'
                  : item.type === 'CE'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                  : 'bg-blue-950/40 text-blue-300 border-blue-500/40 hover:bg-blue-900/60'
              }`}
            >
              {/* Top Row: Strike / Label & Score Badge */}
              <div className="flex items-center justify-between w-full">
                <span className="font-bold truncate max-w-[90px]">{item.label}</span>
                
                {/* Evidence Score Badge */}
                <span
                  className={`text-[9px] px-1 py-0.5 rounded font-extrabold flex items-center space-x-0.5 ${
                    score >= 75
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50'
                      : score >= 50
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                  <span>{score > 0 ? `${score}` : '--'}</span>
                </span>
              </div>

              {/* Middle Row: LTP / Quote Pending State */}
              <div className="flex items-center justify-between w-full mt-1 text-[10px]">
                <span className={isSelected ? 'text-white font-bold' : hasQuote ? 'text-gray-200 font-semibold' : 'text-amber-400/90 italic font-medium'}>
                  {hasQuote ? `₹${item.ltp.toFixed(2)}` : 'Quote pending'}
                </span>
                {item.delta !== undefined && (
                  <span className={`text-[9px] ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                    Δ {item.delta > 0 ? '+' : ''}{item.delta.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Bottom Row: Depth / OI Indicator or Tags */}
              <div className="flex items-center justify-between w-full mt-1 text-[9px] text-gray-400">
                {item.oi > 0 ? (
                  <span className="text-cyan-300 font-semibold">
                    OI: {(item.oi / 100000).toFixed(1)}L
                  </span>
                ) : item.totalBuyQty > 0 || item.totalSellQty > 0 ? (
                  <span className="text-purple-300">
                    D: {(item.totalBuyQty / 1000).toFixed(0)}k/{(item.totalSellQty / 1000).toFixed(0)}k
                  </span>
                ) : (
                  <span className="text-[8px] uppercase tracking-tight text-gray-400">
                    {item.moneyness}
                  </span>
                )}

                {isMustTake && (
                  <span className="text-[8px] bg-emerald-500 text-black px-1 rounded font-extrabold uppercase">
                    MUST TAKE
                  </span>
                )}
                {isAvoid && !isMustTake && (
                  <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-0.5 rounded">
                    AVOID
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

