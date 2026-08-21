// server/dataFileLogger.ts
// Persistent File Storage Engine for GoldenGate Trading Terminal
// Collects and writes all orders, logs, live vs shadow profits, rejected trades, and feed errors into dedicated files.

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface StoredOrderRecord {
  id: string;
  tradingMode: 'SHADOW' | 'LIVE';
  symbol: string;
  tradingsymbol?: string;
  exchange?: string;
  direction: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  lotSize?: number;
  status: 'PENDING' | 'OPEN' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXITED';
  realizedPnL?: number;
  realizedPnLPct?: number;
  timestamp: string;
  createdAtMs: number;
  closedAtMs?: number;
  holdingTimeMins?: number;
  exitReason?: string;
  zerodhaOrderId?: string;
  latencyMs?: number;
  sourceSignalId?: string;
  scoreAtEntry?: number;
  winProbabilityPct?: number;
  netExpectedValueINR?: number;
  greeks?: {
    delta?: number;
    theta?: number;
    gamma?: number;
    vega?: number;
    iv?: number;
  };
}

export interface StoredJournalRecord {
  id: string;
  tradingMode: 'SHADOW' | 'LIVE';
  orderId?: string;
  symbol: string;
  category: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  realizedPnL: number;
  realizedPnLPct: number;
  result: 'WIN' | 'LOSS';
  exitReason: string;
  openedAtTime: string;
  closedAtTime: string;
  holdingTimeMins: number;
  winProbabilityPctAtEntry: number;
  lessonLearned: string;
  maxFavourableExcursion?: number;
  maxAdverseExcursion?: number;
  createdAtMs: number;
}

export interface StoredRejectedTradeRecord {
  id: string;
  symbol: string;
  category: string;
  direction: 'BUY' | 'SELL';
  evaluatedPrice: number;
  currentPrice: number;
  strikePrice?: number;
  optionType?: 'CE' | 'PE';
  rejectionReason: string;
  rejectionCategory: 'LOW_RVOL' | 'NEGATIVE_EV' | 'THETA_RISK' | 'REGIME_CONTRADICTION' | 'BAD_RISK_REWARD' | 'LOW_DELTA' | 'LIQUIDITY_DEPTH';
  rejectionDetail: string;
  score: number;
  rvol: number;
  delta?: number;
  theta?: number;
  simulatedTargetPrice: number;
  simulatedStopLossPrice: number;
  simulatedOutcomeStatus: 'TRACKING' | 'WOULD_HAVE_WON' | 'WOULD_HAVE_LOST' | 'EXPIRED';
  hypotheticalPnL?: number;
  hypotheticalPnLPct?: number;
  timestamp: string;
  createdAtMs: number;
  testedInShadowMode?: boolean;
  shadowOrderId?: string;
}

export interface StoredPriceFeedErrorRecord {
  id: string;
  timestamp: string;
  createdAtMs: number;
  symbol?: string;
  source: 'ZERODHA_KITE' | 'FALLBACK_SYNTHETIC' | 'INTERNAL_ENGINE' | 'WEBSOCKET_TICK';
  errorCode?: string | number;
  errorMessage: string;
  recoveryAction: string;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface StoredAuditLogRecord {
  id: string;
  timestamp: string;
  createdAtMs: number;
  type: string;
  message: string;
  symbol?: string;
  tradingMode?: 'SHADOW' | 'LIVE';
}

const FILES = {
  ORDERS_LIVE: path.join(DATA_DIR, 'orders_live.json'),
  ORDERS_SHADOW: path.join(DATA_DIR, 'orders_shadow.json'),
  JOURNAL: path.join(DATA_DIR, 'trade_journal.json'),
  REJECTED_TRADES: path.join(DATA_DIR, 'rejected_trades.json'),
  PRICE_FEED_ERRORS: path.join(DATA_DIR, 'price_feed_errors.json'),
  AUDIT_LOGS: path.join(DATA_DIR, 'system_audit_logs.json')
};

// Ensure data directory exists
function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err: any) {
    console.error('[DataFileLogger] Failed to create data directory:', err.message);
  }
}

