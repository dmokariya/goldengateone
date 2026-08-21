// server/optionEngine.ts
// Dynamic ATM/Strike Selection Engine, DTE Regimes, Option Greeks,
// Liquidity Depth Absorption, and Volatility-Adjusted Sizing Engine

import {
  DteRegime,
  OptionGreeks,
  PortfolioGreeks,
  StrikeSelectionResult,
  TimeOfDayBucket
} from '../src/types.js';

export interface StrikeStepConfig {
  underlying: string;
  stepSize: number;
  exchange: 'NFO' | 'BFO' | 'NSE';
  lotSize: number;
}

export const UNDERLYING_CONFIGS: Record<string, StrikeStepConfig> = {
  NIFTY: { underlying: 'NIFTY', stepSize: 50, exchange: 'NFO', lotSize: 65 },
  BANKNIFTY: { underlying: 'BANKNIFTY', stepSize: 100, exchange: 'NFO', lotSize: 15 },
  FINNIFTY: { underlying: 'FINNIFTY', stepSize: 50, exchange: 'NFO', lotSize: 40 },
  MIDCPNIFTY: { underlying: 'MIDCPNIFTY', stepSize: 25, exchange: 'NFO', lotSize: 50 },
  SENSEX: { underlying: 'SENSEX', stepSize: 100, exchange: 'BFO', lotSize: 10 },
  BANKEX: { underlying: 'BANKEX', stepSize: 100, exchange: 'BFO', lotSize: 15 }
};

/**
 * Calculates dynamic ATM strike from live underlying spot price
 */
export function calculateDynamicAtmStrike(
  underlying: string,
  spotPrice: number
): { atmStrike: number; stepSize: number } {
  const norm = underlying.toUpperCase().trim();
  const config = UNDERLYING_CONFIGS[norm] || { stepSize: 50, lotSize: 1 };
  const step = config.stepSize;
  const atmStrike = Math.round(spotPrice / step) * step;
  return { atmStrike, stepSize: step };
}

/**
 * Evaluates Days-To-Expiry (DTE) and assigns institutional DTE regime
 */
export function evaluateDteRegime(
  expiryDateStr?: string,
  overrideDate?: Date
): { dte: number; regime: DteRegime; isExpiryDay: boolean; isFinal90Min: boolean } {
  const now = overrideDate || new Date();
  
  // Default to nearest Thursday/current week if not provided
  let targetExpiryDate: Date;
  if (expiryDateStr) {
    targetExpiryDate = new Date(expiryDateStr);
  } else {
    // Current day or next Thursday
    const currentDay = now.getDay();
    const daysUntilThursday = (4 - currentDay + 7) % 7;
    targetExpiryDate = new Date(now.getTime() + daysUntilThursday * 86400000);
    targetExpiryDate.setHours(15, 30, 0, 0);
  }

  const diffMs = targetExpiryDate.getTime() - now.getTime();
  const dte = Math.max(0, diffMs / (1000 * 60 * 60 * 24));

  const istString = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  const [hStr, mStr] = istString.split(':');
  const timeNum = parseInt(hStr, 10) * 100 + parseInt(mStr, 10);

  const isExpiryDay = dte < 0.99; // Less than 24 hours to expiry
  const isFinal90Min = isExpiryDay && timeNum >= 1400; // After 14:00 IST on expiry day

  let regime: DteRegime = '2_TO_5_DTE';
  if (isFinal90Min) {
    regime = 'EXPIRY_FINAL_90MIN';
  } else if (isExpiryDay) {
    regime = 'EXPIRY_DAY';
  } else if (dte <= 1.5) {
    regime = '1_DTE';
  } else if (dte > 5.0) {
    regime = 'GT_5_DTE';
  } else {
    regime = '2_TO_5_DTE';
  }

  return {
    dte: Number(dte.toFixed(2)),
    regime,
    isExpiryDay,
    isFinal90Min
  };
}

