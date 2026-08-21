// src/utils/riskGate.ts
// Independent Pre-Trade Risk & Execution Gate Engine
// Strictly enforces institutional separation between Signal Generation and Risk/Execution
// Integrates Market Calendar, Depth Absorption, OI Liquidity, DTE Regimes, and Master Lot Sizing.

import {
  LiveTradeSignal,
  PreTradeValidationResult,
  MarketSessionState,
  ActivePosition,
  RejectionCode
} from '../types';
import { evaluateMarketCalendar } from './marketCalendar';
import { evaluateDteRegime, calculatePortfolioGreeks, calculateVolatilityAdjustedStop } from './optionEngine';

export { getMarketSessionState } from './marketCalendarLegacy';

/**
 * Calculates complete Indian F&O regulatory taxes & transaction charges
 * (Brokerage, STT, Exchange Fees, GST, SEBI turnover, Stamp Duty)
 */
export function calculateIndianFnoTransactionCosts(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  isOption: boolean = true
): {
  brokerageINR: number;
  sttINR: number;
  exchangeFeeINR: number;
  gstINR: number;
  sebiFeeINR: number;
  stampDutyINR: number;
  totalCostINR: number;
} {
  const buyTurnover = entryPrice * quantity;
  const sellTurnover = exitPrice * quantity;
  const totalTurnover = buyTurnover + sellTurnover;

  // Zerodha Flat Brokerage: ₹20 per executed order (₹40 round-trip)
  const brokerageINR = 40.0;

  // STT (Securities Transaction Tax):
  // Options: 0.125% on sell side turnover
  // Equities Intraday: 0.025% on sell side turnover
  const sttRate = isOption ? 0.00125 : 0.00025;
  const sttINR = +(sellTurnover * sttRate).toFixed(2);

  // Exchange Turnover Charges (NSE: 0.053% on option premium turnover, 0.00297% on equity)
  const exchRate = isOption ? 0.00053 : 0.0000297;
  const exchangeFeeINR = +(totalTurnover * exchRate).toFixed(2);

  // GST: 18% on (Brokerage + Exchange Fees)
  const gstINR = +((brokerageINR + exchangeFeeINR) * 0.18).toFixed(2);

  // SEBI Turnover Charge: ₹10 per Crore (0.0001%)
  const sebiFeeINR = +(totalTurnover * 0.000001).toFixed(2);

  // Stamp Duty: 0.003% on buy turnover for options (0.003% for equity)
  const stampDutyINR = +(buyTurnover * 0.00003).toFixed(2);

  const totalCostINR = +(brokerageINR + sttINR + exchangeFeeINR + gstINR + sebiFeeINR + stampDutyINR).toFixed(2);

  return {
    brokerageINR,
    sttINR,
    exchangeFeeINR,
    gstINR,
    sebiFeeINR,
    stampDutyINR,
    totalCostINR
  };
}

/**
 * Calculates risk-based position sizing based on account equity, stop loss distance,
 * instrument master lot size, and maximum premium-at-risk caps.
 * LOT SIZE IS DERIVED EXCLUSIVELY FROM THE INSTRUMENT MASTER (Never signal quantity).
 */
export function calculateRiskBasedQuantity(
  accountEquity: number,
  entryPrice: number,
  stopLossPrice: number,
  instrumentMasterLotSize: number,
  riskPct: number = 0.5,
  maxPremiumAtRiskINR?: number
): {
  quantity: number;
  lotCount: number;
  riskBudgetINR: number;
  riskPerLotINR: number;
  totalPremiumINR: number;
  cappedByMaxPremium: boolean;
} {
  const safeEquity = Math.max(10000, accountEquity || 100000);
  const riskBudgetINR = +(safeEquity * (riskPct / 100)).toFixed(2);
  const priceDistance = Math.max(0.20, Math.abs(entryPrice - stopLossPrice));
  const validLotSize = Math.max(1, instrumentMasterLotSize || 1);

  const riskPerLotINR = +(priceDistance * validLotSize).toFixed(2);
  let rawLots = Math.floor(riskBudgetINR / Math.max(1, riskPerLotINR));
  let lotCount = Math.max(1, rawLots);

  // Cap with Maximum Premium at Risk (e.g. 10% of equity or max ₹15,000)
  const effectiveMaxPremium = maxPremiumAtRiskINR || Math.min(25000, safeEquity * 0.15);
  let totalPremiumINR = lotCount * validLotSize * entryPrice;
  let cappedByMaxPremium = false;

  while (lotCount > 1 && totalPremiumINR > effectiveMaxPremium) {
    lotCount -= 1;
    totalPremiumINR = lotCount * validLotSize * entryPrice;
    cappedByMaxPremium = true;
  }

  const quantity = lotCount * validLotSize;

  return {
    quantity,
    lotCount,
    riskBudgetINR,
    riskPerLotINR,
    totalPremiumINR: +(totalPremiumINR).toFixed(2),
    cappedByMaxPremium
  };
}

