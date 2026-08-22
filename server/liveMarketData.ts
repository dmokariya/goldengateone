/**
 * Live Market Data Provider
 * Fetches real-time market data for Indian Equities and Indices, and calculates
 * real-time Black-Scholes option pricing to ensure prices are NEVER stale.
 */

function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

function normPdf(x: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

export function calculateBlackScholes(params: {
  spot: number;
  strike: number;
  timeToExpiryYears: number;
  riskFreeRate: number;
  iv: number;
  isCall: boolean;
}): {
  theoreticalPrice: number;
  delta: number;
  gamma: number;
  thetaPerDay: number;
  vega: number;
} {
  const { spot, strike, timeToExpiryYears: T, riskFreeRate: r, iv: sigma, isCall } = params;
  if (T <= 0 || sigma <= 0) {
    const intrinsic = isCall ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
    return {
      theoreticalPrice: intrinsic,
      delta: isCall ? (spot >= strike ? 1 : 0) : (spot <= strike ? -1 : 0),
      gamma: 0,
      thetaPerDay: 0,
      vega: 0
    };
  }

  const d1 = (Math.log(spot / strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  let price: number;
  let delta: number;

  if (isCall) {
    price = spot * normCdf(d1) - strike * Math.exp(-r * T) * normCdf(d2);
    delta = normCdf(d1);
  } else {
    price = strike * Math.exp(-r * T) * normCdf(-d2) - spot * normCdf(-d1);
    delta = normCdf(d1) - 1;
  }

  const gamma = normPdf(d1) / (spot * sigma * Math.sqrt(T));
  const thetaAnnual = -(spot * normPdf(d1) * sigma) / (2 * Math.sqrt(T)) - (isCall ? (r * strike * Math.exp(-r * T) * normCdf(d2)) : (-r * strike * Math.exp(-r * T) * normCdf(-d2)));
  const thetaPerDay = thetaAnnual / 365;
  const vega = (spot * Math.sqrt(T) * normPdf(d1)) / 100;

  return {
    theoreticalPrice: Math.max(0.05, +price.toFixed(2)),
    delta: +delta.toFixed(3),
    gamma: +gamma.toFixed(5),
    thetaPerDay: +thetaPerDay.toFixed(2),
    vega: +vega.toFixed(2)
  };
}

export function solveImpliedVolatility(
  targetPrice: number,
  spot: number,
  strike: number,
  T: number,
  r: number,
  isCall: boolean
): number {
  let low = 0.01;
  let high = 3.0;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const p = calculateBlackScholes({ spot, strike, timeToExpiryYears: T, riskFreeRate: r, iv: mid, isCall }).theoreticalPrice;
    if (Math.abs(p - targetPrice) < 0.05) return mid;
    if (p < targetPrice) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export interface LiveMarketQuote {
  lastPrice: number;
  netChange: number;
  changePct: number;
  high: number;
  low: number;
  close: number;
  open: number;
  volume: number;
  oi: number;
  depth: any;
  timestampMs: number;
  source: 'ZERODHA_KITE_LIVE' | 'UNAVAILABLE';
  isLtpAvailable?: boolean;
}

// Live Spot Cache strictly populated from verified Zerodha Kite quotes
const liveSpotCache: Record<string, { price: number; timestampMs: number }> = {};

/**
 * Updates the live spot cache directly from verified Zerodha Kite quotes.
 */
export function updateLiveSpotFromKite(symbol: string, price: number, timestampMs: number = Date.now()): void {
  if (price > 0) {
    const norm = symbol.toUpperCase().trim();
    liveSpotCache[norm] = { price, timestampMs };
  }
}

/**
 * Returns the current live spot price for any stock or index IF present in verified Zerodha cache.
 * Returns null if no live Zerodha quote exists (Fail closed policy).
 */
export function getLiveSpot(symbol: string): number | null {
  const norm = symbol.toUpperCase().trim();
  const cached = liveSpotCache[norm];
  if (cached && cached.price > 0 && Date.now() - cached.timestampMs < 10000) {
    return cached.price;
  }
  return null;
}

/**
 * Parses an option trading symbol into underlying, strike, and option type.
 * Examples:
 *   "NIFTY26AUG24800CE" -> underlying: "NIFTY", strike: 24800, optionType: "CE"
 *   "NFO:NIFTY26AUG24200CE" -> underlying: "NIFTY", strike: 24200, optionType: "CE"
 *   "RELIANCE26AUG2950CE" -> underlying: "RELIANCE", strike: 2950, optionType: "CE"
 *   "NIFTY 24800 CE" -> underlying: "NIFTY", strike: 24800, optionType: "CE"
 */
export function parseOptionSymbol(symbol: string): {
  isOption: boolean;
  underlying: string;
  strike: number;
  optionType: 'CE' | 'PE';
} {
  const clean = symbol.replace(/^(NFO:|NSE:|BSE:|BFO:)/i, '').trim().toUpperCase();
  const isCE = clean.endsWith('CE') || clean.includes(' CE');
  const isPE = clean.endsWith('PE') || clean.includes(' PE');

  if (!isCE && !isPE) {
    return { isOption: false, underlying: clean, strike: 0, optionType: 'CE' };
  }

  const optionType: 'CE' | 'PE' = isCE ? 'CE' : 'PE';

  // Match e.g. NIFTY 24800 CE or NIFTY26AUG24800CE or RELIANCE2950CE
  const strikeMatch = clean.match(/(\d{3,6})(?:CE|PE)?$/i);
  let strike = 0;
  if (strikeMatch) {
    strike = parseInt(strikeMatch[1], 10);
  }

  // Extract underlying name
  let underlying = 'NIFTY';
  if (clean.startsWith('BANKNIFTY')) underlying = 'BANKNIFTY';
  else if (clean.startsWith('FINNIFTY')) underlying = 'FINNIFTY';
  else if (clean.startsWith('MIDCPNIFTY')) underlying = 'MIDCPNIFTY';
  else if (clean.startsWith('SENSEX')) underlying = 'SENSEX';
  else if (clean.startsWith('NIFTY')) underlying = 'NIFTY';
  else {
    // Equity stock option e.g. RELIANCE, TCS
    const match = clean.match(/^[A-Z&]+/);
    if (match) underlying = match[0].replace(/\d.*$/, '');
  }

  return { isOption: true, underlying, strike, optionType };
}

/**
 * Calculates theoretical Black-Scholes Greeks and theoretical fair value.
 * STRICTLY for theoretical Greeks/EV calculation ONLY — NEVER substituted as market LTP.
 */
export function computeOptionTheoreticalGreeks(
  spotPrice: number,
  strike: number,
  optionType: 'CE' | 'PE',
  dteDays: number = 3,
  volatility: number = 0.15
): {
  theoreticalPrice: number;
  delta: number;
  gamma: number;
  thetaPerDay: number;
  vega: number;
  iv: number;
  moneyness: string;
} {
  const isCall = optionType === 'CE';
  const timeToExpiryYears = Math.max(0.001, dteDays / 365.25);
  const riskFreeRate = 0.065;

  const bs = calculateBlackScholes({
    spot: spotPrice,
    strike: strike || spotPrice,
    timeToExpiryYears,
    riskFreeRate,
    iv: volatility,
    isCall
  });

  let moneyness = 'ATM';
  const dist = isCall ? spotPrice - strike : strike - spotPrice;
  if (dist > spotPrice * 0.008) moneyness = 'ITM';
  else if (dist < -spotPrice * 0.008) moneyness = 'OTM';

  return {
    theoreticalPrice: bs.theoreticalPrice,
    delta: bs.delta,
    gamma: bs.gamma,
    thetaPerDay: bs.thetaPerDay,
    vega: bs.vega,
    iv: +(volatility * 100).toFixed(1),
    moneyness
  };
}

/**
 * Builds live quotes dictionary from verified Zerodha Kite responses.
 * STRICT FAIL-CLOSED POLICY: Only genuine Zerodha Kite quotes are returned as LIVE.
 * Missing quotes are flagged as UNAVAILABLE with lastPrice: 0.
 */
export function buildComprehensiveQuotes(
  requestedSymbols: string[],
  kiteQuotes: Record<string, any> = {}
): {
  quotes: Record<string, LiveMarketQuote>;
  spotIndices: Record<string, number>;
} {
  const resultQuotes: Record<string, LiveMarketQuote> = {};
  const spotIndices: Record<string, number> = {};

  // Extract Spot Indices directly from verified Kite quotes
  const spotMapping: Record<string, string[]> = {
    'NIFTY 50': ['NSE:NIFTY 50', 'NIFTY 50', 'NSE:NIFTY50', 'NIFTY', 'NSE:NIFTY'],
    'NIFTY BANK': ['NSE:NIFTY BANK', 'NIFTY BANK', 'NSE:BANKNIFTY', 'BANKNIFTY'],
    'FINNIFTY': ['NSE:FINNIFTY', 'FINNIFTY', 'NSE:NIFTY FIN SERVICE', 'NIFTY FIN SERVICE'],
    'SENSEX': ['BSE:SENSEX', 'SENSEX', 'BSE:SENSEX 50'],
    'INDIA VIX': ['NSE:INDIA VIX', 'INDIA VIX', 'INDIAVIX']
  };

  for (const [canonicalName, aliasKeys] of Object.entries(spotMapping)) {
    let spotQuote: any = null;
    for (const key of aliasKeys) {
      if (kiteQuotes[key] && (kiteQuotes[key].last_price > 0 || kiteQuotes[key].lastPrice > 0)) {
        spotQuote = kiteQuotes[key];
        break;
      }
    }

    if (spotQuote) {
      const px = spotQuote.last_price || spotQuote.lastPrice;
      const closePx = spotQuote.ohlc?.close || px;
      const netChange = +(px - closePx).toFixed(2);
      const changePct = closePx > 0 ? +((netChange / closePx) * 100).toFixed(2) : 0;
      const quoteObj: LiveMarketQuote = {
        lastPrice: px,
        netChange,
        changePct,
        high: spotQuote.ohlc?.high || px,
        low: spotQuote.ohlc?.low || px,
        close: closePx,
        open: spotQuote.ohlc?.open || px,
        volume: spotQuote.volume || 0,
        oi: spotQuote.oi || 0,
        depth: spotQuote.depth || null,
        timestampMs: Date.now(),
        source: 'ZERODHA_KITE_LIVE',
        isLtpAvailable: true
      };

      resultQuotes[canonicalName] = quoteObj;
      aliasKeys.forEach((k) => {
        resultQuotes[k] = quoteObj;
      });
      spotIndices[canonicalName] = px;
      updateLiveSpotFromKite(canonicalName, px);
    }
  }

  // Populate Requested Option and Stock Symbols
  for (const sym of requestedSymbols) {
    const cleanSym = sym.trim();
    if (!cleanSym) continue;

    const noSpaceSym = cleanSym.replace(/\s+/g, '');
    const nfoPrefixed = `NFO:${noSpaceSym}`;
    const nsePrefixed = `NSE:${noSpaceSym}`;
    const bsePrefixed = `BSE:${noSpaceSym}`;
    const bfoPrefixed = `BFO:${noSpaceSym}`;

    // Find in Kite Quotes
    const kiteMatch =
      kiteQuotes[cleanSym] ||
      kiteQuotes[noSpaceSym] ||
      kiteQuotes[nfoPrefixed] ||
      kiteQuotes[nsePrefixed] ||
      kiteQuotes[bsePrefixed] ||
      kiteQuotes[bfoPrefixed];

    if (kiteMatch && (kiteMatch.last_price > 0 || kiteMatch.lastPrice > 0)) {
      const px = kiteMatch.last_price || kiteMatch.lastPrice;
      const closePx = kiteMatch.ohlc?.close || px;
      const netChange = +(px - closePx).toFixed(2);
      const changePct = closePx > 0 ? +((netChange / closePx) * 100).toFixed(2) : 0;

      const quoteObj: LiveMarketQuote = {
        lastPrice: px,
        netChange,
        changePct,
        high: kiteMatch.ohlc?.high || px,
        low: kiteMatch.ohlc?.low || px,
        close: closePx,
        open: kiteMatch.ohlc?.open || px,
        volume: kiteMatch.volume || 0,
        oi: kiteMatch.oi || 0,
        depth: kiteMatch.depth || null,
        timestampMs: Date.now(),
        source: 'ZERODHA_KITE_LIVE',
        isLtpAvailable: true
      };

      resultQuotes[cleanSym] = quoteObj;
      resultQuotes[noSpaceSym] = quoteObj;
      resultQuotes[nfoPrefixed] = quoteObj;
      resultQuotes[nsePrefixed] = quoteObj;
      updateLiveSpotFromKite(cleanSym, px);
    } else {
      // FAIL CLOSED: Quote is unavailable from Zerodha
      const unavailableQuote: LiveMarketQuote = {
        lastPrice: 0,
        netChange: 0,
        changePct: 0,
        high: 0,
        low: 0,
        close: 0,
        open: 0,
        volume: 0,
        oi: 0,
        depth: null,
        timestampMs: 0,
        source: 'UNAVAILABLE',
        isLtpAvailable: false
      };

      resultQuotes[cleanSym] = unavailableQuote;
      resultQuotes[noSpaceSym] = unavailableQuote;
    }
  }

  return { quotes: resultQuotes, spotIndices };
}
