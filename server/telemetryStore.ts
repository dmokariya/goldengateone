// server/telemetryStore.ts
// Institutional Quantitative Signal Telemetry & Performance Database
// Records EVERY generated signal (Approved & Rejected) and tracks live MFE/MAE/PnL outcomes

import fs from 'fs';
import path from 'path';
import { SignalPerformanceRecord } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const TELEMETRY_FILE_PATH = path.join(DATA_DIR, 'signal_performance_telemetry.json');

// In-memory telemetry cache
let signalRecords: SignalPerformanceRecord[] = [];
// Idempotency tracking cache: signalId -> timestampMs
const idempotencyCache = new Map<string, number>();
// Re-entry cooldown tracker: symbol -> { lastLossTimestampMs: number; direction: string }
const reEntryCooldowns = new Map<string, { lastLossTimestampMs: number; direction: string }>();

/**
 * Initialize telemetry database from disk
 */
export function initTelemetryStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(TELEMETRY_FILE_PATH)) {
      const raw = fs.readFileSync(TELEMETRY_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        signalRecords = parsed;
        console.log(`[Telemetry Store] Loaded ${signalRecords.length} historical signal performance records.`);
      }
    } else {
      saveTelemetryToDisk();
      console.log(`[Telemetry Store] Initialized new telemetry database at ${TELEMETRY_FILE_PATH}`);
    }
  } catch (err: any) {
    console.error(`[Telemetry Store] Error loading telemetry database:`, err.message);
    signalRecords = [];
  }
}

function saveTelemetryToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${TELEMETRY_FILE_PATH}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(signalRecords.slice(-1000), null, 2), 'utf-8');
    fs.renameSync(tempFile, TELEMETRY_FILE_PATH);
  } catch (err: any) {
    console.error(`[Telemetry Store] Error saving telemetry to disk:`, err.message);
  }
}

/**
 * Check if a signal ID is a duplicate within the idempotency window (15 mins)
 */
export function isDuplicateSignal(signalId: string): boolean {
  if (!signalId) return false;
  const now = Date.now();
  const existingTime = idempotencyCache.get(signalId);
  if (existingTime && (now - existingTime) < 15 * 60 * 1000) {
    return true;
  }
  idempotencyCache.set(signalId, now);
  // Cleanup old idempotency keys
  if (idempotencyCache.size > 2000) {
    for (const [key, ts] of idempotencyCache.entries()) {
      if (now - ts > 30 * 60 * 1000) idempotencyCache.delete(key);
    }
  }
  return false;
}

/**
 * Enforces re-entry cooldown (e.g. 15 minutes after a stop loss hit on the same symbol)
 */
export function isReEntryCooldownActive(symbol: string, direction: 'BUY' | 'SELL'): { active: boolean; remainingMins?: number } {
  const normSym = symbol.toUpperCase().trim();
  const entry = reEntryCooldowns.get(normSym);
  if (!entry) return { active: false };

  const now = Date.now();
  const elapsedMs = now - entry.lastLossTimestampMs;
  const cooldownMs = 15 * 60 * 1000; // 15 mins cooldown

  if (elapsedMs < cooldownMs && entry.direction === direction) {
    const remainingMins = Math.ceil((cooldownMs - elapsedMs) / 60000);
    return { active: true, remainingMins };
  }

  if (elapsedMs >= cooldownMs) {
    reEntryCooldowns.delete(normSym);
  }

  return { active: false };
}

/**
 * Record a Stop-Loss hit to initiate re-entry cooldown
 */
export function recordStopLossHit(symbol: string, direction: 'BUY' | 'SELL'): void {
  const normSym = symbol.toUpperCase().trim();
  reEntryCooldowns.set(normSym, {
    lastLossTimestampMs: Date.now(),
    direction
  });
  console.log(`[Telemetry Store] 15-Minute Re-Entry Cooldown initiated for ${normSym} (${direction}).`);
}

/**
 * Records a new signal (Approved or Rejected) with full quantitative telemetry
 */
export function recordSignalTelemetry(record: SignalPerformanceRecord): SignalPerformanceRecord {
  // Check if record already exists by ID
  const existingIdx = signalRecords.findIndex(r => r.id === record.id);
  if (existingIdx >= 0) {
    signalRecords[existingIdx] = { ...signalRecords[existingIdx], ...record };
  } else {
    signalRecords.unshift(record);
  }

  // Keep most recent 1000 records
  if (signalRecords.length > 1000) {
    signalRecords = signalRecords.slice(0, 1000);
  }

  saveTelemetryToDisk();
  return record;
}

/**
 * Updates outcome of an active signal (e.g. MFE, MAE, Target Hit, SL Hit)
 */
export function updateSignalOutcome(
  signalId: string,
  update: Partial<SignalPerformanceRecord>
): SignalPerformanceRecord | null {
  const record = signalRecords.find(r => r.id === signalId);
  if (!record) return null;

  Object.assign(record, update);
  saveTelemetryToDisk();
  return record;
}

