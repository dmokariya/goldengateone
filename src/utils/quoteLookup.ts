/**
 * Real-Time Quote Resolver & Intraday Risk Guardian Engine
 * Provides normalized, multi-alias quote resolution across Zerodha Kite prefixes,
 * exchange formats (NFO:, NSE:, BFO:), compact/spaced option contracts, and robust SL/Target tracking.
 */

export interface NormalizedQuote {
  lastPrice: number;
  changePct: number;
  high?: number;
  low?: number;
  close?: number;
  open?: number;
  volume?: number;
  oi?: number;
  source?: string;
  foundKey?: string;
  timestampMs?: number;
  isLtpAvailable?: boolean;
}

/**
 * Strips exchange prefixes, spaces, and normalizes symbol strings for resilient comparison.
 */
export function normalizeSymbolKey(sym: string): string {
  if (!sym) return '';
  return sym
    .replace(/^(NFO:|NSE:|BSE:|BFO:|MCX:)/i, '')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Extracts underlying, strike, and option type (CE/PE) from any option symbol variation.
 */
export function parseOptionContract(sym: string): {
  isOption: boolean;
  underlying: string;
  strike: number;
  optionType: 'CE' | 'PE';
} {
  const norm = normalizeSymbolKey(sym);
  const isCE = norm.endsWith('CE');
  const isPE = norm.endsWith('PE');

  if (!isCE && !isPE) {
    return { isOption: false, underlying: norm, strike: 0, optionType: 'CE' };
  }

  const optionType: 'CE' | 'PE' = isCE ? 'CE' : 'PE';
  const strikeMatch = norm.match(/(\d{3,6})(?:CE|PE)$/i);
  const strike = strikeMatch ? parseInt(strikeMatch[1], 10) : 0;

  let underlying = 'NIFTY';
  if (norm.startsWith('BANKNIFTY')) underlying = 'BANKNIFTY';
  else if (norm.startsWith('FINNIFTY')) underlying = 'FINNIFTY';
  else if (norm.startsWith('MIDCPNIFTY')) underlying = 'MIDCPNIFTY';
  else if (norm.startsWith('SENSEX')) underlying = 'SENSEX';
  else if (norm.startsWith('NIFTY')) underlying = 'NIFTY';
  else {
    const m = norm.match(/^[A-Z&]+/);
    if (m) underlying = m[0].replace(/\d.*$/, '');
  }

  return { isOption: true, underlying, strike, optionType };
}

/**
 * Multi-pass robust quote finder:
 * 1. Direct key match (e.g. quotes['NIFTY26AUG24300CE'])
 * 2. Exchange prefix match (e.g. quotes['NFO:NIFTY26AUG24300CE'] or quotes['NSE:...'])
 * 3. Tradingsymbol fallback
 * 4. Normalized string match (ignoring spaces, colons, case)
 * 5. Parsed Option strike & type semantic match
 */
export function lookupLiveQuote(
  symbol: string,
  tradingsymbol: string | undefined,
  quotes: Record<string, any>
): NormalizedQuote | null {
  if (!quotes || typeof quotes !== 'object') return null;

  // Pass 1: Direct key lookup
  if (symbol && quotes[symbol] && typeof quotes[symbol].lastPrice === 'number' && quotes[symbol].lastPrice > 0) {
    return { ...quotes[symbol], foundKey: symbol };
  }

  // Pass 2: Tradingsymbol direct lookup
  if (tradingsymbol && quotes[tradingsymbol] && typeof quotes[tradingsymbol].lastPrice === 'number' && quotes[tradingsymbol].lastPrice > 0) {
    return { ...quotes[tradingsymbol], foundKey: tradingsymbol };
  }

  // Pass 3: Common prefix lookups
  const prefixes = ['NFO:', 'NSE:', 'BSE:', 'BFO:'];
  for (const pref of prefixes) {
    if (symbol) {
      const withPref = pref + symbol.replace(/^(NFO:|NSE:|BSE:|BFO:)/i, '');
      if (quotes[withPref] && typeof quotes[withPref].lastPrice === 'number' && quotes[withPref].lastPrice > 0) {
        return { ...quotes[withPref], foundKey: withPref };
      }
    }
    if (tradingsymbol) {
      const withPref = pref + tradingsymbol.replace(/^(NFO:|NSE:|BSE:|BFO:)/i, '');
      if (quotes[withPref] && typeof quotes[withPref].lastPrice === 'number' && quotes[withPref].lastPrice > 0) {
        return { ...quotes[withPref], foundKey: withPref };
      }
    }
  }

  // Pass 4: Normalized key comparison across all quote dictionary entries
  const normSym = normalizeSymbolKey(symbol);
  const normTrading = normalizeSymbolKey(tradingsymbol || '');

  for (const [key, q] of Object.entries(quotes)) {
    if (!q || typeof q.lastPrice !== 'number' || q.lastPrice <= 0) continue;
    const normK = normalizeSymbolKey(key);
    if (normSym && (normK === normSym || normK.includes(normSym) || normSym.includes(normK))) {
      return { ...q, foundKey: key };
    }
    if (normTrading && (normK === normTrading || normK.includes(normTrading) || normTrading.includes(normK))) {
      return { ...q, foundKey: key };
    }
  }

  // Pass 5: Semantic Option strike matching (e.g. 24300 CE for NIFTY)
  const parsed = parseOptionContract(symbol || tradingsymbol || '');
  if (parsed.isOption && parsed.strike > 0) {
    for (const [key, q] of Object.entries(quotes)) {
      if (!q || typeof q.lastPrice !== 'number' || q.lastPrice <= 0) continue;
      const qParsed = parseOptionContract(key);
      if (
        qParsed.isOption &&
        qParsed.underlying === parsed.underlying &&
        qParsed.strike === parsed.strike &&
        qParsed.optionType === parsed.optionType
      ) {
        return { ...q, foundKey: key };
      }
    }
  }

  return null;
}

/**
 * Calculates accurate Real-Time P&L and MTM percentage.
 */
export function calculateRealtimePnL(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  direction: 'BUY' | 'SELL'
): {
  pnlVal: number;
  pnlPct: number;
  isProfit: boolean;
} {
  if (!entryPrice || entryPrice <= 0 || !currentPrice || currentPrice <= 0) {
    return { pnlVal: 0, pnlPct: 0, isProfit: false };
  }

  const diff = direction === 'BUY' ? currentPrice - entryPrice : entryPrice - currentPrice;
  const pnlVal = +(diff * quantity).toFixed(2);
  const pnlPct = +((diff / entryPrice) * 100).toFixed(2);

  return {
    pnlVal,
    pnlPct,
    isProfit: pnlVal >= 0
  };
}

/**
 * Calculates complete live shadow trade metrics directly from Zerodha LTP.
 * Never uses theoretical prices, target prices, or cached entry prices for current MTM.
 */
export function calculateDynamicShadowMetrics(
  pos: {
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    quantity: number;
    stopLossPrice?: number;
    targetPrice?: number;
    highestPriceReached?: number;
    lowestPriceReached?: number;
    openedAtMs?: number;
  },
  liveLtp: number,
  quoteTimestampMs: number = Date.now()
): {
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  pnlInR: number;
  highestPriceReached: number;
  lowestPriceReached: number;
  mfe: number;
  mfePct: number;
  mfeR: number;
  mae: number;
  maePct: number;
  maeR: number;
  distanceToSL: number;
  distanceToTarget: number;
  holdingTimeMins: number;
  holdingTimeSecs: number;
  durationFormatted: string;
  quoteAgeSeconds: number;
  isStale: boolean;
  isLtpAvailable: boolean;
} {
  const isBuy = pos.direction === 'BUY';
  const entry = pos.entryPrice > 0 ? pos.entryPrice : liveLtp;
  const currentPrice = liveLtp > 0 ? liveLtp : entry;
  const isLtpAvailable = liveLtp > 0;

  // Realized / Unrealized MTM
  const diff = isBuy ? currentPrice - entry : entry - currentPrice;
  const unrealizedPnL = +(diff * pos.quantity).toFixed(2);
  const unrealizedPnLPct = entry > 0 ? +((diff / entry) * 100).toFixed(2) : 0;

  // Risk Budget & R-Multiple
  const stopLoss = pos.stopLossPrice && pos.stopLossPrice > 0 ? pos.stopLossPrice : (isBuy ? entry * 0.9 : entry * 1.1);
  const riskPerUnit = Math.max(0.1, Math.abs(entry - stopLoss));
  const riskBudgetINR = Math.max(1, riskPerUnit * pos.quantity);
  const pnlInR = +(unrealizedPnL / riskBudgetINR).toFixed(2);

  // Peak and Trough Extremes (MFE / MAE)
  const highestPriceReached = Math.max(pos.highestPriceReached || entry, currentPrice);
  const lowestPriceReached = Math.min(pos.lowestPriceReached || entry, currentPrice);

  // MFE (Max Favourable Excursion)
  const mfeDiff = isBuy ? highestPriceReached - entry : entry - lowestPriceReached;
  const mfe = Math.max(0, +(mfeDiff * pos.quantity).toFixed(2));
  const mfePct = entry > 0 ? Math.max(0, +((mfeDiff / entry) * 100).toFixed(2)) : 0;
  const mfeR = Math.max(0, +(mfe / riskBudgetINR).toFixed(2));

  // MAE (Max Adverse Excursion)
  const maeDiff = isBuy ? entry - lowestPriceReached : highestPriceReached - entry;
  const mae = -Math.max(0, +(maeDiff * pos.quantity).toFixed(2));
  const maePct = entry > 0 ? -Math.max(0, +((maeDiff / entry) * 100).toFixed(2)) : 0;
  const maeR = -Math.max(0, +(Math.abs(mae) / riskBudgetINR).toFixed(2));

  // Distances to SL and Target
  const distanceToSL = +(Math.abs(currentPrice - (pos.stopLossPrice || stopLoss))).toFixed(2);
  const distanceToTarget = pos.targetPrice ? +(Math.abs(pos.targetPrice - currentPrice)).toFixed(2) : 0;

  // Live Trade Duration
  const now = Date.now();
  const opened = pos.openedAtMs || now;
  const totalElapsedSecs = Math.max(0, Math.floor((now - opened) / 1000));
  const holdingTimeMins = +(totalElapsedSecs / 60).toFixed(1);
  const holdingTimeSecs = totalElapsedSecs;
  const minsPart = Math.floor(totalElapsedSecs / 60);
  const secsPart = totalElapsedSecs % 60;
  const durationFormatted = `${minsPart.toString().padStart(2, '0')}:${secsPart.toString().padStart(2, '0')}`;

  // Quote Freshness
  const quoteAgeSeconds = quoteTimestampMs > 0 ? +((now - quoteTimestampMs) / 1000).toFixed(1) : 999;
  const isStale = quoteAgeSeconds > 3.0 || !isLtpAvailable;

  return {
    currentPrice,
    unrealizedPnL,
    unrealizedPnLPct,
    pnlInR,
    highestPriceReached,
    lowestPriceReached,
    mfe,
    mfePct,
    mfeR,
    mae,
    maePct,
    maeR,
    distanceToSL,
    distanceToTarget,
    holdingTimeMins,
    holdingTimeSecs,
    durationFormatted,
    quoteAgeSeconds,
    isStale,
    isLtpAvailable
  };
}

/**
 * Validates whether an active position has breached Stop Loss, Trailing Stop Loss, or Target.
 */
export function evaluateRiskGuardianExit(
  pos: {
    symbol: string;
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    currentPrice: number;
    stopLossPrice: number;
    targetPrice: number;
    trailingStopLossPrice?: number;
    highestPriceReached?: number;
    holdingTimeMins?: number;
    maxAllowedMins?: number;
  },
  liveLtp: number
): {
  shouldExit: boolean;
  exitReason: 'STOP_LOSS_HIT' | 'TRAILING_STOP_HIT' | 'TARGET_HIT' | 'TIME_STOP_EXPIRED' | null;
  description: string;
  suggestedTSL: number;
} {
  // Fail Closed Policy: If real Zerodha LTP is unavailable, freeze risk evaluation to prevent spurious exits
  if (!liveLtp || liveLtp <= 0) {
    return {
      shouldExit: false,
      exitReason: null,
      description: `LTP UNAVAILABLE (Fail Closed): Verified Zerodha quote missing; risk evaluation frozen.`,
      suggestedTSL: pos.trailingStopLossPrice || pos.stopLossPrice
    };
  }

  const isBuy = pos.direction === 'BUY';
  const effectivePrice = liveLtp;

  // Dynamic Trailing Stop Loss calculation
  const highestPrice = Math.max(pos.highestPriceReached || pos.entryPrice, effectivePrice);
  const pnlDiff = isBuy ? effectivePrice - pos.entryPrice : pos.entryPrice - effectivePrice;
  const pnlPct = pos.entryPrice > 0 ? (pnlDiff / pos.entryPrice) * 100 : 0;

  let suggestedTSL = pos.trailingStopLossPrice || pos.stopLossPrice;

  // Move TSL to break-even at +5% gain
  if (pnlPct >= 5.0 && (isBuy ? suggestedTSL < pos.entryPrice : suggestedTSL > pos.entryPrice)) {
    suggestedTSL = pos.entryPrice;
  }
  // Lock +5% profit floor at +10% gain
  if (pnlPct >= 10.0 && (isBuy ? suggestedTSL < pos.entryPrice * 1.05 : suggestedTSL > pos.entryPrice * 0.95)) {
    suggestedTSL = +(isBuy ? pos.entryPrice * 1.05 : pos.entryPrice * 0.95).toFixed(2);
  }

  // 1. Target Hit check
  if (pos.targetPrice > 0) {
    if (isBuy && effectivePrice >= pos.targetPrice) {
      return {
        shouldExit: true,
        exitReason: 'TARGET_HIT',
        description: `Target hit: Live LTP ₹${effectivePrice.toFixed(2)} reached target ₹${pos.targetPrice.toFixed(2)} (+${pnlPct.toFixed(1)}%)`,
        suggestedTSL
      };
    } else if (!isBuy && effectivePrice <= pos.targetPrice) {
      return {
        shouldExit: true,
        exitReason: 'TARGET_HIT',
        description: `Target hit: Live LTP ₹${effectivePrice.toFixed(2)} reached target ₹${pos.targetPrice.toFixed(2)} (+${pnlPct.toFixed(1)}%)`,
        suggestedTSL
      };
    }
  }

  // 2. Trailing Stop Loss check
  if (suggestedTSL > 0 && suggestedTSL !== pos.stopLossPrice) {
    if (isBuy && effectivePrice <= suggestedTSL) {
      return {
        shouldExit: true,
        exitReason: 'TRAILING_STOP_HIT',
        description: `Trailing Stop Loss hit: Live LTP ₹${effectivePrice.toFixed(2)} dropped below locked TSL ₹${suggestedTSL.toFixed(2)}`,
        suggestedTSL
      };
    } else if (!isBuy && effectivePrice >= suggestedTSL) {
      return {
        shouldExit: true,
        exitReason: 'TRAILING_STOP_HIT',
        description: `Trailing Stop Loss hit: Live LTP ₹${effectivePrice.toFixed(2)} rose above locked TSL ₹${suggestedTSL.toFixed(2)}`,
        suggestedTSL
      };
    }
  }

  // 3. Hard Stop Loss check
  if (pos.stopLossPrice > 0) {
    if (isBuy && effectivePrice <= pos.stopLossPrice) {
      return {
        shouldExit: true,
        exitReason: 'STOP_LOSS_HIT',
        description: `Stop Loss breached: Live LTP ₹${effectivePrice.toFixed(2)} fell to/below SL ₹${pos.stopLossPrice.toFixed(2)} (${pnlPct.toFixed(1)}%)`,
        suggestedTSL
      };
    } else if (!isBuy && effectivePrice >= pos.stopLossPrice) {
      return {
        shouldExit: true,
        exitReason: 'STOP_LOSS_HIT',
        description: `Stop Loss breached: Live LTP ₹${effectivePrice.toFixed(2)} rose to/above SL ₹${pos.stopLossPrice.toFixed(2)} (${pnlPct.toFixed(1)}%)`,
        suggestedTSL
      };
    }
  }

  // 4. Time Stop Check (12 minutes max scalping window)
  const maxMins = pos.maxAllowedMins || 12;
  const holdingMins = pos.holdingTimeMins || 0;
  if (holdingMins >= maxMins && Math.abs(pnlPct) <= 1.0) {
    return {
      shouldExit: true,
      exitReason: 'TIME_STOP_EXPIRED',
      description: `Time-Stop Expired: Position stagnant (${pnlPct.toFixed(1)}%) after ${holdingMins} minutes. Auto-closing to free capital.`,
      suggestedTSL
    };
  }

  return {
    shouldExit: false,
    exitReason: null,
    description: `Position healthy: LTP ₹${effectivePrice.toFixed(2)} within SL ₹${pos.stopLossPrice.toFixed(2)} and Target ₹${pos.targetPrice.toFixed(2)}`,
    suggestedTSL
  };
}
