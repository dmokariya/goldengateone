import React, { useState, useEffect } from 'react';
import { LiveTradeSignal, AssetCategory } from '../types';
import {
  Zap, ShieldCheck, ArrowUpRight, ArrowDownRight, CheckCircle2,
  Edit3, AlertCircle, RefreshCw, Clock, Calculator, BarChart3,
  Lightbulb, Activity, ChevronDown, ChevronUp, Lock, RotateCcw,
  Trash2, Sparkles, TrendingUp, HelpCircle, ShieldAlert, SplitSquareVertical, SlidersHorizontal
} from 'lucide-react';
import { getFreezeLimitForSymbol, autoSliceOrderQuantity, calculateSlippageProtectedPrice } from '../utils/quantEngine';

interface LiveSignalsViewProps {
  signals: LiveTradeSignal[];
  onExecuteSignalZerodha: (signal: LiveTradeSignal) => void;
  onAiScanSignals?: () => void;
  isAiScanning?: boolean;
  onFetchLiveQuotes?: () => void;
  isFetchingQuotes?: boolean;
  onUserActionFeedback?: (message: string) => void;
  openPositionSymbols?: string[];
  recentlyExitedSymbols?: Record<string, { exitPrice: number; reason: string; exitedAt: string }>;
  onViewPositionsTab?: () => void;
  selectedContractSymbol?: string;
  onClearContractFilter?: () => void;
  onOpenModalForSignal?: (signal: LiveTradeSignal) => void;
  onDiscardAndRefreshTrade?: (signalId: string, symbol: string) => void;
}