/**
 * Track live tick/candle excursion against active signals (Calculates MFE / MAE)
 */
export function processPriceTickForSignals(symbol: string, currentPrice: number): void {
  const activeSignals = signalRecords.filter(r => r.symbol === symbol && r.status === 'ACTIVE');

  for (const sig of activeSignals) {
    const entry = sig.entryPrice;
    const isLong = sig.direction === 'BUY';

    // Favourable and Adverse excursion
    const currentFavourable = isLong ? Math.max(0, currentPrice - entry) : Math.max(0, entry - currentPrice);
    const currentAdverse = isLong ? Math.max(0, entry - currentPrice) : Math.max(0, currentPrice - entry);

    if (currentFavourable > sig.mfe) {
      sig.mfe = +currentFavourable.toFixed(2);
      sig.mfePct = +((sig.mfe / entry) * 100).toFixed(2);
    }
    if (currentAdverse > sig.mae) {
      sig.mae = +currentAdverse.toFixed(2);
      sig.maePct = +((sig.mae / entry) * 100).toFixed(2);
    }

    sig.currentPrice = currentPrice;

    // Check Target Hit
    if (isLong && currentPrice >= sig.targetPrice) {
      sig.status = 'TARGET_HIT';
      sig.exitPrice = currentPrice;
      sig.exitTimestamp = new Date().toISOString();
      sig.finalPnlINR = +((currentPrice - entry) * 50).toFixed(2);
      sig.finalReturnPct = +(((currentPrice - entry) / entry) * 100).toFixed(2);
    } else if (!isLong && currentPrice <= sig.targetPrice) {
      sig.status = 'TARGET_HIT';
      sig.exitPrice = currentPrice;
      sig.exitTimestamp = new Date().toISOString();
      sig.finalPnlINR = +((entry - currentPrice) * 50).toFixed(2);
      sig.finalReturnPct = +(((entry - currentPrice) / entry) * 100).toFixed(2);
    }

    // Check Stop Loss Hit
    else if (isLong && currentPrice <= sig.stopLossPrice) {
      sig.status = 'SL_HIT';
      sig.exitPrice = currentPrice;
      sig.exitTimestamp = new Date().toISOString();
      sig.finalPnlINR = -Math.abs(+((entry - currentPrice) * 50).toFixed(2));
      sig.finalReturnPct = -Math.abs(+(((entry - currentPrice) / entry) * 100).toFixed(2));
      recordStopLossHit(sig.symbol, sig.direction);
    } else if (!isLong && currentPrice >= sig.stopLossPrice) {
      sig.status = 'SL_HIT';
      sig.exitPrice = currentPrice;
      sig.exitTimestamp = new Date().toISOString();
      sig.finalPnlINR = -Math.abs(+((currentPrice - entry) * 50).toFixed(2));
      sig.finalReturnPct = -Math.abs(+(((currentPrice - entry) / entry) * 100).toFixed(2));
      recordStopLossHit(sig.symbol, sig.direction);
    }
  }

  saveTelemetryToDisk();
}

/**
 * Get all signal performance records with optional filters
 */
export function getSignalTelemetryRecords(filters?: {
  underlying?: string;
  preTradeStatus?: 'APPROVED' | 'REJECTED';
  limit?: number;
}): {
  records: SignalPerformanceRecord[];
  summary: {
    totalSignals: number;
    approvedCount: number;
    rejectedCount: number;
    winCount: number;
    lossCount: number;
    avgMfePct: number;
    avgMaePct: number;
    totalPnlINR: number;
  };
} {
  let list = [...signalRecords];
  if (filters?.underlying) {
    list = list.filter(r => r.underlying === filters.underlying || r.symbol.includes(filters.underlying));
  }
  if (filters?.preTradeStatus) {
    list = list.filter(r => r.preTradeStatus === filters.preTradeStatus);
  }

  const limit = filters?.limit || 100;
  const sliced = list.slice(0, limit);

  // Compute telemetry summary
  let winCount = 0;
  let lossCount = 0;
  let totalMfe = 0;
  let totalMae = 0;
  let totalPnl = 0;

  for (const r of signalRecords) {
    if (r.status === 'TARGET_HIT') winCount++;
    if (r.status === 'SL_HIT') lossCount++;
    totalMfe += r.mfePct || 0;
    totalMae += r.maePct || 0;
    totalPnl += r.finalPnlINR || 0;
  }

  const total = signalRecords.length;
  const approved = signalRecords.filter(r => r.preTradeStatus === 'APPROVED').length;

  return {
    records: sliced,
    summary: {
      totalSignals: total,
      approvedCount: approved,
      rejectedCount: total - approved,
      winCount,
      lossCount,
      avgMfePct: total > 0 ? +(totalMfe / total).toFixed(2) : 0,
      avgMaePct: total > 0 ? +(totalMae / total).toFixed(2) : 0,
      totalPnlINR: +totalPnl.toFixed(2)
    }
  };
}
