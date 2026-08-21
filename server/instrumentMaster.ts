// server/instrumentMaster.ts
// Live Zerodha Instrument Master Cache & Dynamic Resolver

export interface KiteInstrument {
  token: string;
  tradingsymbol: string;
  name: string;
  expiry: string;
  strike: number;
  tick_size: number;
  lot_size: number;
  instrument_type: string;
  segment: string;
  exchange: string;
}

let instrumentsList: KiteInstrument[] = [];
const exactSymbolMap = new Map<string, KiteInstrument>();
const optionsIndexMap = new Map<string, KiteInstrument[]>();
let lastFetchedAt: number = 0;
let isFetching: boolean = false;

export async function fetchAndIndexInstruments(): Promise<void> {
  if (isFetching) return;
  isFetching = true;
  console.log('[Instrument Master] Fetching official live instruments from Zerodha Kite API...');

  try {
    const [nfoRes, bfoRes, nseRes] = await Promise.all([
      fetch('https://api.kite.trade/instruments/NFO').then(r => r.ok ? r.text() : '').catch(() => ''),
      fetch('https://api.kite.trade/instruments/BFO').then(r => r.ok ? r.text() : '').catch(() => ''),
      fetch('https://api.kite.trade/instruments/NSE').then(r => r.ok ? r.text() : '').catch(() => '')
    ]);

    const combinedCsv = `${nfoRes}\n${bfoRes}\n${nseRes}`;
    const lines = combinedCsv.split('\n');
    const newInstruments: KiteInstrument[] = [];
    const newExactMap = new Map<string, KiteInstrument>();
    const newOptionsMap = new Map<string, KiteInstrument[]>();

    for (const line of lines) {
      if (!line || line.startsWith('instrument_token')) continue;
      const parts = line.split(',');
      if (parts.length < 12) continue;

      const cleanName = parts[3].replace(/\"/g, '').trim().toUpperCase();
      const tradingsymbol = parts[2].trim().toUpperCase();
      const expiry = parts[5].trim();
      const strike = parseFloat(parts[6]) || 0;
      const tickSize = parseFloat(parts[7]) || 0.05;
      const lotSize = parseInt(parts[8], 10) || 1;
      const instrumentType = parts[9].trim().toUpperCase();
      const segment = parts[10].trim();
      const exchange = parts[11] ? parts[11].trim().toUpperCase() : 'NSE';

      const inst: KiteInstrument = {
        token: parts[0],
        tradingsymbol,
        name: cleanName,
        expiry,
        strike,
        tick_size: tickSize,
        lot_size: lotSize,
        instrument_type: instrumentType,
        segment,
        exchange
      };

      newInstruments.push(inst);
      newExactMap.set(tradingsymbol, inst);

      if (instrumentType === 'CE' || instrumentType === 'PE') {
        const key = `${cleanName}_${strike}_${instrumentType}`;
        const existing = newOptionsMap.get(key) || [];
        existing.push(inst);
        newOptionsMap.set(key, existing);
      }
    }

    // Sort option contracts by expiry ascending
    for (const [key, list] of newOptionsMap.entries()) {
      list.sort((a, b) => (a.expiry || '').localeCompare(b.expiry || ''));
    }

    instrumentsList = newInstruments;
    exactSymbolMap.clear();
    for (const [k, v] of newExactMap.entries()) {
      exactSymbolMap.set(k, v);
    }
    optionsIndexMap.clear();
    for (const [k, v] of newOptionsMap.entries()) {
      optionsIndexMap.set(k, v);
    }

    lastFetchedAt = Date.now();
    console.log(`[Instrument Master] Successfully indexed ${instrumentsList.length} live instruments from Zerodha Kite.`);
  } catch (err: any) {
    console.error('[Instrument Master] Failed to fetch instruments from Zerodha Kite:', err.message);
  } finally {
    isFetching = false;
  }
}

// Auto-refresh periodically (every 6 hours)
setInterval(() => {
  fetchAndIndexInstruments();
}, 6 * 60 * 60 * 1000);

export function getInstrumentsStatus(): { count: number; lastFetchedAt: number; isReady: boolean } {
  return {
    count: instrumentsList.length,
    lastFetchedAt,
    isReady: instrumentsList.length > 0
  };
}

/**
 * Resolves ANY user/bot signal string into the exact live Zerodha Kite Instrument
 * Examples:
 *  - "NIFTY 24600 CE" -> { tradingsymbol: "NIFTY2681824600CE", exchange: "NFO", lot_size: 65, tick_size: 0.05 }
 *  - "BANKNIFTY 52500 PE" -> { tradingsymbol: "BANKNIFTY26AUG52500PE", exchange: "NFO", lot_size: 30, tick_size: 0.05 }
 *  - "SENSEX 81000 CE" -> { tradingsymbol: "SENSEX2682081000CE", exchange: "BFO", lot_size: 20, tick_size: 0.05 }
 *  - "LASERPOWER" -> { tradingsymbol: "LASERPOWER", exchange: "NSE", lot_size: 1, tick_size: 0.05 }
 *  - "RELIANCE" -> { tradingsymbol: "RELIANCE", exchange: "NSE", lot_size: 1, tick_size: 0.10 }
 */
export function resolveZerodhaInstrument(inputSymbol: string, preferredExchange?: string): KiteInstrument | null {
  if (!inputSymbol) return null;
  const rawUpper = inputSymbol.trim().toUpperCase();
  const noSpace = rawUpper.replace(/\s+/g, '');

  // 1. Direct exact tradingsymbol match
  if (exactSymbolMap.has(noSpace)) {
    return exactSymbolMap.get(noSpace)!;
  }
  if (exactSymbolMap.has(rawUpper)) {
    return exactSymbolMap.get(rawUpper)!;
  }

  // 2. Parse Derivative Option Pattern: e.g. "NIFTY 24600 CE", "BANKNIFTY 52500 PE", "SENSEX 81000 CE"
  const optMatch = rawUpper.match(/^(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\s*(\d{4,5})\s*(CE|PE)$/i)
    || noSpace.match(/^(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)(?:24|25|26|27)?(?:AUG|SEP|OCT|NOV|DEC|JAN|FEB|MAR|APR|MAY|JUN|JUL|\d{1,3})?(\d{4,5})(CE|PE)$/i);

  if (optMatch) {
    const underlying = optMatch[1].toUpperCase();
    const strike = parseFloat(optMatch[2]);
    const optType = optMatch[3].toUpperCase();
    const key = `${underlying}_${strike}_${optType}`;

    const candidates = optionsIndexMap.get(key);
    if (candidates && candidates.length > 0) {
      const todayIso = new Date().toISOString().slice(0, 10);
      // Pick nearest active unexpired contract
      const activeContracts = candidates.filter(c => !c.expiry || c.expiry >= todayIso);
      if (activeContracts.length > 0) {
        return activeContracts[0];
      }
      return candidates[0];
    }
  }

  // 3. Match Cash Equity: e.g. "LASERPOWER", "RELIANCE", "TCS", "INFY", "HDFCBANK"
  const eqTargetExchange = preferredExchange === 'BSE' ? 'BSE' : 'NSE';
  const eqMatch = instrumentsList.find(i => 
    i.exchange === eqTargetExchange && 
    (i.tradingsymbol === noSpace || i.name === rawUpper || i.tradingsymbol === rawUpper)
  );
  if (eqMatch) return eqMatch;

  // 4. Any exchange cash equity fallback
  const anyEqMatch = instrumentsList.find(i => 
    (i.exchange === 'NSE' || i.exchange === 'BSE') && 
    (i.tradingsymbol === noSpace || i.tradingsymbol === rawUpper)
  );
  if (anyEqMatch) return anyEqMatch;

  return null;
}
