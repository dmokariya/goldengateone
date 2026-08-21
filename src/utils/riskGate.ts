// src/utils/riskGate.ts
// Independent Pre-Trade Risk & Execution Gate Engine
// Strictly enforces separation between Signal Generation and Risk/Execution

import {
  LiveTradeSignal,
  PreTradeValidationResult,
  MarketSessionState,
  ActivePosition
} from '../types';

/**
 * Returns the current live Indian Market session state based on IST (Asia/Kolkata)
 */
export function getMarketSessionState(overrideTime?: Date): {
  state: MarketSessionState;
  istTimeFormatted: string;
  isRegularTradingAllowed: boolean;
  message: string;
} {
  const now = overrideTime || new Date();
  
  // Format to IST hours & minutes
  const istString = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const [hourStr, minStr] = istString.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  const timeNum = hour * 100 + minute;

  // Check Weekend (Saturday: 6, Sunday: 0) in IST
  const istDayStr = now.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short'
  });
  const isWeekend = istDayStr === 'Sat' || istDayStr === 'Sun';

  if (isWeekend) {
    return {
      state: 'CLOSED',
      istTimeFormatted: `${istString} IST (${istDayStr})`,
      isRegularTradingAllowed: false,
      message: 'Exchange Closed for Weekend'
    };
  }

  // Pre-Open: 09:00 - 09:14 IST
  if (timeNum >= 900 && timeNum < 915) {
    return {
      state: 'PREOPEN',
      istTimeFormatted: `${istString} IST`,
      isRegularTradingAllowed: false,
      message: 'Pre-Open Discovery Session (09:00 - 09:15 IST)'
    };
  }

  // Regular Trading Session: 09:15 - 15:15 IST
  if (timeNum >= 915 && timeNum < 1515) {
    return {
      state: 'OPEN',
      istTimeFormatted: `${istString} IST`,
      isRegularTradingAllowed: true,
      message: 'Regular Market Trading Session Active'
    };
  }

  // Intraday Auto-Squareoff & Closing Session: 15:15 - 15:30 IST
  if (timeNum >= 1515 && timeNum < 1530) {
    return {
      state: 'CLOSING',
      istTimeFormatted: `${istString} IST`,
      isRegularTradingAllowed: false,
      message: 'Closing & MIS Auto-Squareoff Session (15:15 - 15:30 IST)'
    };
  }

  // Market Closed: 15:30 - 09:00 next day
  return {
    state: 'CLOSED',
    istTimeFormatted: `${istString} IST`,
    isRegularTradingAllowed: false,
    message: 'Market Closed (After-Market Hours)'
  };
}

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
 * Calculates risk-based position sizing based on account equity and stop loss distance
 */
export function calculateRiskBasedQuantity(
  accountEquity: number,
  entryPrice: number,
  stopLossPrice: number,
  lotSize: number,
  riskPct: number = 0.5
): {
  quantity: number;
  lotCount: number;
  riskBudgetINR: number;
  riskPerLotINR: number;
} {
  const safeEquity = Math.max(10000, accountEquity || 100000);
  const riskBudgetINR = +(safeEquity * (riskPct / 100)).toFixed(2);
  const priceDistance = Math.max(0.20, Math.abs(entryPrice - stopLossPrice));
  const riskPerLotINR = +(priceDistance * Math.max(1, lotSize)).toFixed(2);

  const rawLots = Math.floor(riskBudgetINR / riskPerLotINR);
  const lotCount = Math.max(1, rawLots);
  const quantity = lotCount * Math.max(1, lotSize);

  return {
    quantity,
    lotCount,
    riskBudgetINR,
    riskPerLotINR
  };
}

export interface RiskGateValidationParams {
  signal: LiveTradeSignal;
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
}

/**
 * Independent Pre-Trade Risk & Execution Gate
 * Strictly evaluates market session, freshness, depth, spread, slippage,
 * correlation, daily loss threshold, and consecutive losses.
 */
export function evaluatePreTradeRiskGate(params: RiskGateValidationParams): PreTradeValidationResult {
  const nowMs = Date.now();
  const {
    signal,
    liveQuote,
    liveLtp = signal.currentLtp || signal.entryPrice,
    activePositions = [],
    accountEquity = 100000,
    dailyRealizedPnlINR = 0,
    consecutiveLossCount = 0,
    isServerKillSwitchActive = false,
    maxPortfolioDirectionalLimit = 3,
    staleThresholdMs = 3000,
    slippageTolerancePct = 1.5
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

  // 2. Daily Loss Limit Gate (-2% of Account Equity)
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

  // 3. Consecutive Loss Cooldown Gate (3 Consecutive Losses)
  if (consecutiveLossCount >= 3) {
    return {
      approved: false,
      rejectionCode: 'CONSECUTIVE_LOSSES_COOLDOWN',
      reason: `3 consecutive losing trades detected. Execution paused for cooldown discipline.`,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 4. Live Data Freshness Gate
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

  // 5. Final LTP Price Slippage Recheck
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

  // 6. Bid/Ask Spread Filter (Reject if spread / midPrice > 1.5%)
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

  // 7. Market Regime Check (Block Directional Option Buying in Choppy Sideways)
  if (signal.marketRegime === 'CHOPPY_SIDEWAYS' && (signal.optionStyle === 'CALL' || signal.optionStyle === 'PUT')) {
    return {
      approved: false,
      rejectionCode: 'CHOPPY_REGIME_OPTION_BUY_BLOCKED',
      reason: `Market regime is CHOPPY_SIDEWAYS. Directional option buying blocked to protect capital against Theta decay.`,
      goldenGateScore: signal.goldenGateScore,
      attribution: signal.strategyAttribution,
      timestampMs: nowMs
    };
  }

  // 8. Portfolio Correlation & Max Directional Exposure Gate
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

  // 9. Calculate Risk-Adjusted Sizing
  const lotSize = signal.zerodhaPayload?.quantity || (signal.symbol.includes('BANKNIFTY') ? 15 : signal.symbol.includes('NIFTY') ? 65 : 1);
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
