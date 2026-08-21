// src/components/EdgeEngineDashboard.tsx
// GoldenGate Selective Evidence-Based Trading Engine & Edge Terminal
// Upgraded Features:
// 1. Regime-to-Strategy Routing & Hurdle Arbitration
// 2. Universe-Wide Percentile Opportunity Ranking (Top-Decile Gated, "PATIENCE / NO TRADES TODAY")
// 3. Volatility-Scaled Position Sizing (ATR, Risk Parity, Fractional Kelly)
// 4. Dynamic Profit-Running & Trailing Exits (1.5R Scale Out, Breakeven Stop + Indian Fee Buffer, Chandelier Trail)
// 5. Trend Persistence & Kaufman Efficiency / Hurst Exponent Meter
// 6. Failed-Breakout & Bull/Bear Trap Radar
// 7. Empirical Setup Matrix (N, Win Rate %, Avg Win R, Avg Loss R, Expectancy E(R), Profit Factor, Max Drawdown)
// 8. Historically Destructive Setups Blacklist
// 9. Walk-Forward Validation Engine (Strict OOS Net EV > 0, WFE >= 60%, Indian Regulatory Taxes & Slippage)

import React, { useState, useEffect, useMemo } from 'react';
import {
  CandleData,
  MultiTimeframeTrend,
  VwapProfile,
  AdxProfile,
  RvolProfile,
  MarketBreadthProfile,
  SupportResistanceStructure,
  AtrVolatilityProfile,
  MomentumAccelerationProfile,
  OptionChainConfirmation,
  EvidenceStackSummary,
  HistoricalMatcherResult,
  WalkForwardValidationReport,
  TimeOfDayBucket,
  HistoricalSetupVector,
  RankedTradeOpportunity,
  DestructiveSetupCondition,
  SetupMatrixRow,
  EvidencePillarItem,
  RealizedEvidenceLog
} from '../types';
import {
  evaluateMultiTimeframeTrend,
  evaluateVwapProfile,
  calculateADX,
  evaluateRvolProfile,
  evaluateAtrProfile,
  evaluateMomentumAcceleration,
  evaluateSupportResistanceStructure,
  evaluateMarketBreadth,
  evaluateOptionChainConfirmation,
  evaluateEvidenceStack
} from '../utils/edgeEngine';
import {
  classifyAndRouteRegime,
  calculateTrendPersistence,
  detectFailedBreakoutTrap,
  calculateRelativeStrength,
  calculateVolatilityScaledPosition,
  calculateDynamicExitPlan,
  rankUniverseOpportunities,
  getSetupCombinationMatrix,
  DESTRUCTIVE_SETUPS_CATALOG
} from '../utils/regimeRouter';
import { matchHistoricalSetups, getRealizedEvidenceLogs, saveRealizedEvidenceLog } from '../utils/historicalMatcher';
import { runWalkForwardValidation } from '../utils/walkForwardEngine';
import { generateDemoCandles } from '../utils/quantEngine';
import { getDynamicTradeableContracts } from '../data/contracts';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  BarChart3,
  Scale,
  Clock,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Award,
  Filter,
  Percent,
  Crosshair,
  Ban,
  DollarSign,
  ArrowRight,
  Flame,
  Database,
  RefreshCw
} from 'lucide-react';

interface EdgeEngineDashboardProps {
  selectedSymbol?: string;
  spotIndices?: Record<string, number>;
  liveQuotes?: Record<string, any>;
  onSelectContract?: (symbol: string) => void;
  onTriggerFeedback?: (message: string, isError?: boolean) => void;
}