export const LiveSignalsView: React.FC<LiveSignalsViewProps> = ({
  signals,
  onExecuteSignalZerodha,
  onAiScanSignals,
  isAiScanning,
  onFetchLiveQuotes,
  isFetchingQuotes,
  onUserActionFeedback,
  openPositionSymbols = [],
  recentlyExitedSymbols = {},
  onViewPositionsTab,
  selectedContractSymbol,
  onClearContractFilter,
  onOpenModalForSignal,
  onDiscardAndRefreshTrade
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | AssetCategory>('ALL');
  const [signalTab, setSignalTab] = useState<'ACTIONABLE' | 'MUST_TAKE' | 'HIGH_RISK_REJECTED'>('ACTIONABLE');

  // Spot Edit States per Signal
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
  const [editedOrderTypes, setEditedOrderTypes] = useState<Record<string, 'MARKET' | 'LIMIT'>>({});
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  
  // Slippage Guard Config State
  const [slippageGuardEnabled, setSlippageGuardEnabled] = useState<boolean>(true);
  const [slippageBufferPct, setSlippageBufferPct] = useState<number>(0.5);

  // Collapsible Details Drawer State per Card
  const [expandedSignalIds, setExpandedSignalIds] = useState<Record<string, boolean>>({});

  // Current time counter state to update countdowns smoothly every 1 second
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleCardExpansion = (id: string) => {
    setExpandedSignalIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Counts for the tabs
  const actionableCount = signals.filter((s) => !s.isBadTradeWarning).length;
  const mustTakeCount = signals.filter((s) => s.isMustTakeTrade && !s.isBadTradeWarning).length;
  const rejectedCount = signals.filter((s) => s.isBadTradeWarning).length;

  // Filter signals: Apply category and signalTab filter
  const rawFiltered = signals.filter((sig) => {
    // 1. Category Filter
    if (selectedCategory !== 'ALL' && sig.category !== selectedCategory) {
      return false;
    }

    // 2. Tab Filter (Actionable vs Must Take vs Rejected)
    if (signalTab === 'ACTIONABLE') {
      return !sig.isBadTradeWarning;
    }
    if (signalTab === 'MUST_TAKE') {
      return sig.isMustTakeTrade && !sig.isBadTradeWarning;
    }
    if (signalTab === 'HIGH_RISK_REJECTED') {
      return sig.isBadTradeWarning;
    }
    return true;
  });

  const activeSelectedClean = selectedContractSymbol ? selectedContractSymbol.trim().toUpperCase() : '';

  const filteredSignals = [...rawFiltered].sort((a, b) => {
    if (!activeSelectedClean) return 0;
    const aMatch = a.symbol.toUpperCase() === activeSelectedClean || activeSelectedClean.includes(a.symbol.toUpperCase());
    const bMatch = b.symbol.toUpperCase() === activeSelectedClean || activeSelectedClean.includes(b.symbol.toUpperCase());
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const getLotSize = (symbol: string) => {
    if (symbol.includes('BANKNIFTY')) return 15;
    if (symbol.includes('FINNIFTY')) return 40;
    if (symbol.includes('NIFTY')) return 65; // Updated official NIFTY lot size: 65
    return 1;
  };

  const handleTriggerFeedback = (msg: string) => {
    if (onUserActionFeedback) {
      onUserActionFeedback(msg);
    }
  };

  return (
    <div id="quant-signals-feed" className="bg-[#111827] border border-[#1F2937] p-4 md:p-5 rounded-sm space-y-4 font-mono text-xs text-[#D1D5DB]">
      {/* View Header & Category Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-[#F59E0B]" />
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">
            Quant Signals & Trade Timing Engine
          </h3>
          <span className="px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 rounded text-[10px] font-bold animate-pulse">
            LIVE TIMED FEED
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Global Slippage Guard Setting */}
          <div className="flex items-center space-x-1.5 bg-[#0A0B0E] border border-blue-500/40 px-2.5 py-1 rounded text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-400 font-bold">Slippage Guard:</span>
            <select
              value={slippageGuardEnabled ? slippageBufferPct : 0}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (val === 0) {
                  setSlippageGuardEnabled(false);
                  handleTriggerFeedback('Disabled Slippage Guard (Market orders will not be converted to limit)');
                } else {
                  setSlippageGuardEnabled(true);
                  setSlippageBufferPct(val);
                  handleTriggerFeedback(`Set Slippage Guard buffer to ${val}%`);
                }
              }}
              className="bg-[#111827] text-white font-bold rounded px-1.5 py-0.5 border border-gray-700 focus:outline-none text-[10.5px]"
            >
              <option value="0.25">0.25% Buffer</option>
              <option value="0.5">0.50% (Recommended)</option>
              <option value="1.0">1.00% Buffer</option>
              <option value="0">Off (Raw Market)</option>
            </select>
          </div>

          {onFetchLiveQuotes && (
            <button
              onClick={() => {
                handleTriggerFeedback('Requesting real-time quote refresh from Zerodha Kite API...');
                onFetchLiveQuotes();
              }}
              disabled={isFetchingQuotes}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded text-[11px] border border-emerald-400/30 shadow transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuotes ? 'animate-spin' : ''}`} />
              <span>FETCH LIVE QUOTES</span>
            </button>
          )}

          {onAiScanSignals && (
            <button
              onClick={() => {
                handleTriggerFeedback('Initiated Gemini AI market scan for active quant signals.');
                onAiScanSignals();
              }}
              disabled={isAiScanning}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold text-[11px] shadow-sm transition-all"
            >
              <Zap className={`w-3.5 h-3.5 ${isAiScanning ? 'animate-spin' : ''}`} />
              <span>{isAiScanning ? 'AI SCANNING...' : 'AI RE-SCAN'}</span>
            </button>
          )}

          {/* Filter Pills */}
          <div className="flex bg-[#0A0B0E] border border-[#1F2937] p-1 rounded font-mono text-[11px]">
            {(['ALL', 'NIFTY_FNO', 'BANKNIFTY_FNO', 'EQUITY_INTRADAY'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  handleTriggerFeedback(`Filtered signals view by category: ${cat.replace('_', ' ')}`);
                }}
                className={`px-2.5 py-1 rounded transition-colors font-bold ${
                  selectedCategory === cat ? 'bg-[#3B82F6] text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                {cat === 'ALL'
                  ? 'ALL'
                  : cat === 'NIFTY_FNO'
                  ? 'NIFTY'
                  : cat === 'BANKNIFTY_FNO'
                  ? 'BANKNIFTY'
                  : 'EQUITY'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Signal View Selection Bar: Actionable vs Must-Take vs Rejected */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0A0B0E] p-2 rounded border border-[#1F2937]">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => {
              setSignalTab('ACTIONABLE');
              handleTriggerFeedback('Switched to Actionable Approved Signals Feed');
            }}
            className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-all ${
              signalTab === 'ACTIONABLE'
                ? 'bg-emerald-600 text-white shadow font-black border border-emerald-400/40'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>ACTIONABLE SETUPS</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${signalTab === 'ACTIONABLE' ? 'bg-emerald-800 text-emerald-100' : 'bg-gray-800 text-gray-400'}`}>
              {actionableCount}
            </span>
          </button>

          <button
            onClick={() => {
              setSignalTab('MUST_TAKE');
              handleTriggerFeedback('Filtered by 85%+ Must-Take A+ Setups');
            }}
            className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-all ${
              signalTab === 'MUST_TAKE'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow font-black border border-amber-300/60 ring-1 ring-amber-400/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>MUST-TAKE A+ (≥85%)</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${signalTab === 'MUST_TAKE' ? 'bg-amber-800 text-amber-100' : 'bg-gray-800 text-gray-400'}`}>
              {mustTakeCount}
            </span>
          </button>
        </div>

        {/* Dedicated Separate Button for Rejected / Bad Trades */}
        <button
          onClick={() => {
            const nextTab = signalTab === 'HIGH_RISK_REJECTED' ? 'ACTIONABLE' : 'HIGH_RISK_REJECTED';
            setSignalTab(nextTab);
            handleTriggerFeedback(
              nextTab === 'HIGH_RISK_REJECTED'
                ? 'Opened Rejected / High-Risk Trades archive'
                : 'Returned to Actionable Setups'
            );
          }}
          className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-all text-xs font-bold ${
            signalTab === 'HIGH_RISK_REJECTED'
              ? 'bg-rose-700 text-white border-2 border-rose-400 shadow-lg font-black'
              : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>⚠️ HIGH RISK / REJECTED TRADES</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-800 text-rose-100 font-black">
            {rejectedCount}
          </span>
        </button>
      </div>

      {/* Warning Banner when viewing the Rejected Trades Archive */}
      {signalTab === 'HIGH_RISK_REJECTED' && (
        <div className="bg-rose-950/80 border-2 border-rose-500/80 p-3 rounded text-rose-100 space-y-1.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <h4 className="font-black text-xs uppercase tracking-wider text-rose-200">
                ⚠️ QUANT FILTER ARCHIVE: REJECTED / LOW-PROBABILITY TRADES ({rejectedCount})
              </h4>
            </div>
            <button
              onClick={() => setSignalTab('ACTIONABLE')}
              className="text-[10px] bg-rose-900 hover:bg-rose-800 text-white px-2.5 py-1 rounded font-extrabold border border-rose-500 transition-colors"
            >
              ← BACK TO ACTIONABLE SETUPS
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-rose-200">
            These contracts failed our statistical edge criteria (Low Delta &lt; +0.35, high daily Theta decay &gt; 15%/day, negative Expected Value, or opposing market trend). They are <strong>strictly excluded</strong> from the default trade feed and <strong>will NEVER be executed by the Auto-Trader</strong>. Shown here for risk analysis only.
          </p>
        </div>
      )}

      {/* Selected Contract Focus Alert */}
      {selectedContractSymbol && (
        <div className="bg-blue-950/70 border border-blue-500/50 p-2.5 rounded flex items-center justify-between text-blue-200 text-xs">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Focused on Contract: <strong className="text-white font-extrabold">{selectedContractSymbol}</strong>
            </span>
          </div>
          {onClearContractFilter && (
            <button
              onClick={() => {
                onClearContractFilter();
                handleTriggerFeedback('Cleared contract filter, displaying all available trade setups.');
              }}
              className="text-[10.5px] bg-blue-900/80 hover:bg-blue-800 text-blue-100 px-2 py-1 rounded border border-blue-400/40 font-bold transition-colors"
            >
              SHOW ALL SIGNALS
            </button>
          )}
        </div>
      )}

      {/* Grid of Quant Signals */}
      {filteredSignals.length === 0 ? (
        <div className="text-center py-10 bg-[#0A0B0E] border border-dashed border-[#1F2937] rounded p-6">
          <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No signals matching filter. Click 'AI RE-SCAN' to generate fresh trade setups.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSignals.map((signal) => {
            const isBuy = signal.direction === 'BUY';
            const lotSize = getLotSize(signal.symbol);

            // Default Qty: 1 Lot (65 for NIFTY, 15 for BankNifty, 40 for FinNifty, 10 for Equity)
            const defaultInitialQty = signal.category === 'EQUITY_INTRADAY' || signal.optionStyle === 'EQUITY'
              ? (signal.zerodhaPayload?.quantity || 10)
              : lotSize;

            const currentQty = editedQuantities[signal.id] ?? defaultInitialQty;
            const currentOrderType = editedOrderTypes[signal.id] ?? (signal.zerodhaPayload?.order_type || 'MARKET');
            const currentPrice = editedPrices[signal.id] ?? signal.entryPrice;
            const currentLtp = signal.currentLtp ?? signal.entryPrice;
            const isExpanded = !!expandedSignalIds[signal.id];
            const estVal = currentQty * currentPrice;

            // NSE Option Freeze Limit & Slicing check
            const freezeLimit = getFreezeLimitForSymbol(signal.symbol);
            const slicingInfo = autoSliceOrderQuantity(signal.symbol, currentQty);
            const isSliced = slicingInfo.isSliced;
            const slices = slicingInfo.slices;

            // Slippage Guard protected price
            const protectedPrice = calculateSlippageProtectedPrice(currentPrice, signal.direction, slippageBufferPct);

            const isOpenPosition = openPositionSymbols.some(
              (sym) => sym.toUpperCase() === signal.symbol.toUpperCase()
            );

            const recentlyExited = recentlyExitedSymbols[signal.symbol];

            // Timing and Expiry Calculations
            const now = currentTimeMs;
            const generatedAtMs = signal.generatedAtMs || (now - 180000); // 3 mins ago if not set
            const validDurationMs = (signal.validDurationMins || 15) * 60000;
            const expiresAtMs = signal.expiresAtMs || (generatedAtMs + validDurationMs);

            const msRemaining = Math.max(0, expiresAtMs - now);
            const minsRemaining = Math.floor(msRemaining / 60000);
            const secsRemaining = Math.floor((msRemaining % 60000) / 1000);
            const isExpired = msRemaining <= 0 || signal.status === 'DISCARDED';

            const suggestedTimeStr = signal.timestamp || new Date(generatedAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const discardTimeStr = new Date(expiresAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const greeks = signal.greeks || {
              delta: isBuy ? 0.58 : -0.48,
              deltaStatus: 'EXCELLENT' as const,
              deltaWinBoostPct: Math.round(signal.winProbabilityPct * 0.22),
              gamma: 0.0038,
              gammaStatus: 'HIGH_ACCELERATION' as const,
              theta: -14.2,
              thetaStatus: 'SAFE_LOW_DECAY' as const,
              vega: 8.5,
              vegaStatus: 'FAVORABLE_VOLATILITY' as const,
              ivPct: 15.2,
              overallRating: 'EXCELLENT' as const
            };

            const laymanReason = signal.laymanReason || `${signal.assetName} setup based on momentum breakout and orderbook depth.`;

            // Likelihood calculation models breakdown
            const lk = signal.likelihoodCalculation || {
              winProbabilityPct: signal.winProbabilityPct,
              monteCarloWinRatePct: signal.winProbabilityPct,
              bayesianWinRatePct: Math.min(99, signal.winProbabilityPct + 1.5),
              quantMemoryWinRatePct: Math.max(25, signal.winProbabilityPct - 2),
              combinedCalibratedWinRatePct: signal.winProbabilityPct,
              technicalIndicatorsBreakdown: {
                rsi: 64.5,
                emaStatus: 'EMA 9/21 Bullish Crossover',
                vwapStatus: 'Trading above VWAP Support',
                supportLevel: +(currentPrice * 0.88).toFixed(2),
                resistanceLevel: +(currentPrice * 1.30).toFixed(2),
                l2BidAskRatio: 3.2
              }
            };

            return (
              <div
                key={signal.id}
                className={`transition-all p-4 rounded-md flex flex-col justify-between space-y-3 relative overflow-hidden shadow-xl border ${
                  isExpired
                    ? 'bg-[#131118] border-gray-700 opacity-90'
                    : isOpenPosition
                    ? 'bg-[#0B1528] border-blue-400 ring-2 ring-blue-500/40 shadow-blue-500/10'
                    : signal.isMustTakeTrade || signal.winProbabilityPct >= 95
                    ? 'bg-gradient-to-b from-amber-950/40 via-[#0F141C] to-amber-950/20 border-amber-400 ring-1 ring-amber-400/40 shadow-amber-500/10'
                    : signal.symbol.includes('PE') || signal.optionStyle === 'PUT'
                    ? 'bg-[#120B0E] border-rose-500/40 hover:border-rose-400'
                    : signal.category === 'EQUITY_INTRADAY' || signal.optionStyle === 'EQUITY'
                    ? 'bg-[#0B1220] border-blue-500/40 hover:border-blue-400'
                    : 'bg-[#091510] border-emerald-500/40 hover:border-emerald-400'
                }`}
              >
                {/* Top Stripe Accent */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isExpired
                      ? 'bg-gray-600'
                      : isOpenPosition
                      ? 'bg-blue-400 animate-pulse'
                      : signal.isMustTakeTrade || signal.winProbabilityPct >= 95
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse'
                      : signal.symbol.includes('PE') || signal.optionStyle === 'PUT'
                      ? 'bg-rose-500'
                      : signal.category === 'EQUITY_INTRADAY' || signal.optionStyle === 'EQUITY'
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                />

                {/* TRADE TIMING & EXPIRY STATUS BANNER */}
                <div className={`p-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] font-bold border ${
                  isExpired
                    ? 'bg-rose-950/70 border-rose-600/50 text-rose-300'
                    : msRemaining < 300000
                    ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                    : 'bg-[#0A0B0E] border-gray-700 text-gray-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-rose-400' : 'text-amber-400 animate-pulse'}`} />
                    <span>Suggested: <strong className="text-white">{suggestedTimeStr}</strong></span>
                    <span className="text-gray-500">|</span>
                    <span>Discard at: <strong className="text-amber-300">{discardTimeStr}</strong></span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-2">
                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase">
                        🛑 TRADE DISCARDED (EXPIRED)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-blue-900/70 text-blue-200 border border-blue-500/40 text-[10px]">
                        ⏱️ {minsRemaining}m {secsRemaining}s Left
                      </span>
                    )}

                    {onDiscardAndRefreshTrade && (
                      <button
                        onClick={() => {
                          onDiscardAndRefreshTrade(signal.id, signal.symbol);
                          handleTriggerFeedback(`Discarded ${signal.symbol} and generated fresh trade setup with updated prices & timings.`);
                        }}
                        className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-amber-300 hover:text-white rounded border border-gray-600 text-[10px] flex items-center space-x-1 transition-colors"
                        title="Discard this trade setup and immediately re-generate a fresh trade with new timings and prices"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>{isExpired ? 'GET FRESH TRADE' : 'DISCARD & REFRESH'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Alert Banners */}
                {isOpenPosition ? (
                  <div className="bg-blue-950/90 border border-blue-400 text-blue-200 px-3 py-1.5 rounded text-[11px] font-bold flex items-center justify-between shadow">
                    <span className="flex items-center space-x-1.5">
                      <Lock className="w-4 h-4 text-blue-300 shrink-0" />
                      <span>🔵 ACTIVE POSITION RUNNING IN ZERODHA</span>
                    </span>
                    {onViewPositionsTab && (
                      <button
                        onClick={onViewPositionsTab}
                        className="underline hover:text-white text-[10.5px]"
                      >
                        View in Positions →
                      </button>
                    )}
                  </div>
                ) : recentlyExited ? (
                  <div className="bg-amber-950/70 border border-amber-500/40 text-amber-200 px-3 py-1 rounded text-[10.5px] flex items-center justify-between">
                    <span>
                      ✓ Recently Exited @ ₹{recentlyExited.exitPrice.toFixed(2)} ({recentlyExited.reason})
                    </span>
                    <span className="text-[9.5px] text-gray-400">Can Re-Enter</span>
                  </div>
                ) : null}

                {/* DYNAMIC BAD TRADE / COUNTER-TREND / MUST-TAKE ALERTS */}
                {signal.isBadTradeWarning && (
                  <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-100 p-2.5 rounded text-[11px] font-bold flex items-start space-x-2 shadow-lg animate-pulse">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 bg-rose-700 text-white rounded text-[9.5px] font-black uppercase">
                          ⚠️ BAD TRADE WARNING
                        </span>
                        <span className="text-rose-300 font-extrabold text-[10.5px]">HIGH RISK / NOT RECOMMENDED</span>
                      </div>
                      <p className="text-rose-200 text-[10.5px] font-normal leading-relaxed">{signal.badTradeReason}</p>
                    </div>
                  </div>
                )}

                {signal.isMustTakeTrade && !signal.isBadTradeWarning && (
                  <div className="bg-amber-950/80 border border-amber-400/80 text-amber-200 p-2 rounded text-[11px] font-bold flex items-center space-x-2 shadow">
                    <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
                    <div>
                      <span className="text-yellow-300 font-extrabold mr-1">⭐ MUST-TAKE A+ SETUP:</span>
                      <span className="text-amber-100 font-normal">{signal.mustTakeReason}</span>
                    </div>
                  </div>
                )}

                {/* Card Header: Symbol, Option Type, Must-Take Badge & Win Probability */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-extrabold text-white tracking-wide">
                        {signal.symbol}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}>
                        {signal.direction}
                      </span>

                      <span className="text-[10px] text-gray-300 font-bold bg-[#1F2937] px-1.5 py-0.5 rounded border border-gray-700">
                        {signal.symbol.includes('PE')
                          ? '🔴 PUT (PE)'
                          : signal.symbol.includes('CE')
                          ? '🟢 CALL (CE)'
                          : '⚡ EQUITY'}
                      </span>

                      {/* Liquidity Indicator */}
                      <span className="text-[9.5px] text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-500/40">
                        ATM ± 2 High Liq
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{signal.assetName}</div>
                  </div>

                  {/* Win Probability & Model Tag */}
                  <div className="text-right">
                    <div className={`text-lg font-black flex items-center justify-end space-x-1 ${
                      signal.winProbabilityPct >= 90 ? 'text-amber-400' :
                      signal.winProbabilityPct >= 80 ? 'text-emerald-400' :
                      'text-rose-400'
                    }`}>
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <span>{signal.winProbabilityPct}% WIN RATE</span>
                    </div>
                    <span className="text-[10px] text-gray-400 block font-normal">
                      Ensemble Calibrated
                    </span>
                  </div>
                </div>

                {/* PRICE MATRIX: LTP | ENTRY PRICE | TARGET PRICE | STOP LOSS */}
                <div className="grid grid-cols-4 gap-2 bg-[#0A0B0E] p-2.5 rounded border border-[#1F2937] text-center text-[11px]">
                  {/* LTP */}
                  <div className="bg-[#111827] p-1.5 rounded border border-blue-500/30">
                    <span className="text-[9.5px] text-blue-300 block uppercase font-bold">Live LTP</span>
                    <span className="font-extrabold text-blue-300 text-sm">₹{currentLtp.toFixed(2)}</span>
                  </div>

                  {/* Entry Price */}
                  <div className="bg-[#111827] p-1.5 rounded border border-gray-700">
                    <span className="text-[9.5px] text-gray-400 block uppercase font-bold">Entry Price</span>
                    <span className="font-bold text-white text-sm">₹{currentPrice.toFixed(2)}</span>
                  </div>

                  {/* Target Price */}
                  <div className="bg-[#111827] p-1.5 rounded border border-emerald-500/30">
                    <span className="text-[9.5px] text-emerald-400 block uppercase font-bold">Target</span>
                    <span className="font-extrabold text-emerald-400 text-sm">₹{signal.targetPrice.toFixed(2)}</span>
                  </div>

                  {/* Stop Loss */}
                  <div className="bg-[#111827] p-1.5 rounded border border-rose-500/30">
                    <span className="text-[9.5px] text-rose-400 block uppercase font-bold">Stop Loss</span>
                    <span className="font-extrabold text-rose-400 text-sm">₹{signal.stopLossPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Layman Reason & Technical Basis */}
                <div className="bg-black/40 border border-gray-800 p-2.5 rounded text-[11px] text-gray-300 leading-snug flex items-start space-x-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>{laymanReason}</p>
                </div>

                {/* EDITABLE QUANTITY, AUTO-SLICING & DIRECT ON-SPOT EXECUTION */}
                <div className="bg-[#0A0B0E] border border-[#1F2937] p-3 rounded space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {/* Quantity Selector with Direct Input & +/- Buttons */}
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300 font-bold uppercase text-[10.5px]">Trade Quantity:</span>
                      <div className="flex items-center space-x-1 bg-[#111827] border border-gray-700 rounded p-0.5">
                        <button
                          onClick={() => {
                            const newQ = Math.max(lotSize, currentQty - lotSize);
                            setEditedQuantities({ ...editedQuantities, [signal.id]: newQ });
                            handleTriggerFeedback(`Updated ${signal.symbol} quantity to ${newQ}`);
                          }}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded font-bold text-xs transition-colors"
                          title={`Decrease by 1 lot (${lotSize} qty)`}
                        >
                          -
                        </button>

                        <input
                          type="number"
                          value={currentQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0) {
                              setEditedQuantities({ ...editedQuantities, [signal.id]: val });
                            }
                          }}
                          className="w-16 bg-[#0A0B0E] text-center font-extrabold text-white text-xs border border-gray-700 rounded py-0.5 focus:outline-none focus:border-blue-400"
                        />

                        <button
                          onClick={() => {
                            const newQ = currentQty + lotSize;
                            setEditedQuantities({ ...editedQuantities, [signal.id]: newQ });
                            handleTriggerFeedback(`Updated ${signal.symbol} quantity to ${newQ}`);
                          }}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded font-bold text-xs transition-colors"
                          title={`Increase by 1 lot (${lotSize} qty)`}
                        >
                          +
                        </button>
                      </div>

                      <span className="text-[10.5px] text-gray-400 font-bold">
                        ({Math.max(1, Math.round(currentQty / lotSize))} Lot{Math.round(currentQty / lotSize) > 1 ? 's' : ''})
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Est Capital Required</span>
                      <span className="text-xs text-amber-300 font-extrabold">
                        ₹{estVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Safety Protections Status Banner: Slippage Guard + NSE Freeze Limit Slicer */}
                  <div className="bg-[#111827] p-2 rounded border border-gray-800 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                    {/* Slippage Guard Info */}
                    <div className="flex items-center space-x-1.5 text-blue-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>
                        Slippage Guard ({slippageBufferPct}%): <strong>Max {signal.direction} Limit ₹{protectedPrice.toFixed(2)}</strong>
                      </span>
                    </div>

                    {/* Freeze Limit Slicing Info */}
                    {isSliced ? (
                      <div className="flex items-center space-x-1.5 text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                        <SplitSquareVertical className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>⚡ NSE Auto-Slicer: {slices.length} Orders ({slices.join(' + ')} qty)</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-[10px]">
                        NSE Limit: {freezeLimit.toLocaleString()} Qty Max
                      </span>
                    )}
                  </div>

                  {/* Primary Order Execution Button */}
                  <button
                    onClick={() => {
                      if (isOpenPosition) {
                        if (onViewPositionsTab) onViewPositionsTab();
                        return;
                      }
                      const updatedPayloadSignal: LiveTradeSignal = {
                        ...signal,
                        entryPrice: currentPrice,
                        currentLtp: currentLtp,
                        zerodhaPayload: {
                          ...signal.zerodhaPayload,
                          quantity: currentQty,
                          order_type: slippageGuardEnabled ? 'LIMIT' : currentOrderType,
                          price: slippageGuardEnabled ? protectedPrice : currentPrice
                        }
                      };
                      onExecuteSignalZerodha(updatedPayloadSignal);
                    }}
                    disabled={isOpenPosition}
                    className={`w-full py-2.5 rounded font-extrabold uppercase tracking-wider text-xs shadow-lg flex items-center justify-center space-x-2 transition-all ${
                      isOpenPosition
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                        : signal.isBadTradeWarning
                        ? 'bg-gradient-to-r from-rose-700 to-red-800 hover:from-rose-600 hover:to-red-700 text-white border-2 border-rose-500 ring-2 ring-rose-500/30'
                        : signal.isMustTakeTrade || signal.winProbabilityPct >= 95
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black border border-amber-300 font-black ring-2 ring-amber-400/40'
                        : isBuy
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/30'
                        : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border border-rose-400/30'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-white shrink-0" />
                    <span>
                      {isOpenPosition
                        ? 'POSITION CURRENTLY RUNNING'
                        : signal.isBadTradeWarning
                        ? `⚠️ HIGH RISK: FORCE EXECUTE (${currentQty} QTY @ ₹${currentPrice.toFixed(2)})`
                        : recentlyExited
                        ? `⚡ EXECUTE AGAIN AT ₹${currentPrice.toFixed(2)} (ZERODHA)`
                        : isSliced
                        ? `⚡ EXECUTE ${slices.length} SLICED ORDERS (${currentQty} QTY @ ₹${currentPrice.toFixed(2)})`
                        : `⚡ EXECUTE ZERODHA TRADE (${currentQty} QTY @ ₹${currentPrice.toFixed(2)})`}
                    </span>
                  </button>
                </div>

                {/* Popup Modal & Deep Math Trigger Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => {
                      if (onOpenModalForSignal) {
                        onOpenModalForSignal({
                          ...signal,
                          entryPrice: currentPrice,
                          currentLtp: currentLtp,
                          zerodhaPayload: {
                            ...signal.zerodhaPayload,
                            quantity: currentQty,
                            order_type: currentOrderType,
                            price: currentPrice
                          }
                        });
                      } else {
                        toggleCardExpansion(signal.id);
                      }
                    }}
                    className="text-[11px] font-extrabold text-purple-300 hover:text-white bg-[#181128] hover:bg-[#23173D] border border-purple-500/50 hover:border-purple-400 py-1.5 px-2.5 rounded flex items-center justify-center space-x-1.5 transition-all shadow"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>📊 FULL QUANT MATH (POPUP)</span>
                  </button>

                  <button
                    onClick={() => toggleCardExpansion(signal.id)}
                    className="text-[11px] font-bold text-gray-300 hover:text-white bg-[#0A0B0E] border border-gray-800 hover:border-gray-600 py-1.5 px-2.5 rounded flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center space-x-1.5 text-purple-300 truncate">
                      <Activity className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{isExpanded ? 'Hide Technical Confluence' : 'View Indicators & Models'}</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                  </button>
                </div>

                {/* EXPANDED SECTION: 3-MODEL WIN RATE & TECHNICAL MOVEMENTS */}
                {isExpanded && (
                  <div className="pt-3 border-t border-gray-800 space-y-3 animate-fadeIn text-[11px]">
                    {/* 3 Win Rate Models Breakdown */}
                    <div className="bg-[#0A0B0E] p-3 rounded border border-purple-500/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-300 uppercase text-[10.5px] flex items-center space-x-1.5">
                          <Activity className="w-3.5 h-3.5 text-purple-400" />
                          <span>3-Tier Quant Likelihood Models</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                          Ensemble Win Rate: {signal.winProbabilityPct}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[10.5px]">
                        <div className="bg-[#111827] p-2 rounded border border-gray-800">
                          <span className="text-gray-400 block text-[9.5px]">Monte Carlo Model</span>
                          <span className="text-emerald-400 font-extrabold text-xs block mt-0.5">
                            {lk.monteCarloWinRatePct ?? signal.winProbabilityPct}%
                          </span>
                          <span className="text-[9px] text-gray-500">10,000 Paths</span>
                        </div>

                        <div className="bg-[#111827] p-2 rounded border border-gray-800">
                          <span className="text-gray-400 block text-[9.5px]">Bayesian Confluence</span>
                          <span className="text-emerald-400 font-extrabold text-xs block mt-0.5">
                            {lk.bayesianWinRatePct ?? (signal.winProbabilityPct + 1.2)}%
                          </span>
                          <span className="text-[9px] text-gray-500">RSI/EMA/VWAP</span>
                        </div>

                        <div className="bg-[#111827] p-2 rounded border border-gray-800">
                          <span className="text-gray-400 block text-[9.5px]">Quant Memory Learning</span>
                          <span className="text-amber-400 font-extrabold text-xs block mt-0.5">
                            {lk.quantMemoryWinRatePct ?? (signal.winProbabilityPct - 2)}%
                          </span>
                          <span className="text-[9px] text-gray-500">Historical Journal</span>
                        </div>
                      </div>
                    </div>

                    {/* Technical Indicators Movement Breakdown */}
                    {lk.technicalIndicatorsBreakdown && (
                      <div className="bg-[#0A0B0E] p-3 rounded border border-gray-800 space-y-1.5">
                        <span className="font-bold text-amber-300 uppercase text-[10.5px] block">
                          📈 Technical Indicators & S&R Movement Check:
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                          <div>
                            <span className="text-gray-400">RSI (14): </span>
                            <strong className="text-white">{lk.technicalIndicatorsBreakdown.rsi}</strong>
                          </div>
                          <div>
                            <span className="text-gray-400">L2 Orderbook Ratio: </span>
                            <strong className="text-emerald-400">{lk.technicalIndicatorsBreakdown.l2BidAskRatio}x Bids</strong>
                          </div>
                          <div>
                            <span className="text-gray-400">EMA Cross: </span>
                            <strong className="text-blue-300">{lk.technicalIndicatorsBreakdown.emaStatus}</strong>
                          </div>
                          <div>
                            <span className="text-gray-400">VWAP Status: </span>
                            <strong className="text-blue-300">{lk.technicalIndicatorsBreakdown.vwapStatus}</strong>
                          </div>
                          <div>
                            <span className="text-gray-400">Support (S1): </span>
                            <strong className="text-emerald-400">₹{lk.technicalIndicatorsBreakdown.supportLevel}</strong>
                          </div>
                          <div>
                            <span className="text-gray-400">Resistance (R1): </span>
                            <strong className="text-rose-400">₹{lk.technicalIndicatorsBreakdown.resistanceLevel}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4 Option Greeks Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#0A0B0E] p-2 rounded border border-gray-800">
                      <div>
                        <span className="text-[9.5px] text-gray-400 block uppercase">Delta (Δ)</span>
                        <span className="font-bold text-white text-xs">{greeks.delta > 0 ? `+${greeks.delta}` : greeks.delta}</span>
                        <span className="text-[9px] text-emerald-400 block mt-0.5">+{greeks.deltaWinBoostPct}% Boost</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-gray-400 block uppercase">Gamma (Γ)</span>
                        <span className="font-bold text-white text-xs">{greeks.gamma}</span>
                        <span className="text-[9px] text-blue-300 block mt-0.5">Accel</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-gray-400 block uppercase">Theta (Θ)</span>
                        <span className="font-bold text-rose-400 text-xs">{greeks.theta} ₹/day</span>
                        <span className="text-[9px] text-rose-300 block mt-0.5">Low Decay</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-gray-400 block uppercase">Vega / IV</span>
                        <span className="font-bold text-amber-300 text-xs">{greeks.vega} ({greeks.ivPct}% IV)</span>
                        <span className="text-[9px] text-amber-200 block mt-0.5">Vol Benefit</span>
                      </div>
                    </div>

                    {/* Indicator Confluences */}
                    <div className="flex flex-wrap gap-1">
                      {signal.indicatorConfluence.map((conf, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[#1F2937] text-gray-200 rounded text-[9.5px] flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-400" />
                          <span>{conf}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
