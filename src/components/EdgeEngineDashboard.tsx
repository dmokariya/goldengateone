// src/components/EdgeEngineDashboard.tsx
// GoldenGate Profitability & Edge Engine Dashboard
// Features:
// 1. 8-Pillar Independent Evidence Confluence Stacking & Conflict Arbitration ("NO TRADE" priority)
// 2. Historical Setup Matcher (KNN) with Sample Size N, Expectancy in R, Profit Factor, Statistical Confidence
//    STRICT MANDATE: Never invent probability. Win probability is displayed ONLY when N >= 10.
// 3. Walk-Forward Validation Engine (Strict In-Sample vs Out-of-Sample separation, Indian Costs & Slippage)

import React, { useState, useEffect } from 'react';
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
  HistoricalSetupVector
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
import { matchHistoricalSetups, getHistoricalSetupDatabase } from '../utils/historicalMatcher';
import { runWalkForwardValidation } from '../utils/walkForwardEngine';
import { generateDemoCandles, TRADABLE_ASSETS } from '../utils/quantEngine';
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
  Award
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
  const [activeTab, setActiveTab] = useState<'CONFLUENCE_STACK' | 'HISTORICAL_MATCHER' | 'WALK_FORWARD'>('CONFLUENCE_STACK');
  const [targetSymbol, setTargetSymbol] = useState<string>(selectedSymbol || 'NIFTY');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [isOptionBuy, setIsOptionBuy] = useState<boolean>(true);

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

  // Evidence Stack Summary
  const [evidence, setEvidence] = useState<EvidenceStackSummary>(() =>
    evaluateEvidenceStack({
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
    })
  );

  // Historical Matcher Results
  const [matcherResult, setMatcherResult] = useState<HistoricalMatcherResult>(() => {
    const candidateVector: HistoricalSetupVector = {
      mtfScore: mtf.alignmentScore,
      vwapSlope: vwap.slopeBpsPerBar,
      adx: adx.adx,
      rvol: rvol.rvol,
      breadthScore: breadth.breadthScore,
      pcr: optionChain.pcr,
      timeOfDayBucket: timeBucket,
      dte: 3.5
    };
    return matchHistoricalSetups(candidateVector, 'NIFTY');
  });

  // Walk-Forward Validation Report
  const [walkForwardReport, setWalkForwardReport] = useState<WalkForwardValidationReport | null>(null);
  const [isWfRunning, setIsWfRunning] = useState<boolean>(false);

  // Re-calculate edge engine whenever inputs change
  useEffect(() => {
    const freshCandles = generateDemoCandles(targetSymbol, '5m', 120);
    setCandles(freshCandles);
    const spot = freshCandles[freshCandles.length - 1]?.close || 24500;

    const freshMtf = evaluateMultiTimeframeTrend(freshCandles, spot);
    const freshVwap = evaluateVwapProfile(freshCandles);
    const freshAdx = calculateADX(freshCandles);
    const freshRvol = evaluateRvolProfile(freshCandles);
    const freshAtr = evaluateAtrProfile(freshCandles);
    const freshMom = evaluateMomentumAcceleration(freshCandles);
    const freshStruct = evaluateSupportResistanceStructure(freshCandles, spot);
    const freshBreadth = evaluateMarketBreadth(spotIndices, liveQuotes);
    const freshChain = evaluateOptionChainConfirmation(spot, targetSymbol.includes('BANK') ? 'BANKNIFTY' : 'NIFTY');

    setMtf(freshMtf);
    setVwap(freshVwap);
    setAdx(freshAdx);
    setRvol(freshRvol);
    setAtr(freshAtr);
    setMomentum(freshMom);
    setStructure(freshStruct);
    setBreadth(freshBreadth);
    setOptionChain(freshChain);

    const freshEvidence = evaluateEvidenceStack({
      mtf: freshMtf,
      vwap: freshVwap,
      adx: freshAdx,
      rvol: freshRvol,
      structure: freshStruct,
      breadth: freshBreadth,
      optionChain: freshChain,
      timeBucket,
      intendedDirection: direction,
      isOptionBuy
    });
    setEvidence(freshEvidence);

    const candidateVector: HistoricalSetupVector = {
      mtfScore: freshMtf.alignmentScore,
      vwapSlope: freshVwap.slopeBpsPerBar,
      adx: freshAdx.adx,
      rvol: freshRvol.rvol,
      breadthScore: freshBreadth.breadthScore,
      pcr: freshChain.pcr,
      timeOfDayBucket: timeBucket,
      dte: 3.5
    };
    const cleanUnderlying = targetSymbol.includes('BANK') ? 'BANKNIFTY' : targetSymbol.includes('FIN') ? 'FINNIFTY' : 'NIFTY';
    setMatcherResult(matchHistoricalSetups(candidateVector, cleanUnderlying));
  }, [targetSymbol, direction, isOptionBuy, timeBucket]);

  const handleRunWalkForward = () => {
    setIsWfRunning(true);
    setTimeout(() => {
      const cleanSym = targetSymbol.includes('BANK') ? 'BANKNIFTY' : targetSymbol.includes('FIN') ? 'FINNIFTY' : 'NIFTY';
      const rpt = runWalkForwardValidation('GoldenGate Multi-Pillar Edge Model', cleanSym, '5m');
      setWalkForwardReport(rpt);
      setIsWfRunning(false);
      if (onTriggerFeedback) {
        onTriggerFeedback(`✓ Walk-Forward Completed for ${cleanSym}. Parameter Stability: ${rpt.parameterStabilityScore}/100.`);
      }
    }, 600);
  };

  return (
    <div id="goldengate-edge-engine" className="bg-[#111827] border border-[#1F2937] p-4 sm:p-5 rounded-sm space-y-5 font-mono text-xs text-[#D1D5DB]">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-black font-black text-sm">
            <Scale className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                GoldenGate Profitability & Edge Engine
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[9.5px] font-bold">
                EVIDENCE CONFLUENCE
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              Multi-Timeframe Trend • VWAP Slope • ADX Strength • RVOL • S/R Structure • Option Chain • Historical Matcher
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-[#0A0B0E] p-1 border border-[#1F2937] rounded">
          <button
            onClick={() => setActiveTab('CONFLUENCE_STACK')}
            className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'CONFLUENCE_STACK'
                ? 'bg-amber-500 text-black shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>8-Pillar Confluence ({evidence.passedPillarsCount}/8)</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORICAL_MATCHER')}
            className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'HISTORICAL_MATCHER'
                ? 'bg-emerald-500 text-black shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Historical Matcher (N={matcherResult.sampleSize})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('WALK_FORWARD');
              if (!walkForwardReport) handleRunWalkForward();
            }}
            className={`px-3 py-1.5 rounded text-[11px] font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'WALK_FORWARD'
                ? 'bg-blue-500 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Walk-Forward Validation</span>
          </button>
        </div>
      </div>

      {/* Symbol & Direction Controller Ribbon */}
      <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[9.5px] text-gray-500 block mb-0.5">UNDERLYING / ASSET</label>
            <select
              value={targetSymbol}
              onChange={(e) => setTargetSymbol(e.target.value)}
              className="bg-[#111827] border border-[#1F2937] text-white px-2.5 py-1 rounded text-xs focus:border-amber-400 outline-none"
            >
              <option value="NIFTY">NIFTY 50 INDEX</option>
              <option value="BANKNIFTY">BANK NIFTY INDEX</option>
              <option value="FINNIFTY">FIN NIFTY INDEX</option>
              <option value="RELIANCE">RELIANCE (HEAVYWEIGHT)</option>
              <option value="HDFCBANK">HDFC BANK (HEAVYWEIGHT)</option>
              <option value="INFY">INFOSYS (IT SECTOR)</option>
            </select>
          </div>

          <div>
            <label className="text-[9.5px] text-gray-500 block mb-0.5">SIGNAL DIRECTION</label>
            <div className="flex bg-[#111827] border border-[#1F2937] p-0.5 rounded">
              <button
                onClick={() => setDirection('BUY')}
                className={`px-2.5 py-0.5 rounded text-[10.5px] font-bold ${
                  direction === 'BUY' ? 'bg-emerald-500 text-black' : 'text-gray-400'
                }`}
              >
                BUY (LONG / CE)
              </button>
              <button
                onClick={() => setDirection('SELL')}
                className={`px-2.5 py-0.5 rounded text-[10.5px] font-bold ${
                  direction === 'SELL' ? 'bg-rose-500 text-white' : 'text-gray-400'
                }`}
              >
                SELL (SHORT / PE)
              </button>
            </div>
          </div>

          <div>
            <label className="text-[9.5px] text-gray-500 block mb-0.5">TIME REGIME</label>
            <select
              value={timeBucket}
              onChange={(e) => setTimeBucket(e.target.value as TimeOfDayBucket)}
              className="bg-[#111827] border border-[#1F2937] text-white px-2 py-1 rounded text-xs focus:border-amber-400 outline-none"
            >
              <option value="OPENING_DISCOVERY">09:15 - 09:30 (Opening Discovery)</option>
              <option value="MORNING_TREND">09:30 - 11:30 (Prime Morning Trend)</option>
              <option value="MIDDAY_CHOP">11:30 - 13:30 (Midday Theta Chop)</option>
              <option value="AFTERNOON_MOMENTUM">13:30 - 15:00 (European Drive)</option>
              <option value="CLOSING_EOD">15:00 - 15:30 (Closing EOD Squareoff)</option>
            </select>
          </div>
        </div>

        {/* Arbitration Status Badge */}
        <div className="flex items-center space-x-2">
          {evidence.conflictDetected ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/80 border border-rose-500/80 text-rose-200 rounded font-extrabold text-[11px]">
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>{evidence.finalDecision.replace(/_/g, ' ')}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 rounded font-extrabold text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>HIGH EDGE CONFLUENCE ({evidence.totalConfluenceScore}/100)</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 8-PILLAR EVIDENCE CONFLUENCE STACK & CONFLICT ARBITRATION          */}
      {/* ========================================================================= */}
      {activeTab === 'CONFLUENCE_STACK' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Conflict Decision Banner */}
          <div
            className={`p-3.5 rounded border flex items-start justify-between gap-3 ${
              evidence.conflictDetected
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                {evidence.conflictDetected ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="font-extrabold uppercase text-xs tracking-wider">
                  {evidence.decisionRationale}
                </span>
              </div>
              {evidence.conflictReasons.length > 0 && (
                <ul className="list-disc list-inside text-[11px] text-rose-300 space-y-0.5 pl-1">
                  {evidence.conflictReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] text-gray-400 uppercase">Confluence Score</div>
              <div
                className={`text-xl font-black ${
                  evidence.totalConfluenceScore >= 70 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {evidence.totalConfluenceScore} / 100
              </div>
              <div className="text-[9.5px] text-gray-400">
                {evidence.passedPillarsCount} of 8 Pillars Passed
              </div>
            </div>
          </div>

          {/* 8 Independent Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Pillar 1: Multi-Timeframe Trend */}
            <div
              className={`p-3 rounded border transition-all ${
                evidence.pillars.multiTimeframe.passed
                  ? 'bg-[#0A0B0E] border-emerald-500/40'
                  : 'bg-[#0A0B0E] border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">1. MTF Trend (5m/15m/1h)</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    evidence.pillars.multiTimeframe.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  +{evidence.pillars.multiTimeframe.score}/{evidence.pillars.multiTimeframe.maxScore} pts
                </span>
              </div>
              <div className="text-xs font-bold text-white mb-1">
                {mtf.status.replace(/_/g, ' ')} ({mtf.alignmentScore}/100)
              </div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <div>5m: <span className={mtf.bars.m5.trend === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>{mtf.bars.m5.trend}</span> (EMA 9: ₹{mtf.bars.m5.ema9.toFixed(1)})</div>
                <div>15m: <span className={mtf.bars.m15.trend === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>{mtf.bars.m15.trend}</span> (Supertrend: ₹{mtf.bars.m15.supertrend.toFixed(1)})</div>
                <div>1h: <span className={mtf.bars.h1.trend === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>{mtf.bars.h1.trend}</span> ({mtf.bars.h1.structure})</div>
              </div>
            </div>

            {/* Pillar 2: VWAP Slope & Location */}
            <div
              className={`p-3 rounded border transition-all ${
                evidence.pillars.vwapProfile.passed
                  ? 'bg-[#0A0B0E] border-emerald-500/40'
                  : 'bg-[#0A0B0E] border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">2. VWAP Profile</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    evidence.pillars.vwapProfile.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  +{evidence.pillars.vwapProfile.score}/{evidence.pillars.vwapProfile.maxScore} pts
                </span>
              </div>
              <div className="text-xs font-bold text-white mb-1">
                ₹{vwap.vwapValue.toFixed(2)} ({vwap.priceLocation.replace(/_/g, ' ')})
              </div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <div>Slope: <span className={vwap.slope === 'RISING' ? 'text-emerald-400' : vwap.slope === 'FALLING' ? 'text-rose-400' : 'text-gray-300'}>{vwap.slope} ({vwap.slopeBpsPerBar > 0 ? '+' : ''}{vwap.slopeBpsPerBar} bps)</span></div>
                <div>Distance: {vwap.distancePct > 0 ? '+' : ''}{vwap.distancePct}% from VWAP</div>
                <div>Bands: +1σ ₹{vwap.upperBand1} | -1σ ₹{vwap.lowerBand1}</div>
              </div>
            </div>

            {/* Pillar 3: ADX Trend Strength */}
            <div
              className={`p-3 rounded border transition-all ${
                evidence.pillars.adxStrength.passed
                  ? 'bg-[#0A0B0E] border-emerald-500/40'
                  : 'bg-[#0A0B0E] border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">3. ADX(14) Strength</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    evidence.pillars.adxStrength.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  +{evidence.pillars.adxStrength.score}/{evidence.pillars.adxStrength.maxScore} pts
                </span>
              </div>
              <div className="text-xs font-bold text-white mb-1">
                ADX: {adx.adx} ({adx.trendStrength.replace(/_/g, ' ')})
              </div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <div>+DI: <span className="text-emerald-400">{adx.plusDI}</span> vs -DI: <span className="text-rose-400">{adx.minusDI}</span></div>
                <div>Option Buy: <span className={adx.isOptionBuyPermitted ? 'text-emerald-400' : 'text-rose-400 font-bold'}>{adx.isOptionBuyPermitted ? 'PERMITTED' : 'BLOCKED (LOW ADX)'}</span></div>
                <div>Direction Bias: {adx.directionalBias}</div>
              </div>
            </div>

            {/* Pillar 4: Relative Volume (RVOL) */}
            <div
              className={`p-3 rounded border transition-all ${
                evidence.pillars.rvolVolume.passed
                  ? 'bg-[#0A0B0E] border-emerald-500/40'
                  : 'bg-[#0A0B0E] border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">4. RVOL (20-SMA)</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    evidence.pillars.rvolVolume.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  +{evidence.pillars.rvolVolume.score}/{evidence.pillars.rvolVolume.maxScore} pts
                </span>
              </div>
              <div className="text-xs font-bold text-white mb-1">
                RVOL: {rvol.rvol}x ({rvol.volumeRegime.replace(/_/g, ' ')})
              </div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <div>Current Volume: {rvol.currentVolume.toLocaleString()}</div>
                <div>20-Bar SMA Volume: {rvol.avgVolume20.toLocaleString()}</div>
                <div>Institutional: <span className={rvol.isInstitutionalParticipation ? 'text-emerald-400' : 'text-amber-400'}>{rvol.isInstitutionalParticipation ? 'SURGE DETECTED' : 'STANDARD'}</span></div>
              </div>
            </div>

            {/* Pillar 5: S/R Breakout-Retest Structure */}
            <div
              className={`p-3 rounded border transition-all ${
                evidence.pillars.srStructure.passed
                  ? 'bg-[#0A0B0E] border-emerald-500/40'
                  : 'bg-[#0A0B0E] border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">5. S/R Structure</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    evidence.pillars.srStructure.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  +{evidence.pillars.srStructure.score}/{evidence.pillars.srStructure.maxScore} pts
                </span>
              </div>
              <div className="text-xs font-bold text-white mb-1">
                {structure.structureState.replace(/_/g, ' ')}
              </div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <div>15m ORB: High ₹{structure.orb15mHigh} | Low ₹{structure.orb15mLow}</div>
                <div>Pivot Point: ₹{structure.pivotPoint}</div>
                <div>PDH: ₹{structure.pdh} | PDL: ₹{structure.pdl}</div>
              </div>
            </div>

            {/* Pillar 6: Market Breadth */}
            <div
              className={`p-3 rounded border transition-all ${
                evidence.pillars.marketBreadth.passed
                  ? 'bg-[#0A0B0E] border-emerald-500/40'
                  : 'bg-[#0A0B0E] border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">6. Market Breadth</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    evidence.pillars.marketBreadth.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  +{evidence.pillars.marketBreadth.score}/{evidence.pillars.marketBreadth.maxScore} pts
                </span>
              </div>
              <div className="text-xs font-bold text-white mb-1">
                A/D Ratio: {breadth.advanceDeclineRatio} ({breadth.overallBreadthBias.replace(/_/g, ' ')})
              </div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <div>Advancers: <span className="text-emerald-400">{breadth.niftyAdvancers}</span> | Decliners: <span className="text-rose-400">{breadth.niftyDecliners}</span></div>
                <div>Bank Nifty: <span className={breadth.bankNiftyBias === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>{breadth.bankNiftyBias}</span></div>
                <div>Reliance: <span className={breadth.relianceBias === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>{breadth.relianceBias}</span></div>
              </div>
            </div>

            {/* Pillar 7: Option Chain Confirmation */}
            <div
              className={`p-3 rounded border transition-all ${
                evidence.pillars.optionChain.passed
                  ? 'bg-[#0A0B0E] border-emerald-500/40'
                  : 'bg-[#0A0B0E] border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">7. Option Chain</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    evidence.pillars.optionChain.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  +{evidence.pillars.optionChain.score}/{evidence.pillars.optionChain.maxScore} pts
                </span>
              </div>
              <div className="text-xs font-bold text-white mb-1">
                PCR: {optionChain.pcr} ({optionChain.pcrRegime.replace(/_/g, ' ')})
              </div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <div>Max Pain: Strike ₹{optionChain.maxPainStrike}</div>
                <div>Call Resistance: ₹{optionChain.highCallOiStrike} ({optionChain.callOiChange})</div>
                <div>Put Support: ₹{optionChain.highPutOiStrike} ({optionChain.putOiChange})</div>
              </div>
            </div>

            {/* Pillar 8: Time-of-Day Regime */}
            <div
              className={`p-3 rounded border transition-all ${
                evidence.pillars.timeOfDay.passed
                  ? 'bg-[#0A0B0E] border-emerald-500/40'
                  : 'bg-[#0A0B0E] border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">8. Time of Day</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                    evidence.pillars.timeOfDay.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  +{evidence.pillars.timeOfDay.score}/{evidence.pillars.timeOfDay.maxScore} pts
                </span>
              </div>
              <div className="text-xs font-bold text-white mb-1">
                {timeBucket.replace(/_/g, ' ')}
              </div>
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <div>Execution Window: {timeBucket === 'MORNING_TREND' || timeBucket === 'AFTERNOON_MOMENTUM' ? 'PRIME EXPANSION' : 'THETA DECAY ZONE'}</div>
                <div>Stop Distance (ATR): ₹{atr.suggestedStopDistance}</div>
                <div>Target Distance: ₹{atr.suggestedTargetDistance}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORICAL SETUP MATCHER (KNN)                                     */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORICAL_MATCHER' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Statistical Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9.5px] text-gray-400 block uppercase">Sample Size (N)</span>
              <span className="text-lg font-black text-white">{matcherResult.sampleSize} Setups</span>
              <span
                className={`text-[9px] block font-bold ${
                  matcherResult.isStatisticallySignificant ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {matcherResult.isStatisticallySignificant ? '✓ N ≥ 10 (Significant)' : '⚠️ N < 10 (Small Sample)'}
              </span>
            </div>

            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9.5px] text-gray-400 block uppercase">Win Rate (Observed)</span>
              {matcherResult.isStatisticallySignificant && matcherResult.historicalWinRatePct !== undefined ? (
                <>
                  <span className="text-lg font-black text-emerald-400">
                    {matcherResult.historicalWinRatePct}%
                  </span>
                  <span className="text-[9px] text-gray-400 block">Strict Historical Count</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-amber-400 block mt-1">SUPPRESSED</span>
                  <span className="text-[8.5px] text-gray-500 block">N &lt; 10 Observations</span>
                </>
              )}
            </div>

            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9.5px] text-gray-400 block uppercase">Expectancy E(R)</span>
              {matcherResult.isStatisticallySignificant && matcherResult.expectancyInR !== undefined ? (
                <>
                  <span
                    className={`text-lg font-black ${
                      matcherResult.expectancyInR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {matcherResult.expectancyInR > 0 ? '+' : ''}{matcherResult.expectancyInR} R
                  </span>
                  <span className="text-[9px] text-gray-400 block">Per Unit Risked</span>
                </>
              ) : (
                <span className="text-xs text-gray-500 block mt-2">Requires N ≥ 10</span>
              )}
            </div>

            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9.5px] text-gray-400 block uppercase">Avg Winner vs Loser</span>
              {matcherResult.avgWinnerR !== undefined && matcherResult.avgLoserR !== undefined ? (
                <>
                  <span className="text-sm font-bold text-white block mt-1">
                    +{matcherResult.avgWinnerR}R / -{matcherResult.avgLoserR}R
                  </span>
                  <span className="text-[9px] text-gray-400 block">Reward-to-Risk</span>
                </>
              ) : (
                <span className="text-xs text-gray-500 block mt-2">--</span>
              )}
            </div>

            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9.5px] text-gray-400 block uppercase">Profit Factor</span>
              {matcherResult.profitFactor !== undefined ? (
                <>
                  <span className="text-lg font-black text-amber-400">{matcherResult.profitFactor}</span>
                  <span className="text-[9px] text-gray-400 block">Gross Win R / Gross Loss R</span>
                </>
              ) : (
                <span className="text-xs text-gray-500 block mt-2">--</span>
              )}
            </div>

            <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
              <span className="text-[9.5px] text-gray-400 block uppercase">Statistical Confidence</span>
              <span className="text-lg font-black text-blue-400">{matcherResult.statisticalConfidencePct}%</span>
              <span className="text-[9px] text-gray-400 block">SE Proportion Model</span>
            </div>
          </div>

          {/* Probability Status Box */}
          <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2 text-gray-300">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{matcherResult.probabilityStatusMessage}</span>
            </div>
            <div className="text-[10px] text-gray-500">
              Mandate: Never invent probability. Real historical counts only.
            </div>
          </div>

          {/* Matched Historical Setups Table */}
          <div className="bg-[#0A0B0E] border border-[#1F2937] rounded overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-[#111827] text-gray-400 border-b border-[#1F2937] sticky top-0">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Setup ID</th>
                  <th className="p-2">Underlying</th>
                  <th className="p-2">Similarity</th>
                  <th className="p-2">Outcome</th>
                  <th className="p-2">Return (R)</th>
                  <th className="p-2">MFE / MAE</th>
                  <th className="p-2">Exit Reason</th>
                  <th className="p-2 text-right">Hold Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/50 text-gray-300">
                {matcherResult.matchedSetups.map((m, i) => {
                  const isWin = m.record.outcome === 'WIN';
                  return (
                    <tr key={m.record.id} className="hover:bg-[#111827]/60">
                      <td className="p-2 text-gray-500">{i + 1}</td>
                      <td className="p-2 text-white font-bold">{m.record.id}</td>
                      <td className="p-2">{m.record.symbol}</td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded font-bold text-[10px]">
                          {m.similarityScorePct}%
                        </span>
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.5 rounded font-extrabold text-[9.5px] ${
                            isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {m.record.outcome}
                        </span>
                      </td>
                      <td
                        className={`p-2 font-bold ${
                          m.record.returnR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.record.returnR > 0 ? '+' : ''}{m.record.returnR} R ({m.record.realizedPnlPct}%)
                      </td>
                      <td className="p-2 text-gray-400">
                        +{m.record.mfeR}R / {m.record.maeR}R
                      </td>
                      <td className="p-2 text-[10px] text-gray-400">{m.record.exitReason}</td>
                      <td className="p-2 text-right text-gray-400">{m.record.holdingTimeMins}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WALK-FORWARD & OUT-OF-SAMPLE VALIDATION                             */}
      {/* ========================================================================= */}
      {activeTab === 'WALK_FORWARD' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between bg-[#0A0B0E] p-3 border border-[#1F2937] rounded">
            <div>
              <span className="font-extrabold text-white uppercase tracking-wider text-xs block">
                Strict Out-of-Sample Partitioning & Execution Cost Engine
              </span>
              <span className="text-[10px] text-gray-400">
                Partitions historical candles into In-Sample (60%), Out-of-Sample (20%), and Walk-Forward (20%)
              </span>
            </div>

            <button
              onClick={handleRunWalkForward}
              disabled={isWfRunning}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded flex items-center space-x-1.5 text-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isWfRunning ? 'Simulating Periods...' : 'Re-Run Walk-Forward Validation'}</span>
            </button>
          </div>

          {walkForwardReport && (
            <div className="space-y-4">
              {/* Overfitting Stability Banner */}
              <div
                className={`p-3 rounded border flex items-center justify-between ${
                  walkForwardReport.isOverfitWarning
                    ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                    : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {walkForwardReport.isOverfitWarning ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="font-bold text-xs">
                    {walkForwardReport.isOverfitWarning
                      ? `⚠️ OVERFITTING DETECTED: Out-of-sample performance degraded by ${walkForwardReport.outOfSampleDegradationPct}% vs In-Sample calibration.`
                      : `✓ ROBUST PARAMETER STABILITY: Out-of-sample expectancy holds firmly (Degradation: ${walkForwardReport.outOfSampleDegradationPct}%).`}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9.5px] text-gray-400 block uppercase">Stability Score</span>
                  <span className="text-base font-black text-white">
                    {walkForwardReport.parameterStabilityScore} / 100
                  </span>
                </div>
              </div>

              {/* 3 Partitioned Period Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. In-Sample */}
                <div className="bg-[#0A0B0E] p-3.5 border border-[#1F2937] rounded space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase">1. In-Sample (60%)</span>
                    <span className="text-[9.5px] text-gray-500">Training & Calibration</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[9px] text-gray-500 block">Win Rate</span>
                      <span className="font-black text-emerald-400">{walkForwardReport.inSample.winRatePct}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Expectancy E(R)</span>
                      <span className="font-black text-white">+{walkForwardReport.inSample.expectancyInR} R</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Profit Factor</span>
                      <span className="font-bold text-white">{walkForwardReport.inSample.profitFactor}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Max Drawdown</span>
                      <span className="font-bold text-rose-400">{walkForwardReport.inSample.maxDrawdownPct}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Recovery Factor</span>
                      <span className="font-bold text-blue-400">{walkForwardReport.inSample.recoveryFactor}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Net Return</span>
                      <span className="font-bold text-emerald-400">{walkForwardReport.inSample.netReturnPct}%</span>
                    </div>
                  </div>
                </div>

                {/* 2. Out-of-Sample */}
                <div className="bg-[#0A0B0E] p-3.5 border border-blue-500/40 rounded space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                    <span className="text-xs font-bold text-blue-400 uppercase">2. Out-of-Sample (20%)</span>
                    <span className="text-[9.5px] text-gray-500">Validation Testing</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[9px] text-gray-500 block">Win Rate</span>
                      <span className="font-black text-emerald-400">{walkForwardReport.outOfSample.winRatePct}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Expectancy E(R)</span>
                      <span className="font-black text-white">+{walkForwardReport.outOfSample.expectancyInR} R</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Profit Factor</span>
                      <span className="font-bold text-white">{walkForwardReport.outOfSample.profitFactor}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Max Drawdown</span>
                      <span className="font-bold text-rose-400">{walkForwardReport.outOfSample.maxDrawdownPct}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Recovery Factor</span>
                      <span className="font-bold text-blue-400">{walkForwardReport.outOfSample.recoveryFactor}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Net Return</span>
                      <span className="font-bold text-emerald-400">{walkForwardReport.outOfSample.netReturnPct}%</span>
                    </div>
                  </div>
                </div>

                {/* 3. Walk-Forward */}
                <div className="bg-[#0A0B0E] p-3.5 border border-emerald-500/40 rounded space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase">3. Walk-Forward (20%)</span>
                    <span className="text-[9.5px] text-gray-500">Simulated Live Forward</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[9px] text-gray-500 block">Win Rate</span>
                      <span className="font-black text-emerald-400">{walkForwardReport.walkForward.winRatePct}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Expectancy E(R)</span>
                      <span className="font-black text-white">+{walkForwardReport.walkForward.expectancyInR} R</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Profit Factor</span>
                      <span className="font-bold text-white">{walkForwardReport.walkForward.profitFactor}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Max Drawdown</span>
                      <span className="font-bold text-rose-400">{walkForwardReport.walkForward.maxDrawdownPct}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Recovery Factor</span>
                      <span className="font-bold text-blue-400">{walkForwardReport.walkForward.recoveryFactor}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block">Net Return</span>
                      <span className="font-bold text-emerald-400">{walkForwardReport.walkForward.netReturnPct}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Realistic Costs & Slippage Breakdown */}
              <div className="bg-[#0A0B0E] p-3 border border-[#1F2937] rounded flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 uppercase">Realistic Indian Transaction Costs:</span>
                  <span className="font-bold text-rose-400">₹{walkForwardReport.totalTransactionCostINR.toLocaleString('en-IN')}</span>
                  <span className="text-gray-500">(STT + GST + Exchange + SEBI + Stamp Duty)</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 uppercase">Simulated Slippage Drag (0.25%):</span>
                  <span className="font-bold text-amber-400">₹{walkForwardReport.totalSlippageCostINR.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