// Generic file reader
function readFileSafe<T>(filePath: string, defaultVal: T[] = []): T[] {
  try {
    ensureDataDir();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : defaultVal;
    }
    return defaultVal;
  } catch (err: any) {
    console.warn(`[DataFileLogger] Error reading ${filePath}:`, err.message);
    return defaultVal;
  }
}

// Generic file writer with atomic temp write
function writeFileSafe<T>(filePath: string, data: T[]): void {
  try {
    ensureDataDir();
    const tempFile = `${filePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data.slice(-2000), null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  } catch (err: any) {
    console.error(`[DataFileLogger] Error writing to ${filePath}:`, err.message);
  }
}

// Initialize all data files if they don't exist
export function initDataFileLogger(): void {
  ensureDataDir();
  Object.entries(FILES).forEach(([name, filePath]) => {
    if (!fs.existsSync(filePath)) {
      writeFileSafe(filePath, []);
      console.log(`[DataFileLogger] Initialized storage file: ${path.basename(filePath)}`);
    }
  });
}

// ----------------------------------------------------------------------------
// ORDERS (LIVE vs SHADOW)
// ----------------------------------------------------------------------------
export function recordOrderToFile(order: StoredOrderRecord): StoredOrderRecord {
  const filePath = order.tradingMode === 'LIVE' ? FILES.ORDERS_LIVE : FILES.ORDERS_SHADOW;
  const list = readFileSafe<StoredOrderRecord>(filePath);
  
  const existingIdx = list.findIndex(o => o.id === order.id);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...order };
  } else {
    list.unshift(order);
  }

  writeFileSafe(filePath, list);
  return order;
}

export function getStoredOrders(mode?: 'SHADOW' | 'LIVE' | 'ALL'): {
  liveOrders: StoredOrderRecord[];
  shadowOrders: StoredOrderRecord[];
  allOrders: StoredOrderRecord[];
} {
  const liveOrders = readFileSafe<StoredOrderRecord>(FILES.ORDERS_LIVE);
  const shadowOrders = readFileSafe<StoredOrderRecord>(FILES.ORDERS_SHADOW);
  const allOrders = [...liveOrders, ...shadowOrders].sort((a, b) => b.createdAtMs - a.createdAtMs);

  return { liveOrders, shadowOrders, allOrders };
}

// ----------------------------------------------------------------------------
// TRADE JOURNAL (LIVE vs SHADOW P&L)
// ----------------------------------------------------------------------------
export function recordJournalEntryToFile(entry: StoredJournalRecord): StoredJournalRecord {
  const list = readFileSafe<StoredJournalRecord>(FILES.JOURNAL);
  const existingIdx = list.findIndex(j => j.id === entry.id);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...entry };
  } else {
    list.unshift(entry);
  }
  writeFileSafe(FILES.JOURNAL, list);
  return entry;
}

export function getStoredJournal(mode?: 'SHADOW' | 'LIVE' | 'ALL'): {
  entries: StoredJournalRecord[];
  liveStats: { totalTrades: number; wins: number; losses: number; winRatePct: number; totalPnL: number };
  shadowStats: { totalTrades: number; wins: number; losses: number; winRatePct: number; totalPnL: number };
} {
  const all = readFileSafe<StoredJournalRecord>(FILES.JOURNAL);
  const live = all.filter(e => e.tradingMode === 'LIVE');
  const shadow = all.filter(e => e.tradingMode === 'SHADOW');

  const calcStats = (arr: StoredJournalRecord[]) => {
    const wins = arr.filter(t => t.result === 'WIN').length;
    const losses = arr.filter(t => t.result === 'LOSS').length;
    const totalTrades = arr.length;
    const winRatePct = totalTrades > 0 ? +((wins / totalTrades) * 100).toFixed(1) : 0;
    const totalPnL = +arr.reduce((acc, t) => acc + (t.realizedPnL || 0), 0).toFixed(2);
    return { totalTrades, wins, losses, winRatePct, totalPnL };
  };

  let filtered = all;
  if (mode === 'LIVE') filtered = live;
  else if (mode === 'SHADOW') filtered = shadow;

  return {
    entries: filtered,
    liveStats: calcStats(live),
    shadowStats: calcStats(shadow)
  };
}

// ----------------------------------------------------------------------------
// REJECTED TRADES
// ----------------------------------------------------------------------------
export function recordRejectedTradeToFile(rejected: StoredRejectedTradeRecord): StoredRejectedTradeRecord {
  const list = readFileSafe<StoredRejectedTradeRecord>(FILES.REJECTED_TRADES);
  const existingIdx = list.findIndex(r => r.id === rejected.id || (r.symbol === rejected.symbol && Math.abs(r.createdAtMs - rejected.createdAtMs) < 60000));
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...rejected };
  } else {
    list.unshift(rejected);
  }
  writeFileSafe(FILES.REJECTED_TRADES, list);
  return rejected;
}

export function getStoredRejectedTrades(): StoredRejectedTradeRecord[] {
  return readFileSafe<StoredRejectedTradeRecord>(FILES.REJECTED_TRADES);
}

// Update rejected trade price outcomes when market ticks
export function updateRejectedTradesWithLivePrice(symbol: string, currentPrice: number): void {
  const list = readFileSafe<StoredRejectedTradeRecord>(FILES.REJECTED_TRADES);
  let updated = false;

  for (const item of list) {
    if (item.symbol === symbol && item.simulatedOutcomeStatus === 'TRACKING') {
      item.currentPrice = currentPrice;
      const isLong = item.direction === 'BUY';
      const entry = item.evaluatedPrice;

      const pnlDiff = isLong ? currentPrice - entry : entry - currentPrice;
      item.hypotheticalPnL = +(pnlDiff * 50).toFixed(2);
      item.hypotheticalPnLPct = +((pnlDiff / entry) * 100).toFixed(2);

      if (isLong && currentPrice >= item.simulatedTargetPrice) {
        item.simulatedOutcomeStatus = 'WOULD_HAVE_WON';
        updated = true;
      } else if (!isLong && currentPrice <= item.simulatedTargetPrice) {
        item.simulatedOutcomeStatus = 'WOULD_HAVE_WON';
        updated = true;
      } else if (isLong && currentPrice <= item.simulatedStopLossPrice) {
        item.simulatedOutcomeStatus = 'WOULD_HAVE_LOST';
        updated = true;
      } else if (!isLong && currentPrice >= item.simulatedStopLossPrice) {
        item.simulatedOutcomeStatus = 'WOULD_HAVE_LOST';
        updated = true;
      }
    }
  }

  if (updated) {
    writeFileSafe(FILES.REJECTED_TRADES, list);
  }
}

// ----------------------------------------------------------------------------
// PRICE FEED ERRORS
// ----------------------------------------------------------------------------
export function recordPriceFeedErrorToFile(error: Omit<StoredPriceFeedErrorRecord, 'id' | 'createdAtMs'>): StoredPriceFeedErrorRecord {
  const list = readFileSafe<StoredPriceFeedErrorRecord>(FILES.PRICE_FEED_ERRORS);
  const newRecord: StoredPriceFeedErrorRecord = {
    id: `err-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAtMs: Date.now(),
    ...error
  };
  list.unshift(newRecord);
  writeFileSafe(FILES.PRICE_FEED_ERRORS, list);
  return newRecord;
}