export interface RiskGateValidationParams {
  signal: LiveTradeSignal;
  resolvedInstrumentLotSize: number; // Strictly derived from instrument master
  liveQuote?: any;
  liveLtp?: number;
  activePositions?: ActivePosition[];
  accountEquity?: number;
  dailyRealizedPnlINR?: number;
  consecutiveLossCount?: number;
  isServerKillSwitchActive?: boolean;
  maxPortfolioDirectionalLimit?: number; // max 3 concurrent correlated positions
  staleThresholdMs?: number; // default 3000ms
  slippageTolerancePct?: number; // default 1.5%
  overrideTime?: Date;
}

/**
 * Institutional Pre-Trade Risk & Execution Gate
 * Strictly evaluates session calendar, opening filters, EOD cutoffs, freshness,
 * depth absorption, OI/volume liquidity, spread, slippage, IV sanity, and sizing.
 */
export function evaluatePreTradeRiskGate(params: RiskGateValidationParams): PreTradeValidationResult {
  const nowMs = Date.now();
  const {
    signal,
    resolvedInstrumentLotSize,
    liveQuote,
    liveLtp = signal.currentLtp || signal.entryPrice,
    activePositions = [],
    accountEquity = 100000,
    dailyRealizedPnlINR = 0,
    consecutiveLossCount = 0,
    isServerKillSwitchActive = false,
    maxPortfolioDirectionalLimit = 3,
    staleThresholdMs = 3000,
    slippageTolerancePct = 1.5,
    overrideTime
  } = params;

  // 1. Server-Side Kill Switch Check
  if (isServerKillSwitchActive) {
    return {
      approved: false,
      rejectionCode: 'SERVER_KILL_SWITCH_ACTIVE',
      reason: 'Emergency server kill switch active. All automated & manual order routing blocked.',
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 2. Official Indian Market Calendar & Trading Session Gate
  const calendarStatus = evaluateMarketCalendar(overrideTime);
  if (!calendarStatus.isOpen) {
    return {
      approved: false,
      rejectionCode: calendarStatus.isHoliday ? 'HOLIDAY_CLOSED' : 'MARKET_SESSION_CLOSED',
      reason: calendarStatus.reason,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 3. Opening Volatility Discovery Gate (09:15 - 09:25 IST)
  if (calendarStatus.isOpeningFilterActive) {
    // If signal confluence score is not exceptionally high (e.g. >= 90), block early entry
    if ((signal.goldenGateScore || 0) < 90) {
      return {
        approved: false,
        rejectionCode: 'OPENING_VOLATILITY_FILTER',
        reason: 'Opening Volatility Filter (09:15 - 09:25 IST): Early morning market structure establishing. Entry restricted.',
        goldenGateScore: signal.goldenGateScore,
        attribution: signal.strategyAttribution,
        timestampMs: nowMs
      };
    }
  }

  // 4. End-of-Day Intraday Entry Cutoff Gate (14:45+ IST)
  if (calendarStatus.isEodCutoffActive) {
    return {
      approved: false,
      rejectionCode: 'EOD_ENTRY_CUTOFF',
      reason: 'EOD Entry Cutoff Active (14:45 - 15:15 IST): No new intraday MIS positions allowed to avoid overnight carry risks.',
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 5. Daily Loss Limit Gate (-2% of Account Equity)
  const maxDailyLossAllowed = -(accountEquity * 0.02);
  if (dailyRealizedPnlINR <= maxDailyLossAllowed) {
    return {
      approved: false,
      rejectionCode: 'DAILY_LOSS_LIMIT_BREACHED',
      reason: `Daily loss limit reached (₹${dailyRealizedPnlINR.toFixed(2)} / Limit: ₹${maxDailyLossAllowed.toFixed(2)}). Circuit breaker tripped.`,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 6. Consecutive Loss Cooldown Gate (3 Consecutive Losses)
  if (consecutiveLossCount >= 3) {
    return {
      approved: false,
      rejectionCode: 'CONSECUTIVE_LOSSES_COOLDOWN',
      reason: `3 consecutive losing trades detected. Execution paused for risk discipline cooldown.`,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 7. Live Data Freshness Gate
  const quoteTimestamp = liveQuote?.timestampMs || signal.dataTimestampMs || 0;
  const quoteAgeMs = nowMs - quoteTimestamp;
  if (signal.source !== 'ZERODHA_KITE_LIVE' || quoteAgeMs > staleThresholdMs) {
    return {
      approved: false,
      rejectionCode: 'STALE_DATA',
      reason: `Market feed is stale (Quote age: ${quoteAgeMs > 60000 ? Math.round(quoteAgeMs / 1000) + 's' : quoteAgeMs + 'ms'} > ${staleThresholdMs}ms threshold). Live data required.`,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 8. Final LTP Price Slippage Recheck
  const priceDiscrepancyPct = Math.abs(signal.entryPrice - liveLtp) / Math.max(0.1, liveLtp) * 100;
  if (priceDiscrepancyPct > slippageTolerancePct) {
    return {
      approved: false,
      rejectionCode: 'PRICE_SLIPPED',
      reason: `Live price slipped by ${priceDiscrepancyPct.toFixed(2)}% (Signal Entry: ₹${signal.entryPrice}, Live LTP: ₹${liveLtp}). Recalibration required.`,
      validatedPrice: liveLtp,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 9. Bid/Ask Spread Filter (Reject if spread / midPrice > 1.5%)
  if (liveQuote?.depth?.buy?.[0] && liveQuote?.depth?.sell?.[0]) {
    const topBid = liveQuote.depth.buy[0].price;
    const topAsk = liveQuote.depth.sell[0].price;
    const midPrice = (topBid + topAsk) / 2;
    const spreadPct = ((topAsk - topBid) / Math.max(0.1, midPrice)) * 100;
    if (spreadPct > 1.5) {
      return {
        approved: false,
        rejectionCode: 'EXCESSIVE_SPREAD',
        reason: `Excessive bid/ask spread of ${spreadPct.toFixed(2)}% (Top Bid: ₹${topBid}, Top Ask: ₹${topAsk}). Execution rejected to avoid liquidity penalty.`,
        goldenGateScore: signal.goldenGateScore,
        attribution: signal.strategyAttribution,
        timestampMs: nowMs
      };
    }
  }

  // 10. Volume & Open Interest Liquidity Threshold
  const isOption = signal.optionStyle === 'CALL' || signal.optionStyle === 'PUT';
  const volume = liveQuote?.volume || 0;
  const oi = liveQuote?.oi || 0;
  if (isOption && volume > 0 && volume < 2000 && oi > 0 && oi < 15000) {
    return {
      approved: false,
      rejectionCode: 'LOW_OI_VOLUME_LIQUIDITY',
      reason: `Strike liquidity failure: Volume (${volume}) and Open Interest (${oi}) are below institutional execution thresholds.`,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 11. IV Sanity Filter (Block Buying Ultra-Inflated IV > 45%)
  if (isOption && signal.actualIV && signal.actualIV > 45) {
    return {
      approved: false,
      rejectionCode: 'IV_INFLATION_SANITY',
      reason: `IV Inflation Sanity: Implied Volatility (${signal.actualIV.toFixed(1)}%) is excessively inflated. Buying here carries severe IV crush risk.`,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 12. Market Regime Check (Block Directional Option Buying in Choppy Sideways)
  if (signal.marketRegime === 'CHOPPY_SIDEWAYS' && isOption) {
    return {
      approved: false,
      rejectionCode: 'CHOPPY_REGIME_OPTION_BUY_BLOCKED',
      reason: `Market regime is CHOPPY_SIDEWAYS. Directional option buying blocked to protect capital against Theta decay.`,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 13. Portfolio Correlation & Max Directional Exposure Gate
  const openPositions = activePositions.filter(p => p.status === 'OPEN');
  const isBullishSignal = signal.direction === 'BUY' && (signal.optionStyle === 'CALL' || signal.optionStyle === 'EQUITY');
  const isBearishSignal = signal.direction === 'BUY' && signal.optionStyle === 'PUT';

  let concurrentDirectionalCount = 0;
  for (const pos of openPositions) {
    const isPosBullish = (pos.tradingsymbol.includes('CE') || (!pos.tradingsymbol.includes('PE') && pos.direction === 'BUY'));
    const isPosBearish = pos.tradingsymbol.includes('PE');
    if (isBullishSignal && isPosBullish) concurrentDirectionalCount++;
    if (isBearishSignal && isPosBearish) concurrentDirectionalCount++;
  }

  if (concurrentDirectionalCount >= maxPortfolioDirectionalLimit) {
    return {
      approved: false,
      rejectionCode: 'MAX_PORTFOLIO_CORRELATION',
      reason: `Maximum correlated directional exposure reached (${concurrentDirectionalCount}/${maxPortfolioDirectionalLimit} concurrent positions in same market direction).`,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 14. Calculate Risk-Adjusted Sizing STRICTLY FROM INSTRUMENT MASTER LOT SIZE
  const lotSize = Math.max(1, resolvedInstrumentLotSize || 1);
  const sizing = calculateRiskBasedQuantity(accountEquity, liveLtp, signal.stopLossPrice, lotSize, 0.5);

  return {
    approved: true,
    validatedPrice: liveLtp,
    riskAdjustedQuantity: sizing.quantity,
    riskBudgetINR: sizing.riskBudgetINR,
    goldenGateScore: signal.goldenGateScore,
    attribution: signal.strategyAttribution,
    timestampMs: nowMs
  };
}
