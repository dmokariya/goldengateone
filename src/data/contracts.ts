import { TradeableContract, AssetCategory } from '../types';
import { getNearestWeeklyExpiry, calculateDynamicAtmStrike, buildOptionTradingSymbol, UNDERLYING_CONFIGS } from '../utils/optionEngine';

export interface EquityDefinition {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  category: AssetCategory;
  lotSize: number;
}

export const TOP_LIQUID_EQUITIES: EquityDefinition[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1 }
];

export const DEFAULT_UNDERLYING_SPOTS: Record<string, number> = {
  NIFTY: 24600,
  'NIFTY 50': 24600,
  BANKNIFTY: 52000,
  'NIFTY BANK': 52000,
  FINNIFTY: 23500,
  'NIFTY FIN SERVICE': 23500,
  MIDCPNIFTY: 12500,
  SENSEX: 80800
};

/**
 * Dynamically generates Option Contracts (ITM2, ITM1, ATM, OTM1, OTM2) for an underlying
 * using the LIVE spot price and the actual upcoming weekly expiry date.
 */
export function generateDynamicOptionLadder(
  underlying: string,
  spotPrice: number,
  expiryDateStr?: string
): TradeableContract[] {
  const norm = underlying.toUpperCase().trim();
  const config = UNDERLYING_CONFIGS[norm] || { stepSize: 50, exchange: 'NFO', lotSize: 1 };
  const step = config.stepSize;
  const exchange = config.exchange as 'NFO' | 'BFO';
  const lotSize = config.lotSize;

  const expiryInfo = getNearestWeeklyExpiry(norm);
  const expiryDisplay = expiryInfo.displayStr;
  const atmStrike = Math.round(spotPrice / step) * step;

  let category: AssetCategory = 'NIFTY_FNO';
  if (norm.includes('BANKNIFTY')) category = 'BANKNIFTY_FNO';
  else if (norm.includes('FINNIFTY')) category = 'FINNIFTY_FNO';
  else if (norm.includes('SENSEX')) category = 'SENSEX_FNO';

  const strikes = [
    { offset: -2 * step, moneynessCE: 'ITM' as const, moneynessPE: 'OTM' as const },
    { offset: -1 * step, moneynessCE: 'ITM' as const, moneynessPE: 'OTM' as const },
    { offset: 0, moneynessCE: 'ATM' as const, moneynessPE: 'ATM' as const },
    { offset: 1 * step, moneynessCE: 'OTM' as const, moneynessPE: 'ITM' as const },
    { offset: 2 * step, moneynessCE: 'OTM' as const, moneynessPE: 'ITM' as const }
  ];

  const contracts: TradeableContract[] = [];

  for (const s of strikes) {
    const strikePrice = atmStrike + s.offset;

    // CE
    const ceSymbol = buildOptionTradingSymbol(norm, strikePrice, 'CE', expiryInfo);
    contracts.push({
      symbol: ceSymbol,
      tradingsymbol: ceSymbol,
      exchange,
      category,
      lotSize,
      lastPrice: 0, // dynamically populated from live quote
      strikePrice,
      optionType: 'CE',
      expiry: expiryDisplay,
      moneyness: s.moneynessCE,
      isAtmNearStrike: true
    });

    // PE
    const peSymbol = buildOptionTradingSymbol(norm, strikePrice, 'PE', expiryInfo);
    contracts.push({
      symbol: peSymbol,
      tradingsymbol: peSymbol,
      exchange,
      category,
      lotSize,
      lastPrice: 0, // dynamically populated from live quote
      strikePrice,
      optionType: 'PE',
      expiry: expiryDisplay,
      moneyness: s.moneynessPE,
      isAtmNearStrike: true
    });
  }

  return contracts;
}

/**
 * Builds the complete dynamic contract universe using actual live spots and current weekly expiries.
 */
export function getDynamicTradeableContracts(spotIndices?: Record<string, number>): TradeableContract[] {
  const niftySpot = spotIndices?.['NIFTY 50'] || spotIndices?.['NIFTY'] || DEFAULT_UNDERLYING_SPOTS.NIFTY;
  const bankNiftySpot = spotIndices?.['NIFTY BANK'] || spotIndices?.['BANKNIFTY'] || DEFAULT_UNDERLYING_SPOTS.BANKNIFTY;
  const finNiftySpot = spotIndices?.['NIFTY FIN SERVICE'] || spotIndices?.['FINNIFTY'] || DEFAULT_UNDERLYING_SPOTS.FINNIFTY;
  const sensexSpot = spotIndices?.['SENSEX'] || DEFAULT_UNDERLYING_SPOTS.SENSEX;

  const niftyOptions = generateDynamicOptionLadder('NIFTY', niftySpot);
  const bankNiftyOptions = generateDynamicOptionLadder('BANKNIFTY', bankNiftySpot);
  const finNiftyOptions = generateDynamicOptionLadder('FINNIFTY', finNiftySpot);
  const sensexOptions = generateDynamicOptionLadder('SENSEX', sensexSpot);

  const equityContracts: TradeableContract[] = TOP_LIQUID_EQUITIES.map((eq) => ({
    symbol: eq.symbol,
    tradingsymbol: eq.symbol,
    exchange: eq.exchange,
    category: eq.category,
    lotSize: eq.lotSize,
    lastPrice: 0,
    isAtmNearStrike: true
  }));

  return [
    ...niftyOptions,
    ...bankNiftyOptions,
    ...finNiftyOptions,
    ...sensexOptions,
    ...equityContracts
  ];
}

// Initial tradeable universe generated dynamically with current expiries
export const TRADEABLE_CONTRACTS: TradeableContract[] = getDynamicTradeableContracts();