export function getStoredPriceFeedErrors(): StoredPriceFeedErrorRecord[] {
  return readFileSafe<StoredPriceFeedErrorRecord>(FILES.PRICE_FEED_ERRORS);
}

// ----------------------------------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------------------------------
export function recordAuditLogToFile(log: Omit<StoredAuditLogRecord, 'id' | 'createdAtMs'>): StoredAuditLogRecord {
  const list = readFileSafe<StoredAuditLogRecord>(FILES.AUDIT_LOGS);
  const newRecord: StoredAuditLogRecord = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAtMs: Date.now(),
    ...log
  };
  list.unshift(newRecord);
  writeFileSafe(FILES.AUDIT_LOGS, list);
  return newRecord;
}

export function getStoredAuditLogs(): StoredAuditLogRecord[] {
  return readFileSafe<StoredAuditLogRecord>(FILES.AUDIT_LOGS);
}

// ----------------------------------------------------------------------------
// FILE EXPORT & SUMMARY
// ----------------------------------------------------------------------------
export function getDataFilesSummary(): {
  files: {
    key: string;
    fileName: string;
    recordCount: number;
    sizeBytes: number;
    lastModified: string;
  }[];
  totalRecords: number;
} {
  ensureDataDir();
  const summary: {
    key: string;
    fileName: string;
    recordCount: number;
    sizeBytes: number;
    lastModified: string;
  }[] = [];

  let totalRecords = 0;

  Object.entries(FILES).forEach(([key, filePath]) => {
    let count = 0;
    let size = 0;
    let mtime = new Date().toISOString();

    if (fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        size = stat.size;
        mtime = stat.mtime.toISOString();
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          count = parsed.length;
          totalRecords += count;
        }
      } catch (err) {
        // ignore parse error
      }
    }

    summary.push({
      key,
      fileName: path.basename(filePath),
      recordCount: count,
      sizeBytes: size,
      lastModified: mtime
    });
  });

  return { files: summary, totalRecords };
}