export const EdgeEngineDashboard: React.FC<EdgeEngineDashboardProps> = ({
  selectedSymbol = 'NIFTY 24500 CE',
  spotIndices = {},
  liveQuotes = {},
  onSelectContract,
  onTriggerFeedback
}) => {
  const [activeTab, setActiveTab] = useState<'SELECTIVE_RANKING' | 'CONFLUENCE_STACK' | 'HISTORICAL_MATCHER' | 'WALK_FORWARD'>('SELECTIVE_RANKING');
  const [targetSymbol, setTargetSymbol] = useState<string>(selectedSymbol || 'NIFTY');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [isOptionBuy, setIsOptionBuy] = useState<boolean>(true);
  const [accountCapital, setAccountCapital] = useState<number>(100000);
  const [riskBudgetPct, setRiskBudgetPct] = useState<number>(1.0);

  // Time of Day selector
  const [timeBucket, setTimeBucket] = useState<TimeOfDayBucket>('MORNING_TREND');

  // Simulated / Real Candles for current symbol
  const [candles, setCandles] = useState<CandleData[]>(() => generateDemoCandles(targetSymbol, '5m', 120));

  // Computed Edge Profiles
  const [mtf, setMtf] = useState<MultiTimeframeTrend>(() => evaluateMultiTimeframeTrend(candles, candles[candles.length - 1]?.close || 24500));
  const [vwap, setVwap] = useState<VwapProfile>(() => evaluateVwapProfile(candles));
  const [adx, setAdx] = useState<AdxProfile>(() => calculateADX(candles));
  const [rvol, setRvol] = useState<RvolProfile>(() => evaluateRvolProfile(candles));
  const [atr, setAtr] = useState<AtrVolatilityProfile>(() => evaluateAtrProfile(candles));
  const [momentum, setMomentum] = useState<MomentumAccelerationProfile>(() => evaluateMomentumAcceleration(candles));
  const [structure, setStructure] = useState<SupportResistanceStructure>(() => evaluateSupportResistanceStructure(candles, candles[candles.length - 1]?.close || 24500));
  const [breadth, setBreadth] = useState<MarketBreadthProfile>(() => evaluateMarketBreadth(spotIndices, liveQuotes));
  const [optionChain, setOptionChain] = useState<OptionChainConfirmation>(() => evaluateOptionChainConfirmation(candles[candles.length - 1]?.close || 24500, 'NIFTY'));

  // Walk-Forward Validation Report
  const [walkForwardReport, setWalkForwardReport] = useState<WalkForwardValidationReport | null>(null);
  const [isWfRunning, setIsWfRunning] = useState<boolean>(false);
  const [dataProvenance, setDataProvenance] = useState<'ZERODHA_KITE_LIVE' | 'SYNTHETIC_SIMULATED'>('SYNTHETIC_SIMULATED');
  const [isFetchingKiteCandles, setIsFetchingKiteCandles] = useState<boolean>(false);
  const [realizedLogs, setRealizedLogs] = useState<RealizedEvidenceLog[]>(() => getRealizedEvidenceLogs());

  // Function to load real Kite candles if available
  const fetchLiveKiteCandles = async () => {
    setIsFetchingKiteCandles(true);
    try {
      const apiKey = localStorage.getItem('zerodha_api_key') || sessionStorage.getItem('zerodha_api_key');
      const accessToken = localStorage.getItem('zerodha_access_token') || sessionStorage.getItem('zerodha_access_token');
      
      const cleanSym = targetSymbol.includes('BANK') ? 'BANKNIFTY' : targetSymbol.includes('FIN') ? 'FINNIFTY' : targetSymbol.includes('SENSEX') ? 'SENSEX' : 'NIFTY';
      
      if (apiKey && accessToken) {
        const res = await fetch(`/api/zerodha/historical?symbol=${cleanSym}&interval=5minute&apiKey=${apiKey}&accessToken=${accessToken}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.candles) && json.candles.length >= 20) {
            setCandles(json.candles);
            setDataProvenance('ZERODHA_KITE_LIVE');
            if (onTriggerFeedback) onTriggerFeedback(`✓ Successfully loaded ${json.candles.length} live Zerodha Kite 5m candles for ${cleanSym}.`);
            setIsFetchingKiteCandles(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch remote Kite candles, using calibrated empirical model:', e);
    }
    
    // Fallback: Generate calibrated candles
    const fresh = generateDemoCandles(targetSymbol, '5m', 120);
    setCandles(fresh);
    setDataProvenance('SYNTHETIC_SIMULATED');
    setIsFetchingKiteCandles(false);
  };

  // Re-calculate edge engine whenever inputs change
  useEffect(() => {
    fetchLiveKiteCandles();
  }, [targetSymbol, direction, isOptionBuy, timeBucket]);

  // Recalculate indicators whenever candles or inputs change
  useEffect(() => {
    const spot = candles[candles.length - 1]?.close || 24500;
    setMtf(evaluateMultiTimeframeTrend(candles, spot));
    setVwap(evaluateVwapProfile(candles));
    setAdx(calculateADX(candles));
    setRvol(evaluateRvolProfile(candles));
    setAtr(evaluateAtrProfile(candles));
    setMomentum(evaluateMomentumAcceleration(candles));
    setStructure(evaluateSupportResistanceStructure(candles, spot));
    setBreadth(evaluateMarketBreadth(spotIndices, liveQuotes));
    setOptionChain(evaluateOptionChainConfirmation(spot, targetSymbol.includes('BANK') ? 'BANKNIFTY' : 'NIFTY'));
  }, [candles, spotIndices, liveQuotes]);

  const handleRecordTestTradeOutcome = (result: 'WIN' | 'LOSS') => {
    const log: RealizedEvidenceLog = {
      id: `realized-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
      symbol: targetSymbol,
      direction: direction,
      goldenGateScore: evidence.totalConfluenceScore,
      evidencePillarsCount: evidence.passedPillarsCount,
      entryLtp: spotPrice,
      actualFillPrice: +(spotPrice + (direction === 'BUY' ? 0.40 : -0.40)).toFixed(2),
      exitPrice: +(result === 'WIN' ? spotPrice + (atr.atr14 * 1.8) : spotPrice - (atr.atr14 * 1.0)).toFixed(2),
      slippageINR: +(0.40 * positionSizing.totalQuantity).toFixed(2),
      slippagePct: 0.15,
      transactionCostsINR: 58.40,
      realizedPnlINR: +(result === 'WIN' ? 1.8 * atr.atr14 * positionSizing.totalQuantity - 58.40 : -(1.0 * atr.atr14 * positionSizing.totalQuantity + 58.40)).toFixed(2),
      realizedRMultiple: +(result === 'WIN' ? 1.72 : -1.05).toFixed(2),
      result,
      timeOfDay: timeBucket,
      marketRegime: routedStrategy.detectedRegime,
      source: dataProvenance === 'ZERODHA_KITE_LIVE' ? 'ZERODHA_KITE_LIVE' : 'PAPER_SHADOW'
    };
    saveRealizedEvidenceLog(log);
    setRealizedLogs(getRealizedEvidenceLogs());
    if (onTriggerFeedback) onTriggerFeedback(`Logged realized trade: ${result} (${log.realizedRMultiple}R) to empirical journal.`);
  };

  const spotPrice = candles[candles.length - 1]?.close || 24500;

  // 1. Trend Persistence & Hurst Proxy
  const persistence = useMemo(() => calculateTrendPersistence(candles), [candles]);

  // 2. Failed-Breakout Trap Radar
  const trapProfile = useMemo(() => detectFailedBreakoutTrap(candles, structure, vwap), [candles, structure, vwap]);

  // 3. Regime Classification & Strategy Router
  const routedStrategy = useMemo(() => {
    return classifyAndRouteRegime(candles, spotPrice, adx, atr, vwap, persistence, trapProfile, isOptionBuy, direction);
  }, [candles, spotPrice, adx, atr, vwap, persistence, trapProfile, isOptionBuy, direction]);

  // 4. Relative Strength Profile
  const relativeStrength = useMemo(() => {
    return calculateRelativeStrength(targetSymbol, spotPrice, candles, spotIndices, liveQuotes);
  }, [targetSymbol, spotPrice, candles, spotIndices, liveQuotes]);

  // 5. Volatility-Scaled Position Sizing
  const instrumentLotSize = targetSymbol.includes('BANK') ? 15 : targetSymbol.includes('FIN') ? 25 : targetSymbol.includes('SENSEX') ? 10 : targetSymbol.includes('CE') || targetSymbol.includes('PE') ? 65 : 1;
  const stopLossPrice = +(direction === 'BUY' ? spotPrice - atr.suggestedStopDistance : spotPrice + atr.suggestedStopDistance).toFixed(2);
  const positionSizing = useMemo(() => {
    return calculateVolatilityScaledPosition({
      accountCapitalINR: accountCapital,
      riskBudgetPct,
      entryPrice: spotPrice,
      stopLossPrice,
      atr14: atr.atr14,
      instrumentLotSize,
      regimeRiskMultiplier: routedStrategy.riskMultiplier
    });
  }, [accountCapital, riskBudgetPct, spotPrice, stopLossPrice, atr.atr14, instrumentLotSize, routedStrategy.riskMultiplier]);

  // 6. Dynamic Profit-Running & Trailing Exits
  const dynamicExitPlan = useMemo(() => {
    return calculateDynamicExitPlan(spotPrice, stopLossPrice, atr.atr14, direction, isOptionBuy, instrumentLotSize, positionSizing.calculatedLots);
  }, [spotPrice, stopLossPrice, atr.atr14, direction, isOptionBuy, instrumentLotSize, positionSizing.calculatedLots]);

  // 7. Universe-Wide Opportunity Ranking
  const universeContracts = useMemo(() => getDynamicTradeableContracts(spotIndices), [spotIndices]);
  const universeRanking = useMemo(() => {
    return rankUniverseOpportunities(universeContracts, liveQuotes, spotIndices, timeBucket);
  }, [universeContracts, liveQuotes, spotIndices, timeBucket]);

  // 8. 8-Pillar Evidence Stack
  const evidence = useMemo(() => {
    return evaluateEvidenceStack({
      mtf,
      vwap,
      adx,
      rvol,
      structure,
      breadth,
      optionChain,
      timeBucket,
      intendedDirection: direction,
      isOptionBuy
    });
  }, [mtf, vwap, adx, rvol, structure, breadth, optionChain, timeBucket, direction, isOptionBuy]);

  // 9. Historical Setup Matcher
  const candidateVector: HistoricalSetupVector = useMemo(() => ({
    mtfScore: mtf.alignmentScore,
    vwapSlope: vwap.slopeBpsPerBar,
    adx: adx.adx,
    rvol: rvol.rvol,
    breadthScore: breadth.breadthScore,
    pcr: optionChain.pcr,
    timeOfDayBucket: timeBucket,
    dte: 3.5
  }), [mtf, vwap, adx, rvol, breadth, optionChain, timeBucket]);

  const cleanUnderlying = targetSymbol.includes('BANK') ? 'BANKNIFTY' : targetSymbol.includes('FIN') ? 'FINNIFTY' : 'NIFTY';
  const matcherResult = useMemo(() => matchHistoricalSetups(candidateVector, cleanUnderlying), [candidateVector, cleanUnderlying]);

  // 10. Empirical Setup Matrix
  const setupMatrix = useMemo(() => getSetupCombinationMatrix(), []);

  const handleRunWalkForward = () => {
    setIsWfRunning(true);
    setTimeout(() => {
      const cleanSym = targetSymbol.includes('BANK') ? 'BANKNIFTY' : targetSymbol.includes('FIN') ? 'FINNIFTY' : targetSymbol.includes('SENSEX') ? 'SENSEX' : 'NIFTY';
      const rpt = runWalkForwardValidation('GoldenGate Evidence-Based Multi-Pillar Engine', cleanSym, '5m', candles);
      setWalkForwardReport(rpt);
      setIsWfRunning(false);
      if (onTriggerFeedback) {
        onTriggerFeedback(rpt.promotionVerdict, !rpt.isPromotionApproved);
      }
    }, 600);
  };

  return (
    <div id="goldengate-edge-engine" className="bg-[#111827] border border-[#1F2937] p-4 sm:p-5 rounded-sm space-y-5 font-mono text-xs text-[#D1D5DB]">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 flex items-center justify-center text-black font-black text-sm shadow-md">
            <Scale className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                GoldenGate Selective Evidence-Based Trading Engine
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[9.5px] font-bold">
                TOP-DECILE GATED
              </span>
              <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center space-x-1 ${
                dataProvenance === 'ZERODHA_KITE_LIVE'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              }`}>
                <Database className="w-3 h-3" />
                <span>{dataProvenance === 'ZERODHA_KITE_LIVE' ? `LIVE KITE FEED (${candles.length} BARS)` : `EMPIRICAL SIM (${candles.length} BARS)`}</span>
              </span>
              <button
                onClick={fetchLiveKiteCandles}
                disabled={isFetchingKiteCandles}
                title="Sync live candles from Kite"
                className="px-2 py-0.5 bg-[#1F2937] hover:bg-[#374151] rounded text-[9.5px] text-gray-300 font-bold flex items-center space-x-1 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingKiteCandles ? 'animate-spin' : ''}`} />
                <span>{isFetchingKiteCandles ? 'Syncing...' : 'Sync Kite'}</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400">
              Regime-to-Strategy Routing • Volatility Position Sizing • Trend Persistence • Failed-Breakout Radar • Net EV Gating
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-[#0A0B0E] p-1 border border-[#1F2937] rounded overflow-x-auto">
          <button
            onClick={() => setActiveTab('SELECTIVE_RANKING')}
            className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'SELECTIVE_RANKING'
                ? 'bg-amber-500 text-black shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Selective Universe & Regime ({universeRanking.topApprovedOpportunities.length} Approved)</span>
          </button>

          <button
            onClick={() => setActiveTab('CONFLUENCE_STACK')}
            className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'CONFLUENCE_STACK'
                ? 'bg-emerald-500 text-black shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>8-Pillar Confluence ({evidence.passedPillarsCount}/8)</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORICAL_MATCHER')}
            className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'HISTORICAL_MATCHER'
                ? 'bg-purple-500 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Historical Matrix & Blacklist</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('WALK_FORWARD');
              if (!walkForwardReport) handleRunWalkForward();
            }}
            className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
              activeTab === 'WALK_FORWARD'
                ? 'bg-blue-500 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Walk-Forward OOS Gate</span>
          </button>
        </div>
      </div>

      {/* Global Asset & Session Selector Bar */}
      <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[9.5px] text-gray-500 block mb-0.5 font-bold">ASSET SELECTION</label>
            <select
              value={targetSymbol}
              onChange={(e) => setTargetSymbol(e.target.value)}
              className="bg-[#111827] border border-[#1F2937] text-white px-2.5 py-1 rounded text-xs focus:border-amber-400 outline-none"
            >
              <option value="NIFTY">NIFTY 50 (INDEX)</option>
              <option value="BANKNIFTY">BANK NIFTY (INDEX)</option>
              <option value="FINNIFTY">FIN NIFTY (INDEX)</option>
              <option value="RELIANCE">RELIANCE (HEAVYWEIGHT)</option>
              <option value="HDFCBANK">HDFC BANK (HEAVYWEIGHT)</option>
              <option value="INFY">INFOSYS (IT SECTOR)</option>
              <option value="TCS">TCS (IT SECTOR)</option>
            </select>
          </div>

          <div>
            <label className="text-[9.5px] text-gray-500 block mb-0.5 font-bold">DIRECTION</label>
            <div className="flex bg-[#111827] border border-[#1F2937] p-0.5 rounded">
              <button
                onClick={() => setDirection('BUY')}
                className={`px-2.5 py-0.5 rounded text-[10.5px] font-bold ${
                  direction === 'BUY' ? 'bg-emerald-500 text-black' : 'text-gray-400'
                }`}
              >
                BUY / CALL (CE)
              </button>
              <button
                onClick={() => setDirection('SELL')}
                className={`px-2.5 py-0.5 rounded text-[10.5px] font-bold ${
                  direction === 'SELL' ? 'bg-rose-500 text-white' : 'text-gray-400'
                }`}
              >
                SELL / PUT (PE)
              </button>
            </div>
          </div>

          <div>
            <label className="text-[9.5px] text-gray-500 block mb-0.5 font-bold">INSTRUMENT TYPE</label>
            <button
              onClick={() => setIsOptionBuy(!isOptionBuy)}
              className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                isOptionBuy
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/40'
              }`}
            >
              {isOptionBuy ? '⚡ NAKED OPTION BUY' : '📈 CASH / FUTURES INTRADAY'}
            </button>
          </div>

          <div>
            <label className="text-[9.5px] text-gray-500 block mb-0.5 font-bold">SESSION TIME-OF-DAY</label>
            <select
              value={timeBucket}
              onChange={(e) => setTimeBucket(e.target.value as TimeOfDayBucket)}
              className="bg-[#111827] border border-[#1F2937] text-white px-2.5 py-1 rounded text-xs focus:border-amber-400 outline-none"
            >
              <option value="OPENING_DISCOVERY">09:15 - 09:45 (Opening Discovery)</option>
              <option value="MORNING_TREND">09:45 - 11:30 (Prime Morning Trend)</option>
              <option value="MIDDAY_CHOP">11:30 - 13:30 (Midday Theta Chop Zone)</option>
              <option value="AFTERNOON_MOMENTUM">13:30 - 15:15 (Afternoon Institutional Momentum)</option>
              <option value="CLOSING_EOD">15:15 - 15:30 (EOD Square-Off Cutoff)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="text-[9.5px] text-gray-500 block mb-0.5 font-bold">ACCOUNT EQUITY</label>
            <div className="flex items-center bg-[#111827] border border-[#1F2937] px-2 py-0.5 rounded text-white text-xs">
              <span className="text-gray-400 mr-1">₹</span>
              <input
                type="number"
                value={accountCapital}
                onChange={(e) => setAccountCapital(Math.max(10000, Number(e.target.value)))}
                className="w-20 bg-transparent text-white outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[9.5px] text-gray-500 block mb-0.5 font-bold">RISK BUDGET %</label>
            <select
              value={riskBudgetPct}
              onChange={(e) => setRiskBudgetPct(Number(e.target.value))}
              className="bg-[#111827] border border-[#1F2937] text-white px-2 py-1 rounded text-xs outline-none"
            >
              <option value={0.5}>0.5% (Conservative)</option>
              <option value={1.0}>1.0% (Standard Institutional)</option>
              <option value={1.5}>1.5% (Aggressive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SELECTIVE UNIVERSE RANKING, REGIME ROUTING & EXIT ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'SELECTIVE_RANKING' && (
        <div className="space-y-5">
          {/* Top Banner: No-Trades-Today vs Selective Approved Gating */}
          {universeRanking.isNoTradesDay ? (
            <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 rounded text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                    PATIENCE / NO TRADES TODAY — EDGE NOT MET
                  </h4>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    {universeRanking.noTradesReason}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-500 text-black font-extrabold rounded text-xs whitespace-nowrap">
                CAPITAL PRESERVED
              </span>
            </div>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 rounded text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-300 uppercase tracking-wide">
                    TOP-DECILE SELECTIVE APPROVAL ({universeRanking.topApprovedOpportunities.length} QUALIFIED)
                  </h4>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    Only the highest-quality 15th percentile with Net EV &gt; 0 and verified statistical confluence are unlocked for execution.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-emerald-500 text-black font-black text-xs rounded">
                  TOP 15% APPROVED
                </span>
              </div>
            </div>
          )}

          {/* Grid: Regime Router + Trend Persistence + Trap Radar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Regime-to-Strategy Routing Card */}
            <div className="bg-[#0A0B0E] p-4 border border-[#1F2937] rounded space-y-3">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white uppercase text-[11px]">Regime-to-Strategy Router</span>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded text-[9.5px] font-bold">
                  {routedStrategy.regime.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">ROUTED STRATEGY</div>
                <div className="text-xs font-extrabold text-emerald-400 mt-0.5">{routedStrategy.strategyName}</div>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{routedStrategy.strategyDescription}</p>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-[#1F2937]">
                <div className="text-[9.5px] text-gray-500 uppercase font-bold">REQUIRED CONDITIONS HURDLE</div>
                {routedStrategy.requiredConditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-300">{cond.name}</span>
                    <span className={`font-bold ${cond.met ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {cond.currentValue} ({cond.met ? '✓' : '✗'})
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1F2937] text-[10.5px]">
                <span className="text-gray-400">Execution Readiness:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[9.5px] ${
                  routedStrategy.executionReadiness === 'READY_FOR_EXECUTION'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {routedStrategy.executionReadiness.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* 2. Trend Persistence & Hurst Proxy Card */}
            <div className="bg-[#0A0B0E] p-4 border border-[#1F2937] rounded space-y-3">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white uppercase text-[11px]">Trend Persistence (Hurst Proxy)</span>
                </div>
                <span className="text-[10px] font-bold text-cyan-400">
                  {persistence.persistenceScore}/100
                </span>
              </div>

              <div className="space-y-2 text-[10.5px]">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Kaufman Efficiency Ratio (ER):</span>
                  <span className="font-bold text-white">{persistence.kaufmanEfficiencyRatio}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Hurst Exponent Proxy ($H$):</span>
                  <span className={`font-bold ${persistence.hurstProxy >= 0.55 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {persistence.hurstProxy} ({persistence.hurstProxy >= 0.55 ? 'Persistent Trend' : 'Brownian Noise'})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Persistence Regime:</span>
                  <span className="font-bold text-cyan-300">{persistence.persistenceRegime.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Constituent Breadth:</span>
                  <span className="font-bold text-emerald-400">{relativeStrength.constituentBreadthPct}% ({relativeStrength.heavyweightsAboveVwapCount}/5 above VWAP)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Relative Strength vs Nifty:</span>
                  <span className="font-bold text-white">{relativeStrength.rsRatioVsNifty}x ({relativeStrength.rsTrend.replace(/_/g, ' ')})</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 pt-2 border-t border-[#1F2937] leading-relaxed">
                {persistence.summary}
              </p>
            </div>

            {/* 3. Failed-Breakout / Bull & Bear Trap Radar */}
            <div className="bg-[#0A0B0E] p-4 border border-[#1F2937] rounded space-y-3">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <div className="flex items-center space-x-2">
                  <Crosshair className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-white uppercase text-[11px]">Failed-Breakout & Trap Radar</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                  trapProfile.trapDetected ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {trapProfile.trapDetected ? 'TRAP DETECTED' : 'CLEAR STRUCTURE'}
                </span>
              </div>

              <div className="space-y-2 text-[10.5px]">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Trap Type:</span>
                  <span className="font-bold text-white">{trapProfile.trapType.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Swept Pivot Level:</span>
                  <span className="font-bold text-amber-400">{trapProfile.sweptLevelLabel} (₹{trapProfile.sweptLevel})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Rejection Wick %:</span>
                  <span className="font-bold text-white">{trapProfile.rejectionWickPct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Trading Directive:</span>
                  <span className={`font-black ${
                    trapProfile.tradingDirective === 'BLOCK_BREAKOUT_ENTRIES' ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {trapProfile.tradingDirective.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 pt-2 border-t border-[#1F2937] leading-relaxed">
                {trapProfile.explanation}
              </p>
            </div>
          </div>

          {/* Grid: Volatility-Scaled Sizing & Dynamic Profit-Running Exits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Volatility-Scaled Sizing */}
            <div className="bg-[#0A0B0E] p-4 border border-[#1F2937] rounded space-y-3">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white uppercase text-[11px]">Volatility-Scaled Position Sizing</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {positionSizing.calculatedLots} Lots ({positionSizing.calculatedQuantity} Qty)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10.5px]">
                <div className="p-2 bg-[#111827] rounded">
                  <span className="text-gray-400 block text-[9.5px]">Base Risk Capital</span>
                  <span className="font-black text-white text-xs">₹{positionSizing.baseRiskBudgetINR}</span>
                  <span className="text-[9px] text-gray-500 block">({riskBudgetPct}% of ₹{accountCapital.toLocaleString()})</span>
                </div>

                <div className="p-2 bg-[#111827] rounded">
                  <span className="text-gray-400 block text-[9.5px]">Volatility Scale Factor</span>
                  <span className="font-black text-cyan-400 text-xs">{positionSizing.volatilityScaleFactor}x</span>
                  <span className="text-[9px] text-gray-500 block">ATR(14): ₹{atr.atr14} ({atr.atrPct}%)</span>
                </div>

                <div className="p-2 bg-[#111827] rounded">
                  <span className="text-gray-400 block text-[9.5px]">Stop Loss Distance</span>
                  <span className="font-black text-rose-400 text-xs">₹{positionSizing.stopDistanceINR}</span>
                  <span className="text-[9px] text-gray-500 block">({positionSizing.stopDistancePct}% of Spot)</span>
                </div>

                <div className="p-2 bg-[#111827] rounded">
                  <span className="text-gray-400 block text-[9.5px]">Total Capital at Risk</span>
                  <span className="font-black text-amber-400 text-xs">₹{positionSizing.maxDrawdownRiskINR}</span>
                  <span className="text-[9px] text-gray-500 block">Kelly Multiplier: {positionSizing.kellyFractionOptimal}</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 pt-1 border-t border-[#1F2937]">
                {positionSizing.sizingRationale}
              </p>
            </div>

            {/* Dynamic Profit-Running & Trailing Exits */}
            <div className="bg-[#0A0B0E] p-4 border border-[#1F2937] rounded space-y-3">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white uppercase text-[11px]">Dynamic Profit-Running & Trailing Exits</span>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[9.5px] font-bold">
                  MULTI-STAGE SCALE-OUT
                </span>
              </div>

              <div className="space-y-2 text-[10.5px]">
                <div className="flex justify-between items-center p-2 bg-[#111827] rounded">
                  <div>
                    <span className="font-bold text-emerald-400">T1 Partial Scale-Out (50% Qty)</span>
                    <span className="text-[9px] text-gray-400 block">Lock in 1.5R target gains</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-white">₹{dynamicExitPlan.t1TargetPrice}</span>
                    <span className="text-[9.5px] text-emerald-400 block">+{dynamicExitPlan.t1TargetPct}% ({dynamicExitPlan.t1Quantity} qty)</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-2 bg-[#111827] rounded">
                  <div>
                    <span className="font-bold text-cyan-400">Breakeven Stop (+ Cost Buffer)</span>
                    <span className="text-[9px] text-gray-400 block">Move SL upon T1 hit (Includes ₹40+ taxes)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-white">₹{dynamicExitPlan.breakevenStopPrice}</span>
                    <span className="text-[9.5px] text-cyan-400 block">Risk Eliminated</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-2 bg-[#111827] rounded">
                  <div>
                    <span className="font-bold text-amber-400">2x ATR Chandelier Runner (50% Qty)</span>
                    <span className="text-[9px] text-gray-400 block">Ride fat-tail multi-R trend expansion (3.5R)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-white">₹{dynamicExitPlan.runnerTargetPrice}</span>
                    <span className="text-[9.5px] text-amber-400 block">Target: 3.5R ({dynamicExitPlan.runnerQuantity} qty)</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 pt-1 border-t border-[#1F2937]">
                {dynamicExitPlan.exitStrategySummary}
              </p>
            </div>
          </div>

          {/* Universe-Wide Ranked Trade Opportunities Table */}
          <div className="bg-[#0A0B0E] p-4 border border-[#1F2937] rounded space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-2">
              <div>
                <h4 className="font-bold text-white uppercase text-xs">
                  Active Universe Percentile Ranking & Gating ({universeRanking.totalEvaluatedCount} Candidates)
                </h4>
                <p className="text-[10px] text-gray-400">
                  Strict Top-Decile Hurdle: Score ≥ 80, Net EV &gt; 0 after Indian STT/charges, Verified Sample N ≥ 10.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-[10px]">
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-bold">
                  {universeRanking.topApprovedOpportunities.length} Approved
                </span>
                <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded font-bold">
                  {universeRanking.totalEvaluatedCount - universeRanking.topApprovedOpportunities.length} Filtered Out
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#1F2937] text-gray-400 text-[10px]">
                    <th className="pb-2">RANK</th>
                    <th className="pb-2">CONTRACT / ASSET</th>
                    <th className="pb-2">TYPE</th>
                    <th className="pb-2">LTP</th>
                    <th className="pb-2">SCORE</th>
                    <th className="pb-2">HIST. E(R)</th>
                    <th className="pb-2">GROSS EV</th>
                    <th className="pb-2">FEES+SLIPPAGE</th>
                    <th className="pb-2">NET EV (₹)</th>
                    <th className="pb-2">GATING VERDICT</th>
                    <th className="pb-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {universeRanking.rankedOpportunities.slice(0, 12).map((item) => (
                    <tr
                      key={item.symbol}
                      className={`hover:bg-[#111827]/70 transition-colors ${
                        item.isTopPercentileApproved ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          item.rank <= 3 ? 'bg-amber-500 text-black font-black' : 'text-gray-400'
                        }`}>
                          #{item.rank}
                        </span>
                      </td>

                      <td className="py-2.5">
                        <div className="font-extrabold text-white">{item.symbol}</div>
                        <div className="text-[9.5px] text-gray-500">{item.strikeOrProduct}</div>
                      </td>

                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                          item.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {item.direction}
                        </span>
                      </td>

                      <td className="py-2.5 font-bold text-gray-200">
                        ₹{item.currentLtp.toFixed(2)}
                      </td>

                      <td className="py-2.5">
                        <span className={`font-black ${
                          item.compositeEdgeScore >= 80 ? 'text-emerald-400' : item.compositeEdgeScore >= 70 ? 'text-amber-400' : 'text-gray-400'
                        }`}>
                          {item.compositeEdgeScore}/100
                        </span>
                      </td>

                      <td className="py-2.5 font-bold text-cyan-400">
                        +{item.historicalExpectancyR}R
                      </td>

                      <td className="py-2.5 font-bold text-gray-300">
                        ₹{item.grossEvINR.toFixed(2)}
                      </td>

                      <td className="py-2.5 text-rose-400 font-bold">
                        -₹{item.estimatedTransactionCostsINR.toFixed(2)}
                      </td>

                      <td className="py-2.5">
                        <span className={`font-black ${item.netEvINR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ₹{item.netEvINR.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                          item.isTopPercentileApproved
                            ? 'bg-emerald-500 text-black shadow'
                            : item.gatingVerdict === 'BLOCKED_DESTRUCTIVE_SETUP'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : item.gatingVerdict === 'BLOCKED_NEGATIVE_NET_EV'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {item.gatingVerdict.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => {
                            setTargetSymbol(item.symbol.split(' ')[0] || item.symbol);
                            if (onSelectContract) onSelectContract(item.symbol);
                            if (onTriggerFeedback) onTriggerFeedback(`Selected ${item.symbol} for quantitative analysis.`);
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                            item.isTopPercentileApproved
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                              : 'bg-[#1F2937] hover:bg-[#374151] text-gray-300'
                          }`}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 8-PILLAR CONFLUENCE STACK & CONFLICT ARBITRATION */}
      {/* ========================================================================= */}
      {activeTab === 'CONFLUENCE_STACK' && (
        <div className="space-y-5">
          {/* Main Decision Hero */}
          <div
            className={`p-4 sm:p-5 rounded border ${
              evidence.finalDecision === 'EXECUTE_BUY' || evidence.finalDecision === 'EXECUTE_SELL'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                {evidence.finalDecision === 'EXECUTE_BUY' || evidence.finalDecision === 'EXECUTE_SELL' ? (
                  <div className="p-2.5 bg-emerald-500/20 rounded-full text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-500/20 rounded-full text-rose-400">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">
                      {evidence.finalDecision.replace(/_/g, ' ')}
                    </h4>
                    <span className="px-2 py-0.5 bg-black/40 rounded text-[10px] font-bold border border-white/10">
                      Score: {evidence.totalConfluenceScore}/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">{evidence.decisionRationale}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-gray-400 uppercase font-bold">INDEPENDENT PILLARS PASSED</div>
                <div className="text-lg font-black text-white">
                  {evidence.passedPillarsCount} / {evidence.totalPillarsCount}
                </div>
              </div>
            </div>
          </div>

          {/* 8 Pillar Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {Object.entries(evidence.pillars).map(([key, rawPillar]) => {
              const p = rawPillar as EvidencePillarItem;
              return (
                <div
                  key={key}
                  className={`p-3.5 rounded border transition-all ${
                    p.passed ? 'bg-[#0A0B0E] border-emerald-500/30' : 'bg-[#0A0B0E] border-rose-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      {p.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <span className="font-bold text-white text-xs">{p.name}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                          p.bias === 'BULLISH'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : p.bias === 'BEARISH'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {p.bias}
                      </span>
                      <span className="font-mono text-xs text-gray-300 font-bold">
                        {p.score}/{p.maxScore} pts
                      </span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-gray-400 leading-relaxed">{p.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORICAL SETUP MATCHER & DESTRUCTIVE BLACKLIST */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORICAL_MATCHER' && (
        <div className="space-y-5">
          {/* KNN Matcher Summary */}
          <div className="p-4 bg-[#0A0B0E] border border-[#1F2937] rounded space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <h4 className="font-extrabold text-white text-xs uppercase">
                  KNN Historical Setup Matcher (Euclidean Closeness)
                </h4>
              </div>
              <span className="text-[10.5px] text-gray-400">
                Matched Sample Size: <strong className="text-white">N = {matcherResult.sampleSize}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 bg-[#111827] rounded border border-[#1F2937]">
                <span className="text-[9.5px] text-gray-400 block font-bold">HISTORICAL WIN RATE</span>
                <span className="text-sm font-black text-emerald-400">
                  {matcherResult.isStatisticallySignificant ? `${matcherResult.historicalWinRatePct}%` : 'SUPPRESSED (N<10)'}
                </span>
              </div>

              <div className="p-2.5 bg-[#111827] rounded border border-[#1F2937]">
                <span className="text-[9.5px] text-gray-400 block font-bold">EXPECTANCY IN R</span>
                <span className="text-sm font-black text-amber-400">
                  {matcherResult.isStatisticallySignificant ? `+${matcherResult.expectancyInR}R` : 'SUPPRESSED'}
                </span>
              </div>

              <div className="p-2.5 bg-[#111827] rounded border border-[#1F2937]">
                <span className="text-[9.5px] text-gray-400 block font-bold">PROFIT FACTOR</span>
                <span className="text-sm font-black text-cyan-400">
                  {matcherResult.isStatisticallySignificant ? `${matcherResult.profitFactor}x` : 'SUPPRESSED'}
                </span>
              </div>

              <div className="p-2.5 bg-[#111827] rounded border border-[#1F2937]">
                <span className="text-[9.5px] text-gray-400 block font-bold">CONFIDENCE SCORE</span>
                <span className="text-sm font-black text-purple-400">
                  {matcherResult.statisticalConfidencePct}%
                </span>
              </div>
            </div>

            <p className="text-[10.5px] text-gray-300 pt-1 leading-relaxed">
              {matcherResult.probabilityStatusMessage}
            </p>
          </div>

          {/* Empirical Setup Combinations Matrix */}
          <div className="bg-[#0A0B0E] p-4 border border-[#1F2937] rounded space-y-3">
            <div className="border-b border-[#1F2937] pb-2">
              <h4 className="font-extrabold text-white text-xs uppercase">
                Empirical Setup Matrix: Win Rate, Avg R, Expectancy & Max Drawdown
              </h4>
              <p className="text-[10px] text-gray-400">
                Rigorous measurement across sample size N, time-of-day, and market regimes.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#1F2937] text-gray-400 text-[10px]">
                    <th className="pb-2">SETUP COMBINATION</th>
                    <th className="pb-2">REGIME</th>
                    <th className="pb-2">SESSION</th>
                    <th className="pb-2">SAMPLE N</th>
                    <th className="pb-2">WIN RATE</th>
                    <th className="pb-2">AVG WIN R</th>
                    <th className="pb-2">EXPECTANCY E(R)</th>
                    <th className="pb-2">PROFIT FACTOR</th>
                    <th className="pb-2">MAX DD %</th>
                    <th className="pb-2">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {setupMatrix.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-[#111827] transition-colors ${
                        row.status === 'DESTRUCTIVE_BLACKLISTED' ? 'bg-rose-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 font-bold text-white">{row.setupName}</td>
                      <td className="py-2.5 text-[10px] text-gray-300">{row.regime}</td>
                      <td className="py-2.5 text-[10px] text-gray-400">{row.timeOfDay}</td>
                      <td className="py-2.5 font-bold text-gray-200">N={row.sampleSizeN}</td>
                      <td className="py-2.5 font-bold text-emerald-400">{row.winRatePct}%</td>
                      <td className="py-2.5 font-bold text-cyan-400">+{row.avgWinR}R</td>
                      <td className="py-2.5 font-black">
                        <span className={row.expectancyR > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {row.expectancyR > 0 ? `+${row.expectancyR}R` : `${row.expectancyR}R`}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-gray-200">{row.profitFactor}x</td>
                      <td className="py-2.5 text-rose-400 font-bold">{row.maxDrawdownPct}%</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                          row.status === 'HIGH_EDGE_APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {row.status === 'DESTRUCTIVE_BLACKLISTED' ? 'NO-TRADE BLACKLIST' : 'APPROVED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historically Destructive Setup Blacklist Panel */}
          <div className="bg-[#0A0B0E] p-4 border border-rose-500/30 rounded space-y-3">
            <div className="flex items-center space-x-2 border-b border-[#1F2937] pb-2">
              <Ban className="w-4 h-4 text-rose-400" />
              <h4 className="font-extrabold text-white text-xs uppercase">
                Historically Destructive Setups (Automatic NO-TRADE Blacklist)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DESTRUCTIVE_SETUPS_CATALOG.map((item) => (
                <div key={item.id} className="p-3 bg-[#111827] rounded border border-rose-500/20 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-rose-300 text-xs">{item.name}</span>
                    <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 rounded text-[9px] font-black">
                      STRICT NO-TRADE
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">{item.description}</p>
                  <div className="flex items-center space-x-3 text-[9.5px] text-gray-300 pt-1 border-t border-[#1F2937]">
                    <span>Sample: <strong>N={item.historicalSampleSize}</strong></span>
                    <span>Win Rate: <strong className="text-rose-400">{item.historicalWinRatePct}%</strong></span>
                    <span>Expectancy: <strong className="text-rose-400">{item.historicalExpectancyR}R</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Realized Evidence & Slippage Journal */}
          <div className="bg-[#0A0B0E] p-4 border border-[#1F2937] rounded space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-2">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <div>
                  <h4 className="font-extrabold text-white text-xs uppercase">
                    Realized Evidence & Slippage Journal ({realizedLogs.length} Executed Logs)
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Tracks actual fill quality, slippage, and realized R-multiples per evidence stack.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRecordTestTradeOutcome('WIN')}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold transition-all"
                >
                  + Log Winner (+1.7R)
                </button>
                <button
                  onClick={() => handleRecordTestTradeOutcome('LOSS')}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold transition-all"
                >
                  + Log Stop (-1.0R)
                </button>
              </div>
            </div>

            {realizedLogs.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                No realized execution records logged yet. Executed trades will automatically log fill slippage, actual taxes, and realized R-multiples here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-[#1F2937] text-gray-400 text-[10px]">
                      <th className="pb-2">TIME</th>
                      <th className="pb-2">CONTRACT</th>
                      <th className="pb-2">DIR</th>
                      <th className="pb-2">SCORE</th>
                      <th className="pb-2">FILL / SLIPPAGE</th>
                      <th className="pb-2">TAXES</th>
                      <th className="pb-2">REALIZED P&L</th>
                      <th className="pb-2">REALIZED R</th>
                      <th className="pb-2">OUTCOME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {realizedLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-[#111827]">
                        <td className="py-2 text-gray-400">{log.timestamp}</td>
                        <td className="py-2 font-bold text-white">{log.symbol}</td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            log.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {log.direction}
                          </span>
                        </td>
                        <td className="py-2 font-bold text-cyan-400">{log.goldenGateScore}/100</td>
                        <td className="py-2 text-gray-300">
                          ₹{log.actualFillPrice} <span className="text-rose-400 text-[9.5px]">(-₹{log.slippageINR})</span>
                        </td>
                        <td className="py-2 text-rose-400">₹{log.transactionCostsINR}</td>
                        <td className="py-2 font-bold">
                          <span className={log.realizedPnlINR > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {log.realizedPnlINR > 0 ? `+₹${log.realizedPnlINR}` : `₹${log.realizedPnlINR}`}
                          </span>
                        </td>
                        <td className="py-2 font-black">
                          <span className={log.realizedRMultiple > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {log.realizedRMultiple > 0 ? `+${log.realizedRMultiple}R` : `${log.realizedRMultiple}R`}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                            log.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WALK-FORWARD VALIDATION & STRICT OUT-OF-SAMPLE GATING */}
      {/* ========================================================================= */}
      {activeTab === 'WALK_FORWARD' && (
        <div className="space-y-5">
          <div className="p-4 bg-[#0A0B0E] border border-[#1F2937] rounded space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2937] pb-2">
              <div>
                <h4 className="font-extrabold text-white text-xs uppercase">
                  Walk-Forward & Out-of-Sample Validation Engine
                </h4>
                <p className="text-[10px] text-gray-400">
                  Strict Mandate: Never optimize directly on validation data. Requires positive OOS Net EV and WFE ≥ 60% after Indian taxes & slippage.
                </p>
              </div>
              <button
                onClick={handleRunWalkForward}
                disabled={isWfRunning}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded text-xs flex items-center space-x-1.5"
              >
                {isWfRunning ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isWfRunning ? 'Simulating...' : 'Run Walk-Forward Simulation'}</span>
              </button>
            </div>

            {walkForwardReport && (
              <div className="space-y-4">
                {/* Promotion Gate Verdict */}
                <div className={`p-3.5 rounded border ${
                  walkForwardReport.isPromotionApproved
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                }`}>
                  <div className="font-bold text-xs">{walkForwardReport.promotionVerdict}</div>
                </div>

                {/* 3-Way Partition Table: In-Sample (60%) vs Out-of-Sample (20%) vs Walk-Forward (20%) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* In-Sample */}
                  <div className="p-3 bg-[#111827] rounded border border-[#1F2937] space-y-2">
                    <div className="font-bold text-amber-400 border-b border-[#1F2937] pb-1 text-[11px]">
                      {walkForwardReport.inSample.label}
                    </div>
                    <div className="space-y-1 text-[10.5px]">
                      <div className="flex justify-between"><span>Win Rate:</span><strong className="text-white">{walkForwardReport.inSample.winRatePct}%</strong></div>
                      <div className="flex justify-between"><span>Expectancy E(R):</span><strong className="text-emerald-400">+{walkForwardReport.inSample.expectancyInR}R</strong></div>
                      <div className="flex justify-between"><span>Net Profit:</span><strong className="text-white">₹{walkForwardReport.inSample.netProfitINR}</strong></div>
                      <div className="flex justify-between"><span>Profit Factor:</span><strong className="text-white">{walkForwardReport.inSample.profitFactor}x</strong></div>
                      <div className="flex justify-between"><span>Max Drawdown:</span><strong className="text-rose-400">{walkForwardReport.inSample.maxDrawdownPct}%</strong></div>
                    </div>
                  </div>

                  {/* Out-of-Sample */}
                  <div className="p-3 bg-[#111827] rounded border border-emerald-500/40 space-y-2">
                    <div className="font-bold text-emerald-400 border-b border-[#1F2937] pb-1 text-[11px]">
                      {walkForwardReport.outOfSample.label}
                    </div>
                    <div className="space-y-1 text-[10.5px]">
                      <div className="flex justify-between"><span>Win Rate:</span><strong className="text-white">{walkForwardReport.outOfSample.winRatePct}%</strong></div>
                      <div className="flex justify-between"><span>Expectancy E(R):</span><strong className="text-emerald-400">+{walkForwardReport.outOfSample.expectancyInR}R</strong></div>
                      <div className="flex justify-between"><span>Net Profit:</span><strong className="text-emerald-400">₹{walkForwardReport.outOfSample.netProfitINR}</strong></div>
                      <div className="flex justify-between"><span>Profit Factor:</span><strong className="text-white">{walkForwardReport.outOfSample.profitFactor}x</strong></div>
                      <div className="flex justify-between"><span>Max Drawdown:</span><strong className="text-rose-400">{walkForwardReport.outOfSample.maxDrawdownPct}%</strong></div>
                    </div>
                  </div>

                  {/* Walk-Forward Forward Sim */}
                  <div className="p-3 bg-[#111827] rounded border border-blue-500/40 space-y-2">
                    <div className="font-bold text-blue-400 border-b border-[#1F2937] pb-1 text-[11px]">
                      {walkForwardReport.walkForward.label}
                    </div>
                    <div className="space-y-1 text-[10.5px]">
                      <div className="flex justify-between"><span>Win Rate:</span><strong className="text-white">{walkForwardReport.walkForward.winRatePct}%</strong></div>
                      <div className="flex justify-between"><span>Expectancy E(R):</span><strong className="text-emerald-400">+{walkForwardReport.walkForward.expectancyInR}R</strong></div>
                      <div className="flex justify-between"><span>Net Profit:</span><strong className="text-blue-300">₹{walkForwardReport.walkForward.netProfitINR}</strong></div>
                      <div className="flex justify-between"><span>Profit Factor:</span><strong className="text-white">{walkForwardReport.walkForward.profitFactor}x</strong></div>
                      <div className="flex justify-between"><span>Max Drawdown:</span><strong className="text-rose-400">{walkForwardReport.walkForward.maxDrawdownPct}%</strong></div>
                    </div>
                  </div>
                </div>

                {/* Indian Taxes & Slippage Deduction Summary */}
                <div className="p-3 bg-[#111827] rounded border border-[#1F2937] flex flex-wrap justify-between items-center gap-3 text-xs">
                  <div>
                    <span className="text-gray-400">Indian Brokerage & Regulatory Taxes (STT, GST, Exchange, Stamp):</span>
                    <strong className="text-rose-400 ml-1.5">₹{walkForwardReport.totalTransactionCostINR}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">Execution Slippage Buffer:</span>
                    <strong className="text-rose-400 ml-1.5">₹{walkForwardReport.totalSlippageCostINR}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400">Walk-Forward Efficiency:</span>
                    <strong className="text-emerald-400 ml-1.5">{walkForwardReport.walkForwardEfficiencyPct}% (≥60% hurdle)</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
