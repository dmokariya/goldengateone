import { TradeableContract, AssetCategory } from '../types';
import { getNearestWeeklyExpiry, calculateDynamicAtmStrike, buildOptionTradingSymbol, UNDERLYING_CONFIGS } from '../utils/optionEngine';

export interface EquityDefinition {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  category: AssetCategory;
  lotSize: number;
  fnoLotSize: number;
  fnoStepSize: number;
  sector: string;
  baselineSpot: number;
}

export const TOP_LIQUID_EQUITIES: EquityDefinition[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 250, fnoStepSize: 20, sector: 'Energy & Oil', baselineSpot: 2980 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 550, fnoStepSize: 10, sector: 'Banking & Financials', baselineSpot: 1660 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 700, fnoStepSize: 10, sector: 'Banking & Financials', baselineSpot: 1210 },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 400, fnoStepSize: 20, sector: 'Information Tech', baselineSpot: 1870 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 175, fnoStepSize: 50, sector: 'Information Tech', baselineSpot: 4250 },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 750, fnoStepSize: 5, sector: 'Public Sector Banking', baselineSpot: 815 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 1425, fnoStepSize: 10, sector: 'Automobiles', baselineSpot: 1020 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 125, fnoStepSize: 50, sector: 'Financial Services', baselineSpot: 6950 },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 150, fnoStepSize: 20, sector: 'Infrastructure & Capital Goods', baselineSpot: 3620 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 475, fnoStepSize: 10, sector: 'Telecom', baselineSpot: 1490 },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 625, fnoStepSize: 10, sector: 'Banking & Financials', baselineSpot: 1190 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 50, fnoStepSize: 100, sector: 'Automobiles', baselineSpot: 12400 },
  { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 1600, fnoStepSize: 5, sector: 'FMCG', baselineSpot: 495 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 350, fnoStepSize: 10, sector: 'Pharma & Healthcare', baselineSpot: 1780 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 350, fnoStepSize: 20, sector: 'Automobiles', baselineSpot: 2820 },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 5500, fnoStepSize: 1, sector: 'Metals & Mining', baselineSpot: 155 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 400, fnoStepSize: 10, sector: 'Banking & Financials', baselineSpot: 1780 },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 1400, fnoStepSize: 5, sector: 'Metals & Mining', baselineSpot: 690 },
  { symbol: 'TITAN', name: 'Titan Company Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 175, fnoStepSize: 20, sector: 'Consumer Goods', baselineSpot: 3540 },
  { symbol: 'NTPC', name: 'NTPC Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 1500, fnoStepSize: 5, sector: 'Power & Utilities', baselineSpot: 410 },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 1800, fnoStepSize: 2.5, sector: 'Power & Utilities', baselineSpot: 335 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 300, fnoStepSize: 20, sector: 'Diversified', baselineSpot: 3050 },
  { symbol: 'COALINDIA', name: 'Coal India Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 2100, fnoStepSize: 5, sector: 'Metals & Mining', baselineSpot: 510 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', category: 'EQUITY_INTRADAY', lotSize: 1, fnoLotSize: 1500, fnoStepSize: 5, sector: 'Information Tech', baselineSpot: 530 }
];

export const DEFAULT_UNDERLYING_SPOTS: Record<string, number> = {
  NIFTY: 24850,
  'NIFTY 50': 24850,
  BANKNIFTY: 51200,
  'NIFTY BANK': 51200,
  FINNIFTY: 23800,
  'NIFTY FIN SERVICE': 23800,
  MIDCPNIFTY: 12950,
  SENSEX: 81200,
  'INDIA VIX': 13.8,
  RELIANCE: 2980,
  HDFCBANK: 1660,
  ICICIBANK: 1210,
  INFY: 1870,
  TCS: 4250,
  SBIN: 815,
  TATAMOTORS: 1020,
  BAJFINANCE: 6950,
  LT: 3620,
  BHARTIARTL: 1490,
  AXISBANK: 1190,
  MARUTI: 12400,
  ITC: 495,
  SUNPHARMA: 1780,
  'M&M': 2820,
  TATASTEEL: 155,
  KOTAKBANK: 1780,
  HINDALCO: 690,
  TITAN: 3540,
  NTPC: 410,
  POWERGRID: 335,
  ADANIENT: 3050,
  COALINDIA: 510,
  WIPRO: 530
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
export const EXPANDED_EQUITIES_UNIVERSE = TOP_LIQUID_EQUITIES;