export function getFileContentRaw(fileKey: string): string | null {
  const normalizedKey = fileKey.toUpperCase();
  const filePath = (FILES as any)[normalizedKey];
  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
}

// ----------------------------------------------------------------------------
// AI MODEL CONSULTATION & MARKDOWN EXPORT GENERATOR
// ----------------------------------------------------------------------------
export function generateAiMarkdownReport(): string {
  const orders = getStoredOrders('ALL');
  const journal = getStoredJournal('ALL');
  const rejected = getStoredRejectedTrades();
  const errors = getStoredPriceFeedErrors();
  const auditLogs = getStoredAuditLogs();

  const timestamp = new Date().toISOString();

  let md = `# 📊 GoldenGate Trading Terminal — System Execution & Quant Audit Report
> Generated on: ${timestamp}
> Purpose: Quant Analysis & AI Model Consultation (Prompting Gemini, Claude, GPT-4, DeepSeek)

---

## 1. Executive Performance Summary
| Metric | Real Live Trading | Shadow Sandbox (Paper) | Combined Total |
| :--- | :--- | :--- | :--- |
| **Total Trades Closed** | ${journal.liveStats.totalTrades} | ${journal.shadowStats.totalTrades} | ${journal.entries.length} |
| **Winning Trades** | ${journal.liveStats.wins} | ${journal.shadowStats.wins} | ${journal.liveStats.wins + journal.shadowStats.wins} |
| **Losing Trades** | ${journal.liveStats.losses} | ${journal.shadowStats.losses} | ${journal.liveStats.losses + journal.shadowStats.losses} |
| **Win Rate** | **${journal.liveStats.winRatePct}%** | **${journal.shadowStats.winRatePct}%** | **${journal.entries.length > 0 ? ((journal.entries.filter(e => e.result === 'WIN').length / journal.entries.length) * 100).toFixed(1) : 0}%** |
| **Realized P&L** | **₹${journal.liveStats.totalPnL.toFixed(2)}** | **₹${journal.shadowStats.totalPnL.toFixed(2)}** | **₹${(journal.liveStats.totalPnL + journal.shadowStats.totalPnL).toFixed(2)}** |

---

## 2. Order Execution Log (${orders.allOrders.length} Total Orders)
| Time | Mode | Symbol | Side | Qty | Entry Px | Exit Px | Status | Realized P&L | Latency | Exit Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  if (orders.allOrders.length === 0) {
    md += `*No orders recorded yet.*\n\n`;
  } else {
    orders.allOrders.slice(0, 50).forEach(o => {
      md += `| ${o.timestamp} | \`${o.tradingMode}\` | **${o.symbol}** | ${o.direction} | ${o.quantity} | ₹${o.entryPrice.toFixed(2)} | ${o.exitPrice ? `₹${o.exitPrice.toFixed(2)}` : '-'} | ${o.status} | ${o.realizedPnL !== undefined ? `₹${o.realizedPnL.toFixed(2)} (${o.realizedPnLPct}%)` : '-'} | ${o.latencyMs ? `${o.latencyMs}ms` : '-'} | ${o.exitReason || '-'} |\n`;
    });
    md += `\n`;
  }

  md += `---

## 3. Trade Journal & Learning Memory (${journal.entries.length} Closed Trades)
`;

  if (journal.entries.length === 0) {
    md += `*No closed journal entries recorded yet.*\n\n`;
  } else {
    journal.entries.slice(0, 30).forEach(j => {
      md += `### • ${j.symbol} (${j.tradingMode}) — ${j.result === 'WIN' ? '✅ WIN' : '❌ LOSS'}
- **P&L:** ₹${j.realizedPnL.toFixed(2)} (${j.realizedPnLPct > 0 ? '+' : ''}${j.realizedPnLPct.toFixed(2)}%)
- **Entry Price:** ₹${j.entryPrice.toFixed(2)} | **Exit Price:** ₹${j.exitPrice.toFixed(2)} | **Holding Duration:** ${j.holdingTimeMins} mins
- **Exit Trigger:** ${j.exitReason}
- **Quant Win Probability at Entry:** ${j.winProbabilityPctAtEntry}%
- **AI Lesson Learned:** *${j.lessonLearned}*

`;
    });
  }

  md += `---

## 4. Rejection Gate Audit (${rejected.length} Filtered Setups)
*The Golden Funnel algorithm filters out high-risk trades before capital allocation.*
| Time | Symbol | Rejection Reason | Rejection Category | Score | Delta | RVOL | Would Have Won/Lost |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  if (rejected.length === 0) {
    md += `*No rejected trades logged.*\n\n`;
  } else {
    rejected.slice(0, 30).forEach(r => {
      md += `| ${r.timestamp} | **${r.symbol}** | ${r.rejectionReason} | \`${r.rejectionCategory}\` | ${r.score}/100 | ${r.delta ?? '-'} | ${r.rvol}x | \`${r.simulatedOutcomeStatus}\` |\n`;
    });
    md += `\n`;
  }

  md += `---

## 5. System Health & Price Feed Telemetry (${errors.length} Feed Anomalies, ${auditLogs.length} Audits)
`;

  if (errors.length === 0) {
    md += `- ✅ Price feed health: **Optimal (0 anomalies)**\n\n`;
  } else {
    errors.slice(0, 10).forEach(e => {
      md += `- ⚠️ **[${e.timestamp}]** Source: \`${e.source}\` | Error: ${e.errorMessage} | Action: *${e.recoveryAction}*\n`;
    });
    md += `\n`;
  }

  md += `---
*End of GoldenGate Trading Terminal AI Consultation Report.*
`;

  return md;
}

export function saveAiMarkdownReportToDisk(): { filePath: string; sizeBytes: number } {
  ensureDataDir();
  const mdContent = generateAiMarkdownReport();
  const mdPath = path.join(DATA_DIR, 'TRADE_JOURNAL_AI_AUDIT.md');
  const txtPath = path.join(DATA_DIR, 'ENGINE_TELEMETRY.txt');

  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  fs.writeFileSync(txtPath, mdContent, 'utf-8');

  return {
    filePath: mdPath,
    sizeBytes: Buffer.byteLength(mdContent, 'utf-8')
  };
}