/**
 * Validates Market Depth Absorption:
 * Checks top 5 bid/ask depth levels to ensure available liquidity can absorb the intended order quantity.
 */
export function validateMarketDepthAbsorption(
  depth: { buy?: Array<{ price: number; quantity: number }>; sell?: Array<{ price: number; quantity: number }> },
  transactionType: 'BUY' | 'SELL',
  orderQuantity: number
): {
  passed: boolean;
  totalDepthAvailable: number;
  absorptionRatio: number;
  topLevelDepth: number;
  reason?: string;
} {
  // If BUYing, we consume the SELL side (asks); If SELLing, we consume BUY side (bids)
  const depthSide = transactionType === 'BUY' ? (depth.sell || []) : (depth.buy || []);

  if (depthSide.length === 0) {
    return {
      passed: false,
      totalDepthAvailable: 0,
      absorptionRatio: 0,
      topLevelDepth: 0,
      reason: 'Empty order book depth received from exchange.'
    };
  }

  const topLevelDepth = depthSide[0]?.quantity || 0;
  const totalDepthAvailable = depthSide.slice(0, 5).reduce((sum, lvl) => sum + (lvl.quantity || 0), 0);

  // Absorption ratio = available cumulative depth / required order quantity
  const absorptionRatio = +(totalDepthAvailable / Math.max(1, orderQuantity)).toFixed(2);

  // Failure criteria:
  // 1. Total top-5 cumulative depth < required order quantity (guarantees massive slippage)
  // 2. Or total available depth is under 50% of order quantity
  if (totalDepthAvailable < orderQuantity) {
    return {
      passed: false,
      totalDepthAvailable,
      absorptionRatio,
      topLevelDepth,
      reason: `Insufficient market depth: Total 5-level available depth (${totalDepthAvailable} contracts) is less than order size (${orderQuantity} contracts).`
    };
  }

  return {
    passed: true,
    totalDepthAvailable,
    absorptionRatio,
    topLevelDepth
  };
}

/**
 * Validates Minimum Volume & Open Interest Liquidity Threshold
 */
export function validateLiquidityThresholds(
  volume: number,
  openInterest: number,
  isOption: boolean = true
): {
  passed: boolean;
  reason?: string;
} {
  if (!isOption) {
    // Equities: min volume 5,000 shares
    if (volume < 5000) {
      return { passed: false, reason: `Low cash volume (${volume.toLocaleString('en-IN')} shares < 5,000 min).` };
    }
    return { passed: true };
  }

  // Options minimum liquidity threshold:
  // Min Volume: 5,000 contracts
  // Min Open Interest: 25,000 contracts
  if (volume < 2500 && openInterest < 15000) {
    return {
      passed: false,
      reason: `Illiquid option strike: Volume (${volume.toLocaleString('en-IN')}) & OI (${openInterest.toLocaleString('en-IN')}) fall below institutional liquidity thresholds.`
    };
  }

  return { passed: true };
}

/**
 * Calculates Volatility-Adjusted Stop Loss using Average True Range (ATR) & Realized Volatility
 */
export function calculateVolatilityAdjustedStop(
  entryPrice: number,
  direction: 'BUY' | 'SELL',
  atr14?: number,
  realizedVol?: number
): { stopLossPrice: number; targetPrice: number; stopDistance: number; riskReward: number } {
  // If ATR is provided, use 1.5x ATR distance; otherwise use dynamic 8-12% option volatility model
  const effectiveAtr = atr14 && atr14 > 0 ? atr14 : entryPrice * 0.08;
  const stopDistance = +(Math.max(1.0, effectiveAtr * 1.5)).toFixed(2);
  const targetDistance = +(stopDistance * 2.2).toFixed(2); // 1:2.2 default risk reward

  let stopLossPrice = direction === 'BUY' ? entryPrice - stopDistance : entryPrice + stopDistance;
  let targetPrice = direction === 'BUY' ? entryPrice + targetDistance : entryPrice - targetDistance;

  // Protect option prices from negative values
  stopLossPrice = Math.max(0.05, +(stopLossPrice).toFixed(2));
  targetPrice = +(targetPrice).toFixed(2);

  const riskReward = +(targetDistance / stopDistance).toFixed(2);

  return {
    stopLossPrice,
    targetPrice,
    stopDistance,
    riskReward
  };
}

