// src/utils/optionEngine.ts
// Dynamic ATM/Strike Selection, Option Greeks & DTE Engine (Client & Shared)

import {
  DteRegime,
  OptionGreeks,
  PortfolioGreeks,
  StrikeSelectionResult,
  TimeOfDayBucket
} from '../types';

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

export function evaluateDteRegime(
  expiryDateStr?: string,
  overrideDate?: Date
): { dte: number; regime: DteRegime; isExpiryDay: boolean; isFinal90Min: boolean } {
  const now = overrideDate || new Date();
  
  let targetExpiryDate: Date;
  if (expiryDateStr) {
    targetExpiryDate = new Date(expiryDateStr);
  } else {
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

  const isExpiryDay = dte < 0.99;
  const isFinal90Min = isExpiryDay && timeNum >= 1400;

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

export function calculateVolatilityAdjustedStop(
  entryPrice: number,
  direction: 'BUY' | 'SELL',
  atr14?: number,
  realizedVol?: number
): { stopLossPrice: number; targetPrice: number; stopDistance: number; riskReward: number } {
  const effectiveAtr = atr14 && atr14 > 0 ? atr14 : entryPrice * 0.08;
  const stopDistance = +(Math.max(1.0, effectiveAtr * 1.5)).toFixed(2);
  const targetDistance = +(stopDistance * 2.2).toFixed(2);

  let stopLossPrice = direction === 'BUY' ? entryPrice - stopDistance : entryPrice + stopDistance;
  let targetPrice = direction === 'BUY' ? entryPrice + targetDistance : entryPrice - targetDistance;

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
