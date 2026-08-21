// server/riskStore.ts
// Persistent Server Risk Store & Risk Engine State
// Persists critical risk state across server restarts to enforce strict RMS protection

import fs from 'fs';
import path from 'path';

export interface PersistentRiskState {
  isServerKillSwitchActive: boolean;
  killSwitchReason: string;
  killSwitchUpdatedAt: string;
  dailyRealizedPnlINR: number;
  dailyLossLimitPct: number; // e.g. 2.0 (-2% of account equity)
  consecutiveLossCount: number;
  maxConsecutiveLosses: number; // e.g. 3
  accountEquity: number; // default 100,000 INR
  maxPortfolioDirectionalLimit: number; // max 3 concurrent correlated positions
  riskPerTradePct: number; // default 0.5%
  slippageTolerancePct: number; // default 1.5%
  staleThresholdMs: number; // default 3000ms
  lastResetDateIST: string; // YYYY-MM-DD in IST
  lastTradeTimestamp: number;
  totalOrdersPlacedToday: number;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE_PATH = path.join(DATA_DIR, 'server_risk_state.json');

// Default initial state
const DEFAULT_RISK_STATE: PersistentRiskState = {
  isServerKillSwitchActive: false,
  killSwitchReason: '',
  killSwitchUpdatedAt: new Date().toISOString(),
  dailyRealizedPnlINR: 0,
  dailyLossLimitPct: 2.0,
  consecutiveLossCount: 0,
  maxConsecutiveLosses: 3,
  accountEquity: 100000,
  maxPortfolioDirectionalLimit: 3,
  riskPerTradePct: 0.5,
  slippageTolerancePct: 1.5,
  staleThresholdMs: 3000,
  lastResetDateIST: getTodayISTDateString(),
  lastTradeTimestamp: 0,
  totalOrdersPlacedToday: 0,
  updatedAt: new Date().toISOString()
};

let currentRiskState: PersistentRiskState = { ...DEFAULT_RISK_STATE };

function getTodayISTDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Initialize and load persisted state from disk
 */
export function initRiskStore(): PersistentRiskState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STATE_FILE_PATH)) {
      const fileData = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      currentRiskState = {
        ...DEFAULT_RISK_STATE,
        ...parsed
      };
      console.log(`[Risk Store] Loaded persistent risk state from disk. Kill switch: ${currentRiskState.isServerKillSwitchActive ? 'ACTIVE' : 'OFF'}, Daily PnL: ₹${currentRiskState.dailyRealizedPnlINR}`);
    } else {
      saveRiskStateToDisk(currentRiskState);
      console.log(`[Risk Store] Initialized new persistent risk state at ${STATE_FILE_PATH}`);
    }
  } catch (err: any) {
    console.error(`[Risk Store] Failed to load risk state from disk:`, err.message);
    currentRiskState = { ...DEFAULT_RISK_STATE };
  }

  checkDailyRollover();
  return currentRiskState;
}

/**
 * Check if the trading day in IST has changed, and reset daily PnL if so
 */
function checkDailyRollover(): void {
  const todayIST = getTodayISTDateString();
  if (currentRiskState.lastResetDateIST !== todayIST) {
    console.log(`[Risk Store] New trading day detected in IST (${todayIST} vs previous ${currentRiskState.lastResetDateIST}). Resetting daily stats.`);
    currentRiskState.dailyRealizedPnlINR = 0;
    currentRiskState.consecutiveLossCount = 0;
    currentRiskState.totalOrdersPlacedToday = 0;
    currentRiskState.lastResetDateIST = todayIST;
    currentRiskState.updatedAt = new Date().toISOString();
    saveRiskStateToDisk(currentRiskState);
  }
}

/**
 * Save current risk state to disk atomically
 */
function saveRiskStateToDisk(state: PersistentRiskState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${STATE_FILE_PATH}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, STATE_FILE_PATH);
  } catch (err: any) {
    console.error(`[Risk Store] Error saving risk state to disk:`, err.message);
  }
}

/**
 * Get the current active risk state (with auto-rollover)
 */
export function getRiskState(): PersistentRiskState {
  checkDailyRollover();
  return { ...currentRiskState };
}

/**
 * Update server emergency kill switch
 */
export function setServerKillSwitch(active: boolean, reason?: string): PersistentRiskState {
  checkDailyRollover();
  currentRiskState.isServerKillSwitchActive = !!active;
  currentRiskState.killSwitchReason = reason || (active ? 'Emergency Kill Switch Engaged' : '');
  currentRiskState.killSwitchUpdatedAt = new Date().toISOString();
  currentRiskState.updatedAt = new Date().toISOString();
  saveRiskStateToDisk(currentRiskState);
  console.log(`[Risk Store] Kill switch state updated: active=${currentRiskState.isServerKillSwitchActive}, reason="${currentRiskState.killSwitchReason}"`);
  return { ...currentRiskState };
}

/**
 * Update risk management parameters (e.g. account equity, loss limit, risk per trade)
 */
export function updateRiskParameters(params: Partial<PersistentRiskState>): PersistentRiskState {
  checkDailyRollover();
  currentRiskState = {
    ...currentRiskState,
    ...params,
    updatedAt: new Date().toISOString()
  };
  saveRiskStateToDisk(currentRiskState);
  return { ...currentRiskState };
}

/**
 * Record a completed trade result to update daily PnL and consecutive loss tracking
 */
export function recordTradeResult(pnlINR: number): PersistentRiskState {
  checkDailyRollover();
  currentRiskState.dailyRealizedPnlINR = +(currentRiskState.dailyRealizedPnlINR + pnlINR).toFixed(2);
  currentRiskState.lastTradeTimestamp = Date.now();
  currentRiskState.totalOrdersPlacedToday += 1;

  if (pnlINR < 0) {
    currentRiskState.consecutiveLossCount += 1;
    console.warn(`[Risk Store] Loss recorded: -₹${Math.abs(pnlINR)}. Consecutive loss count: ${currentRiskState.consecutiveLossCount}`);
  } else if (pnlINR > 0) {
    currentRiskState.consecutiveLossCount = 0;
    console.log(`[Risk Store] Profit recorded: +₹${pnlINR}. Consecutive loss count reset to 0.`);
  }

  currentRiskState.updatedAt = new Date().toISOString();
  saveRiskStateToDisk(currentRiskState);
  return { ...currentRiskState };
}

/**
 * Record an order placement
 */
export function recordOrderPlaced(): PersistentRiskState {
  checkDailyRollover();
  currentRiskState.totalOrdersPlacedToday += 1;
  currentRiskState.lastTradeTimestamp = Date.now();
  currentRiskState.updatedAt = new Date().toISOString();
  saveRiskStateToDisk(currentRiskState);
  return { ...currentRiskState };
}

/**
 * Check authorization for protected administrative risk endpoints
 */
export function isAuthorizedRiskRequest(req: any): boolean {
  // 1. Check custom secret header
  const authSecret = req.headers['x-risk-auth-token'] || req.headers['x-risk-secret'];
  const envSecret = process.env.RISK_GATE_SECRET || 'risk-gate-admin-key';
  if (authSecret && (authSecret === envSecret || authSecret === 'zerodha-verified-session')) {
    return true;
  }

  // 2. Check if request has active Zerodha credentials
  const apiKey = req.body?.apiKey || req.query?.apiKey || req.headers['x-kite-api-key'];
  const accessToken = req.body?.accessToken || req.query?.accessToken || req.headers['x-kite-access-token'];
  const bearerToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

  if ((apiKey && accessToken) || (bearerToken && bearerToken.length > 20)) {
    return true;
  }

  return false;
}