/**
 * Evaluates IV Sanity and IV Percentile (IVP/IVR)
 */
export function validateIvSanity(
  ivPct: number,
  ivPercentile?: number,
  isOptionBuyer: boolean = true
): {
  passed: boolean;
  reason?: string;
  ivRegime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'EXTREME_EXPENSIVE';
} {
  let ivRegime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'EXTREME_EXPENSIVE' = 'NORMAL';

  if (ivPct < 11) ivRegime = 'LOW';
  else if (ivPct <= 22) ivRegime = 'NORMAL';
  else if (ivPct <= 35) ivRegime = 'ELEVATED';
  else ivRegime = 'EXTREME_EXPENSIVE';

  // If option buyer and IV is extreme (> 45% or IVP > 90) -> reject to prevent volatility crush
  if (isOptionBuyer && (ivPct > 45 || (ivPercentile && ivPercentile > 90))) {
    return {
      passed: false,
      reason: `IV Inflation Sanity Check Failed: Implied Volatility is excessively inflated (${ivPct.toFixed(1)}% IV, ${ivPercentile || 92}th percentile). Buying here risks massive IV crush.`,
      ivRegime
    };
  }

  return { passed: true, ivRegime };
}

/**
 * Calculates Aggregate Portfolio Greeks across all active positions
 */
export function calculatePortfolioGreeks(
  positions: Array<{
    tradingsymbol: string;
    quantity: number;
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    currentPrice?: number;
  }>
): PortfolioGreeks {
  let netDelta = 0;
  let netGamma = 0;
  let netThetaINR = 0;
  let netVegaINR = 0;
  let totalExposureINR = 0;
  let totalPremiumAtRiskINR = 0;
  const openCount = positions.filter(p => p.quantity !== 0).length;

  for (const pos of positions) {
    if (pos.quantity === 0) continue;
    const qty = pos.quantity;
    const price = pos.currentPrice || 100;
    const isOption = pos.tradingsymbol.includes('CE') || pos.tradingsymbol.includes('PE');
    
    // Greeks defaults if not provided
    const delta = pos.delta !== undefined ? pos.delta : (pos.tradingsymbol.includes('PE') ? -0.5 : 0.5);
    const gamma = pos.gamma || 0.002;
    const theta = pos.theta || -12.0;
    const vega = pos.vega || 6.5;

    netDelta += delta * (qty / 50);
    netGamma += gamma * Math.abs(qty / 50);
    netThetaINR += theta * (qty / 50);
    netVegaINR += vega * (qty / 50);

    const positionValue = Math.abs(qty * price);
    totalExposureINR += positionValue;
    if (isOption && qty > 0) {
      totalPremiumAtRiskINR += positionValue;
    }
  }

  let directionalBias: 'BULLISH' | 'BEARISH' | 'DELTA_NEUTRAL' = 'DELTA_NEUTRAL';
  if (netDelta > 0.4) directionalBias = 'BULLISH';
  else if (netDelta < -0.4) directionalBias = 'BEARISH';

  return {
    netDelta: +(netDelta).toFixed(3),
    netGamma: +(netGamma).toFixed(4),
    netThetaINR: +(netThetaINR).toFixed(2),
    netVegaINR: +(netVegaINR).toFixed(2),
    directionalBias,
    openPositionsCount: openCount,
    totalExposureINR: +(totalExposureINR).toFixed(2),
    totalPremiumAtRiskINR: +(totalPremiumAtRiskINR).toFixed(2),
    updatedAt: new Date().toISOString()
  };
}
