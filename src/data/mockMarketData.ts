import { ExecutionLogItem, OrderBookDepth, AlphaModelSignal, PerformanceStats, TickDataPoint, TradingStrategy, ZerodhaApiCredentials } from '../types';

export const INITIAL_SYMBOLS = [
  'BANKNIFTY 48200 CE',
  'NIFTY 22100 PE',
  'FINNIFTY 21200 CE',
  'RELIANCE',
  'HDFCBANK',
  'INFOSYS'
];

export const INITIAL_ORDER_BOOK: Record<string, OrderBookDepth> = {};

export const INITIAL_LOGS: ExecutionLogItem[] = [];

export const INITIAL_SIGNALS: AlphaModelSignal[] = [];

export const INITIAL_PERFORMANCE: PerformanceStats = {
  netPnL: 0,
  todayPnLPct: 0,
  totalOrders: 0,
  filledOrders: 0,
  winRate: 0,
  avgLatencyMs: 0,
  avgSlippagePct: 0,
  sharpeRatio: 0,
  maxDrawdownPct: 0
};

export const INITIAL_TICK_DATA: TickDataPoint[] = [];

export const DEFAULT_ZERODHA_CREDS: ZerodhaApiCredentials = {
  apiKey: '',
  apiSecret: '',
  requestToken: '',
  accessToken: '',
  isConnected: false,
  userLoginId: '',
  brokerageAccount: '',
  simulatedPingMs: 0
};

export const INITIAL_STRATEGIES: TradingStrategy[] = [];

